import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { toastInfo } from "@/src/components/ui/toast";

import { useAuthStore } from "@/src/store/authStore";
import { useNotificationStore } from "@/src/store/notificationStore";
import { classifyNotification, type AppNotification } from "@/src/lib/notifications";
import { getSharedConnection, getStartingPromise, setStartingPromise } from "@/src/lib/signalr/connection";

/**
 * Plays a short notification chime using the Web Audio API.
 * No external MP3 file required — generates two quick sine-wave
 * tones that sound like a soft "ding-dong" bell.
 *
 * Falls back silently if the AudioContext is unavailable or
 * autoplay is blocked by the browser.
 */
function playChime() {
    try {
        const ctx = new AudioContext();

        // First tone (higher pitch)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.value = 880; // A5
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.15);

        // Second tone (lower pitch, slight delay)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.value = 660; // E5
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.35);

        // Clean up after both tones finish
        setTimeout(() => ctx.close(), 400);
    } catch {
        // AudioContext unavailable — silently ignore
    }
}

/**
 * Manages the shared WebSocket lifecycle to the NotificationHub.
 *
 * Uses the singleton connection from `getSharedConnection(token)` so
 * notifications, presence, approvals, and entity-watch all ride ONE
 * WebSocket instead of each feature creating its own.
 *
 * - Connects on mount when a valid access token exists.
 * - Reconnects automatically with exponential back-off.
 * - Pushes incoming events into the Zustand notification store
 *   (instant bell update) and fires a toast.
 * - Plays a short chime and blinks the document title when the
 *   tab is in the background.
 * - Tears down the connection on unmount or token change.
 *
 * Returns the current HubConnection instance (or null before
 * connect) so other hooks (e.g. useApprovalRealtime) can
 * register their own event listeners on the same connection.
 *
 * Also exposes `isConnected` so consumers (e.g. useNotifications)
 * can gate polling on connection state — poll only as fallback
 * when the WebSocket is down.
 */
export function useSignalR() {
    const token = useAuthStore((state) => state.accessToken);
    const addNotification = useNotificationStore((state) => state.addNotification);
    const [isConnected, setIsConnected] = useState(false);
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

    useEffect(() => {
        if (!token) {
            setConnection(null);
            setIsConnected(false);
            return;
        }

        let disposed = false;
        const conn = getSharedConnection(token);

        // Track connection state so consumers can gate polling
        conn.onclose(() => { if (!disposed) setIsConnected(false); });
        conn.onreconnecting(() => { if (!disposed) setIsConnected(false); });
        conn.onreconnected(() => { if (!disposed) setIsConnected(true); });

        conn.on("ReceiveNotification", (payload: {
            title: string;
            description: string;
            link?: string;
            timestamp: string;
        }) => {
            const appNotification: AppNotification = {
                id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                type: classifyNotification(payload.title),
                title: payload.title,
                description: payload.description,
                createdAt: payload.timestamp,
                read: false,
                link: payload.link ?? undefined,
            };

            // 1. Update Zustand store (instant bell badge increment)
            addNotification(appNotification);

            // 2. Fire toast
            toastInfo(payload.title, {
                description: payload.description,
            });

            // 3. Audio + title blink for background tabs
            playChime();

            if (document.hidden) {
                const originalTitle = document.title;
                document.title = `\u{1F514} ${payload.title}`;

                const interval = setInterval(() => {
                    document.title =
                        document.title === originalTitle
                            ? `\u{1F514} ${payload.title}`
                            : originalTitle;
                }, 1000);

                const handleFocus = () => {
                    clearInterval(interval);
                    document.title = originalTitle;
                    window.removeEventListener("focus", handleFocus);
                };

                window.addEventListener("focus", handleFocus);
            }
        });

        // Start the connection if it's not already running.
        // Use the shared startingPromise to avoid concurrent start() calls
        // (e.g. React StrictMode double-mount).
        if (conn.state === signalR.HubConnectionState.Disconnected) {
            const existingStart = getStartingPromise();
            if (existingStart) {
                // Another caller already started — just await it.
                existingStart.then(() => {
                    if (!disposed) {
                        setIsConnected(true);
                        setConnection(conn);
                    }
                }).catch(() => { /* logged by original caller */ });
            } else {
                const startPromise = conn.start().then(() => {
                    if (disposed) return;
                    setIsConnected(true);
                    setConnection(conn);
                }).catch((err) => {
                    if (!disposed) {
                        console.error("SignalR Connection Error:", err);
                    }
                }).finally(() => {
                    setStartingPromise(null);
                });
                setStartingPromise(startPromise);
            }
        } else if (conn.state === signalR.HubConnectionState.Connected) {
            setIsConnected(true);
            setConnection(conn);
        }

        return () => {
            disposed = true;
            setIsConnected(false);
            // Don't stop the shared connection — other hooks depend on it.
            // The connection is stopped on logout via dropSharedConnection().
        };
    }, [token, addNotification]);

    return { connection, isConnected };
}
