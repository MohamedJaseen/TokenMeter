package service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private final String secret;
    private final long accessTtlSeconds;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-ttl-seconds:900}") long accessTtlSeconds) {

        if (secret == null
                || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret must be at least 32 bytes");
        }

        this.secret = secret;
        this.accessTtlSeconds = accessTtlSeconds;
    }

    public String createAccessToken(String subject, String tenantId, List<String> roles) {

        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(accessTtlSeconds);

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(subject)
                .issuer("metering-platform")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .claim("tenant_id", tenantId)
                .claim("roles", roles)
                .build();

        return sign(claims);
    }

    public boolean isValid(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            return jwt.verify(new MACVerifier(secretKey()))
                    && jwt.getJWTClaimsSet().getExpirationTime()
                    .after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    public String getSubject(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            return jwt.getJWTClaimsSet().getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    public String getTenantId(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            return jwt.getJWTClaimsSet().getStringClaim("tenant_id");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            Object roles = jwt.getJWTClaimsSet().getClaim("roles");
            if (roles instanceof List<?> list) {
                return list.stream().map(String::valueOf).toList();
            }
        } catch (Exception e) {
            // fall through
        }
        return List.of("TENANT_USER");
    }

    public String generateRefreshToken() {
        return java.util.UUID.randomUUID().toString().replace("-", "")
                + java.util.UUID.randomUUID().toString().replace("-", "");
    }

    private String sign(JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader(JWSAlgorithm.HS256),
                    claims);
            jwt.sign(new MACSigner(secretKey()));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign JWT", e);
        }
    }

    private javax.crypto.SecretKey secretKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        byte[] normalized = new byte[32];
        System.arraycopy(keyBytes, 0, normalized, 0, Math.min(keyBytes.length, 32));
        return new javax.crypto.spec.SecretKeySpec(normalized, "HmacSHA256");
    }
}