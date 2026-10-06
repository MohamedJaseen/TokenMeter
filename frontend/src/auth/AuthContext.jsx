import React, { createContext, useState, useEffect, useCallback } from "react";
import { tokenStorage } from "./tokenStorage";
import apiClient, { setClientToken } from "../api/client";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [accessToken, setAccessToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Decode JWT helper
    const parseJwt = (token) => {
        try {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    const handleToken = useCallback((token) => {
        setAccessToken(token);
        setClientToken(token);
        if (token) {
            const claims = parseJwt(token);
            if (claims) {
                setUser({
                    sub: claims.sub,
                    tenantId: claims.tenant_id || "tenantA",
                    roles: claims.roles || ["TENANT_USER"],
                    exp: claims.exp,
                });
            }
        } else {
            setUser(null);
        }
    }, []);

    // Initial session load / refresh attempt
    useEffect(() => {
        async function initAuth() {
            const refreshToken = tokenStorage.getRefreshToken();
            if (refreshToken) {
                try {
                    const res = await apiClient.post("/auth/refresh", { refreshToken });
                    if (res.data?.accessToken) {
                        handleToken(res.data.accessToken);
                    }
                    if (res.data?.refreshToken) {
                        tokenStorage.setRefreshToken(res.data.refreshToken);
                    }
                } catch (err) {
                    tokenStorage.clearRefreshToken();
                }
            }
            setIsLoading(false);
        }
        initAuth();
    }, [handleToken]);

    const login = async (username, password) => {
        const res = await apiClient.post("/auth/login", { username, password });
        const { accessToken, refreshToken } = res.data ?? {};

        if (!accessToken) {
            throw new Error("Login response did not include an access token.");
        }

        handleToken(accessToken);
        if (refreshToken) {
            tokenStorage.setRefreshToken(refreshToken);
        } else {
            tokenStorage.clearRefreshToken();
        }

        return { accessToken, refreshToken };
    };

    const register = async (payload) => {
        const res = await apiClient.post("/auth/register", payload);
        return res.data;
    };

    const logout = () => {
        setAccessToken(null);
        setUser(null);
        setClientToken(null);
        tokenStorage.clearRefreshToken();
    };

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                user,
                isLoading,
                login,
                register,
                logout,
                setAccessToken: handleToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
