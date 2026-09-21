import axios from "axios";
import { API_BASE } from "../lib/constants";
import { tokenStorage } from "../auth/tokenStorage";

let currentAccessToken = null;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

export const setClientToken = (token) => {
    currentAccessToken = token;
};

const apiClient = axios.create({
    baseURL: API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use(
    (config) => {
        if (currentAccessToken) {
            config.headers["Authorization"] = `Bearer ${currentAccessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 403) {
            window.location.href = "/403";
            return Promise.reject({ status: 403, message: "Forbidden", fieldErrors: {} });
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url.includes("/auth/login") || originalRequest.url.includes("/auth/refresh")) {
                return Promise.reject(normalizeError(error));
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers["Authorization"] = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = tokenStorage.getRefreshToken();
            if (!refreshToken) {
                isRefreshing = false;
                tokenStorage.clearRefreshToken();
                window.location.href = "/login";
                return Promise.reject(normalizeError(error));
            }

            try {
                const response = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
                const { accessToken } = response.data;
                setClientToken(accessToken);
                isRefreshing = false;
                processQueue(null, accessToken);
                originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                processQueue(refreshError, null);
                tokenStorage.clearRefreshToken();
                window.location.href = "/login";
                return Promise.reject(normalizeError(refreshError));
            }
        }

        return Promise.reject(normalizeError(error));
    }
);

function normalizeError(error) {
    if (error.response) {
        return {
            status: error.response.status,
            message: error.response.data?.message || error.response.data?.error || "An unexpected error occurred",
            fieldErrors: error.response.data?.fieldErrors || {},
        };
    }
    if (error.request) {
        return {
            status: 0,
            message: "Network error. Please check your connection.",
            fieldErrors: {},
        };
    }
    return {
        status: -1,
        message: error.message || "Unknown error",
        fieldErrors: {},
    };
}

export default apiClient;
