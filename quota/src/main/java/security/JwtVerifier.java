package security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
public class JwtVerifier {

    private final byte[] key;
    private final ObjectMapper objectMapper;

    public JwtVerifier(
            @Value("${app.jwt.secret:}") String secret,
            ObjectMapper objectMapper) {

        byte[] keyBytes =
                secret.getBytes(StandardCharsets.UTF_8);

        byte[] normalized = new byte[32];
        System.arraycopy(
                keyBytes,
                0,
                normalized,
                0,
                Math.min(keyBytes.length, 32));

        this.key = normalized;
        this.objectMapper = objectMapper;
    }

    public Claims verify(String token) {

        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new SecurityException("malformed token");
        }

        try {
            String signingInput = parts[0] + "." + parts[1];

            byte[] expected =
                    hmac(signingInput.getBytes(StandardCharsets.UTF_8));

            byte[] actual =
                    Base64.getUrlDecoder().decode(parts[2]);

            if (!MessageDigest.isEqual(expected, actual)) {
                throw new SecurityException("signature mismatch");
            }

            byte[] payloadBytes =
                    Base64.getUrlDecoder().decode(parts[1]);

            Map<String, Object> claims =
                    objectMapper.readValue(
                            payloadBytes,
                            new TypeReference<Map<String, Object>>() {
                            });

            Number exp = (Number) claims.get("exp");
            if (exp == null
                    || (exp.longValue() * 1000L) < System.currentTimeMillis()) {
                throw new SecurityException("token expired");
            }

            return Claims.of(claims);

        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            throw new SecurityException("invalid token", e);
        }
    }

    private byte[] hmac(byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    public record Claims(
            String subject,
            String tenantId,
            List<String> roles
    ) {

        private static Claims of(Map<String, Object> claims) {

            List<String> roles = new ArrayList<>();

            Object rawRoles = claims.get("roles");
            if (rawRoles instanceof List<?> list) {
                for (Object role : list) {
                    roles.add(String.valueOf(role));
                }
            }

            return new Claims(
                    String.valueOf(claims.get("sub")),
                    claims.get("tenant_id") == null
                            ? null
                            : String.valueOf(claims.get("tenant_id")),
                    roles);
        }
    }
}