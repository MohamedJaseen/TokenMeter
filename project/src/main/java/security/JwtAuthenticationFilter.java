package security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import service.JwtService;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            ObjectMapper objectMapper) {

        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
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

        String token = authorization.substring(7).trim();

        if (token.isEmpty() || !jwtService.isValid(token)) {
            sendError(
                    response,
                    HttpStatus.UNAUTHORIZED.value(),
                    "Invalid or expired access token");
            return;
        }

        AuthPrincipal principal = new AuthPrincipal(
                jwtService.getSubject(token),
                jwtService.getTenantId(token),
                jwtService.getRoles(token));

        String path = request.getRequestURI();
        String scopedTenant = extractTenantId(path);

        if (path.startsWith("/api/v1/admin")) {

            if (!principal.isSuperAdmin()) {
                sendError(
                        response,
                        HttpStatus.FORBIDDEN.value(),
                        "SUPER_ADMIN role required");
                return;
            }

        } else if (scopedTenant != null
                && !principal.isSuperAdmin()
                && !scopedTenant.equals(principal.tenantId())) {

            sendError(
                    response,
                    HttpStatus.FORBIDDEN.value(),
                    "Access denied for tenant: " + scopedTenant);
            return;
        }

        List<SimpleGrantedAuthority> authorities =
                principal.roles().stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .toList();

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        authorities);

        SecurityContextHolder.getContext()
                .setAuthentication(authentication);

        filterChain.doFilter(request, response);
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