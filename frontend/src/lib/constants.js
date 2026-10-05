const runtimeApiBase = typeof window !== "undefined" ? window.__TOKENMETER_CONFIG__?.apiBase : undefined;
export const API_BASE = (runtimeApiBase || import.meta.env.VITE_API_BASE || "http://localhost:8090").replace(/\/+$/, "");
