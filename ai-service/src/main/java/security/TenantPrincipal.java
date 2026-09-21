package security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;

public record TenantPrincipal(
        String tenantId,
        Collection<? extends GrantedAuthority> authorities
) {
    public static TenantPrincipal of(String tenantId) {
        return new TenantPrincipal(tenantId, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }
}
