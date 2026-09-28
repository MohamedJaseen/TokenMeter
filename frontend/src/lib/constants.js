const runtimeApiBase = window.__TOKENMETER_CONFIG__?.apiBase;
export const API_BASE = (runtimeApiBase || import.meta.env.VITE_API_BASE || "http://localhost:8090").replace(/\/+$/, "");
