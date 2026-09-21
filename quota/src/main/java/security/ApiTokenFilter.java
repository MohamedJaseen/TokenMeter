package security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@Order(1)
public class ApiTokenFilter extends OncePerRequestFilter {

    static final String INTERNAL_HEADER = "X-Internal-Token";

    private final JwtVerifier jwtVerifier;
    private final ObjectMapper objectMapper;
    private final String internalToken;

    public ApiTokenFilter(
            JwtVerifier jwtVerifier,
            ObjectMapper objectMapper,
            @Value("${app.internal-token:}") String internalToken) {

        this.jwtVerifier = jwtVerifier;
        this.objectMapper = objectMapper;
        this.internalToken = internalToken;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api")
                || path.equals("/error")
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // Internal service-to-service bypass.
        String suppliedToken = request.getHeader(INTERNAL_HEADER);
        if (isInternalTokenValid(suppliedToken)) {
            setInternalAuthentication();
            filterChain.doFilter(request, response);
            return;
        }

        String authorization =
                request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authorization == null
                || !authorization.startsWith("Bearer ")) {

            sendError(
                    response,
                    HttpStatus.UNAUTHORIZED.value(),
                    "Missing or invalid Authorization header");
            return;
        }

        JwtVerifier.Claims claims;
        try {
            claims = jwtVerifier.verify(authorization.substring(7).trim());
        } catch (SecurityException e) {
            sendError(
                    response,
                    HttpStatus.UNAUTHORIZED.value(),
                    "Invalid or expired access token");
            return;
        }

        String path = request.getRequestURI();

        // The customer-facing evaluate endpoint requires the internal token.
        if (path.startsWith("/api/v1/quota/evaluate")) {
            sendError(
                    response,
                    HttpStatus.FORBIDDEN.value(),
                    "Internal endpoint");
            return;
        }

        String scopedTenant = extractTenantId(path);
        boolean isSuperAdmin =
                claims.roles().contains("SUPER_ADMIN");

        if (scopedTenant != null
                && claims.tenantId() != null
                && !isSuperAdmin
                && !scopedTenant.equals(claims.tenantId())) {

            sendError(
                    response,
                    HttpStatus.FORBIDDEN.value(),
                    "Access denied for tenant: " + scopedTenant);
            return;
        }

        setAuthentication(claims);
        filterChain.doFilter(request, response);
    }

    private boolean isInternalTokenValid(String supplied) {

        if (supplied == null
                || internalToken == null
                || internalToken.isEmpty()) {
            return false;
        }

        byte[] expected = internalToken.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] actual = supplied.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return MessageDigest.isEqual(expected, actual);
    }

    private void setAuthentication(Object principal) {

        org.springframework.security.core.Authentication authentication =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of());

        org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .setAuthentication(authentication);
    }

    private void setInternalAuthentication() {

        setAuthentication(List.of("internal"));
    }

    static String extractTenantId(String path) {

        if (!path.startsWith("/api/v1/tenants/")) {
            return null;
        }

        String remainder = path.substring("/api/v1/tenants/".length());
        int slash = remainder.indexOf('/');
        String tenantId =
                slash == -1 ? remainder : remainder.substring(0, slash);

        return tenantId.isEmpty() ? null : tenantId;
    }

    private void sendError(
            HttpServletResponse response,
            int status,
            String message)
            throws IOException {

        if (response.isCommitted()) {
            return;
        }

        response.setStatus(status);
        response.setContentType("application/json");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("error", HttpStatus.valueOf(status).getReasonPhrase());
        body.put("message", message);
        body.put("timestamp", java.time.Instant.now().toString());

        objectMapper.writeValue(response.getWriter(), body);
    }
}