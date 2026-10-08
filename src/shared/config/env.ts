export const env = {
  apiBaseUrl: import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL,
  apiOrigin: import.meta.env.VITE_API_BASE_URL,
  isDev: import.meta.env.DEV,
} as const