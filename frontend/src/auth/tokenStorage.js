// Token storage implementation.
// Tradeoff:
// - Access token is kept in memory (React state) to protect against XSS stealing short-lived JWTs.
// - Refresh token is persisted in localStorage to maintain user sessions across browser reloads.
// Note: In strict high-security environments, refresh tokens should reside in HttpOnly secure cookies set by the backend.

export const tokenStorage = {
    getRefreshToken: () => localStorage.getItem("refresh_token"),
    setRefreshToken: (token) => localStorage.setItem("refresh_token", token),
    clearRefreshToken: () => localStorage.removeItem("refresh_token"),
};
