import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../lib/constants";
import { tokenStorage } from "../auth/tokenStorage";

export function useUsageStream(tenantId, accessToken) {
    const [events, setEvents] = useState([]);
    const [status, setStatus] = useState("connecting"); // connecting, live, reconnecting
    const [lastEventAt, setLastEventAt] = useState(null);
    const [error, setError] = useState(null);

    const bufferRef = useRef([]);
    const abortControllerRef = useRef(null);
    const retryCountRef = useRef(0);

    useEffect(() => {
        if (!tenantId) return;

        let isSubscribed = true;
        abortControllerRef.current = new AbortController();

        // Flush buffer every 500ms
        const flushInterval = setInterval(() => {
            if (bufferRef.current.length > 0 && isSubscribed) {
                const chunk = [...bufferRef.current];
                bufferRef.current = [];
                setEvents((prev) => [...chunk, ...prev].slice(0, 200)); // cap at 200
            }
        }, 500);

        async function connect() {
            setStatus("connecting");
            setError(null);

            // Get current access token if any
            // Since EventSource doesn't support headers, use fetch with ReadableStream
            try {
                // In memory token can be retrieved via api client or localStorage fallback for refresh
                const headers = {
                    Accept: "text/event-stream",
                };
                if (accessToken) {
                    headers["Authorization"] = `Bearer ${accessToken}`;
                }
                const response = await fetch(`${API_BASE}/api/v1/tenants/${tenantId}/usage/realtime`, {
                    headers,
                    signal: abortControllerRef.current.signal,
                });

                if (!response.ok) {
                    throw new Error(`SSE Connection failed with status ${response.status}`);
                }

                setStatus("live");
                retryCountRef.current = 0;

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (isSubscribed) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop(); // keep incomplete line in buffer

                    for (const line of lines) {
                        if (line.startsWith("data:")) {
                            try {
                                const jsonStr = line.replace("data:", "").trim();
                                const parsed = JSON.parse(jsonStr);
                                bufferRef.current.push(parsed);
                                setLastEventAt(new Date());
                            } catch (e) {
                                // malformed frame ignore
                            }
                        }
                    }
                }
            } catch (err) {
                if (err.name === "AbortError") return;

                setStatus("reconnecting");
                setError(err.message);

                // Exponential backoff with jitter (1s, 2s, 4s... capped at 30s)
                const delay = Math.min(30000, Math.pow(2, retryCountRef.current) * 1000) + Math.random() * 500;
                retryCountRef.current += 1;

                if (isSubscribed) {
                    setTimeout(connect, delay);
                }
            }
        }

        connect();

        return () => {
            isSubscribed = false;
            clearInterval(flushInterval);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [tenantId, accessToken]);

    return { events, status, lastEventAt, error };
}
