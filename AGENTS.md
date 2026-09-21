# Metering Platform — Operation Notes

## Stack layout (Docker Compose, 8 services)

| Service    | Container        | Port  | Dev URL                                  |
|------------|------------------|-------|------------------------------------------|
| postgres   | metering-postgres | 5432  | (internal)                                |
| redis      | metering-redis    | 6379  | (internal)                                |
| demo       | metering-demo     | 8080  | http://localhost:8080                     |
| project    | metering-project  | 8081  | http://localhost:8081                     |
| quota      | metering-quota    | 8082  | http://localhost:8082                     |
| ai-service | metering-ai       | 8083  | http://localhost:8083                     |
| gateway    | metering-gateway  | 8090  | http://localhost:8090                     |
| frontend   | metering-frontend | 8091  | http://localhost:8091                     |

Gateway (8090) routes: `/auth/**`, `/api/v1/admin/...`, `/api/v1/tenants/...` → project;
`/api/v1/quota/**`, `/api/v1/tenants/*/quota` → quota; `/api/v1/ai/**`; `/metering/**`; `/actuator/**`.

## Verified working (2026-09-19, all containers healthy)
- Six backend services all up+healthy: Postgres, Redis, demo, project, quota, ai-service, gateway, frontend.
- End-to-end through gateway (port 8090), all returned 200:
  - `POST /auth/login` → JWT access token
  - `GET /api/v1/admin/tenants` (JWT-authenticated)
  - `GET /actuator/health` → UP
- Direct project login (port 8081) also returns JWT.

## Known boot blockers (all resolved)
1. bcrypt missing from `module` (project/quota) → added `spring-security-crypto`.
2. `security` package not in `@ComponentScan` → added "security" to both apps.
3. `ObjectMapper` bean absent (Spring Boot 4 removed auto-config) → explicit `JacksonConfig` + bean in `SecurityConfig`.
4. Circular ctor reference (`SecurityConfig` ↔ `JwtAuthenticationFilter`) → moved `ObjectMapper` bean out of `SecurityConfig`.
5. quota SMALLINT→INTEGER migration typo fix + missing jackson dependency.
6. gateway `/auth` route logic.

## Reliable dev healthcheck commands
```powershell
docker compose ps                       # all Up/healthy
docker compose up -d --wait             # bring up + wait for healthy
docker logs metering-project            # boot errors
docker logs metering-quota
docker logs metering-ai
```

Notes to self for future SDK/API work — record correct tenant→key seeding and SDK→backend contract once integration tests are run.
