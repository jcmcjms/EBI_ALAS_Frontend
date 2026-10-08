import * as signalR from '@microsoft/signalr'
import { env } from '@/src/shared/config/env'

const HUB_URL = `${env.apiOrigin}/hubs/notifications`

let connection: signalR.HubConnection | null = null
let boundToken: string | null = null
let startingPromise: Promise<void> | null = null

export function getSharedConnection(token: string): signalR.HubConnection {
  if (connection && boundToken === token) return connection

  connection?.stop()
  startingPromise = null

  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => token,

      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .build()

  boundToken = token
  return connection
}

export function getStartingPromise(): Promise<void> | null {
  return startingPromise
}

export function setStartingPromise(promise: Promise<void> | null): void {
  startingPromise = promise
}

export function dropSharedConnection(): void {
  connection?.stop()
  startingPromise = null
  connection = null
  boundToken = null
}
