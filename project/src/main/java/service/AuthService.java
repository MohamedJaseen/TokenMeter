package service;

import dto.LoginRequest;
import dto.RefreshRequest;
import dto.RegisterRequest;
import dto.RegisterResponse;
import dto.TokenResponse;
import exception.AuthException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import persistence.entity.AppUser;
import persistence.entity.RefreshToken;
import persistence.entity.Tenant;
import persistence.repository.AppUserRepository;
import persistence.repository.RefreshTokenRepository;
import persistence.repository.TenantRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
public class AuthService {

    private static final Logger log =
            LoggerFactory.getLogger(AuthService.class);

    private static final Duration REFRESH_TTL = Duration.ofDays(30);

    private final AppUserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ApiKeyManagementService apiKeyManagementService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JdbcTemplate jdbcTemplate;

    public AuthService(
            AppUserRepository userRepository,
            TenantRepository tenantRepository,
            RefreshTokenRepository refreshTokenRepository,
            ApiKeyManagementService apiKeyManagementService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            JdbcTemplate jdbcTemplate) {

        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.apiKeyManagementService = apiKeyManagementService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {

        String tenantId = normalizeTenantId(
                request.tenantId() == null || request.tenantId().isBlank()
                        ? slugify(request.tenantName())
                        : request.tenantId());

        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw AuthException.conflict("Username already exists");
        }

        if (tenantRepository.findById(tenantId).isPresent()) {
            throw AuthException.conflict("Tenant already exists");
        }

        Tenant tenant = new Tenant();
        tenant.setTenantId(tenantId);
        tenant.setTenantName(request.tenantName());
        tenant.setContactEmail(request.email());
        tenant.setStatus("ACTIVE");
        tenant.setCreatedAt(Instant.now());
        tenantRepository.save(tenant);

        AppUser admin = new AppUser();
        admin.setTenantId(tenantId);
        admin.setUsername(request.username());
        admin.setPasswordHash(passwordEncoder.encode(request.password()));
        admin.setEmail(request.email());
        admin.setRole("TENANT_ADMIN");
        admin.setEnabled(true);
        admin.setCreatedAt(Instant.now());
        userRepository.save(admin);

        ensureDefaultQuotaConfig(tenantId);

        var keyResponse = apiKeyManagementService.create(
                tenantId,
                "Default tenant key");

        log.info("Registered new tenant {} with admin {}",
                tenantId, request.username());

        return new RegisterResponse(
                tenantId,
                request.username(),
                keyResponse.secret());
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {

        AppUser user = userRepository.findByUsername(request.username())
                .orElseThrow(() ->
                        AuthException.unauthorized("Invalid username or password"));

        if (!user.isEnabled()) {
            throw AuthException.unauthorized("Account is disabled");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw AuthException.unauthorized("Invalid username or password");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return issueTokens(user);
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest request) {

        String tokenHash = hash(request.refreshToken());

        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() ->
                        AuthException.unauthorized("Invalid refresh token"));

        if (stored.isRevoked()
                || stored.getExpiresAt().isBefore(Instant.now())) {

            throw AuthException.unauthorized(
                    "Refresh token expired or revoked");
        }

        AppUser user = userRepository.findById(stored.getUserId())
                .orElseThrow(() ->
                        AuthException.unauthorized("User not found"));

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(user);
    }

    private TokenResponse issueTokens(AppUser user) {

        String accessToken = jwtService.createAccessToken(
                user.getUsername(),
                user.getTenantId(),
                List.of(user.getRole()));

        String refreshToken = jwtService.generateRefreshToken();

        RefreshToken stored = new RefreshToken();
        stored.setUserId(user.getUserId());
        stored.setTokenHash(hash(refreshToken));
        stored.setExpiresAt(Instant.now().plus(REFRESH_TTL));
        stored.setRevoked(false);
        stored.setCreatedAt(Instant.now());
        refreshTokenRepository.save(stored);

        return new TokenResponse(accessToken, refreshToken, 900L);
    }

    public static String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Unable to hash value", e);
        }
    }

    private void ensureDefaultQuotaConfig(String tenantId) {

        jdbcTemplate.update(
                "INSERT INTO tenant_quota_configs " +
                        "(tenant_id, tier_name, monthly_unit_limit, " +
                        " hard_cap_enabled, alert_threshold_percent, unit_rate_dollars) " +
                        "VALUES (?, ?, ?, ?, ?, ?) " +
                        "ON CONFLICT (tenant_id) DO NOTHING",
                tenantId, "FREE_TIER", 10000L, true, 80, 0.005000);
    }

    private String normalizeTenantId(String raw) {
        return raw.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "-");
    }

    private String slugify(String name) {
        if (name == null) {
            return "tenant";
        }
        return name.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}