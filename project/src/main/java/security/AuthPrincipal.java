package security;

import java.util.List;

public record AuthPrincipal(
        String subject,
        String tenantId,
        List<String> roles) {

    public boolean isSuperAdmin() {
        return roles.contains("SUPER_ADMIN");
    }
}