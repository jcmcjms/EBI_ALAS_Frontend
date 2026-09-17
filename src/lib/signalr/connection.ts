import * as signalR from "@microsoft/signalr";

const HUB_URL = `${import.meta.env.VITE_API_BASE_URL}/hubs/notifications`;

/**
 * Token-keyed singleton SignalR connection.
 *
 * Notifications, presence, approvals, and entity-watch all ride
 * this ONE WebSocket. Creating multiple HubConnection instances
 * per user wastes server resources and causes event routing bugs.
 *
 * The connection is rebuilt only when the JWT changes (login/logout).
 * All hooks that need the connection call `getSharedConnection(token)`.
 */
let connection: signalR.HubConnection | null = null;
let boundToken: string | null = null;
let startingPromise: Promise<void> | null = null;

export function getSharedConnection(token: string): signalR.HubConnection {
    if (connection && boundToken === token) return connection;

    // Tear down the old connection if the token changed.
    connection?.stop();
    startingPromise = null;

    connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
            accessTokenFactory: () => token,
            // Force WebSockets — bypasses the HTTP long-polling
            // fallback which is unnecessary for a banking LAN.
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .build();

    boundToken = token;
    return connection;
}

/**
 * Returns the in-flight start promise, or null if no start is in progress.
 * Callers can await this to avoid calling start() concurrently.
 */
export function getStartingPromise(): Promise<void> | null {
    return startingPromise;
}

/**
 * Sets the in-flight start promise. Call this from the hook before calling
 * conn.start(), and clear it when the promise settles.
 */
export function setStartingPromise(promise: Promise<void> | null): void {
    startingPromise = promise;
}

/**
 * Tears down the shared connection (call on logout).
 */
export function dropSharedConnection(): void {
    connection?.stop();
    startingPromise = null;
    connection = null;
    boundToken = null;
}
