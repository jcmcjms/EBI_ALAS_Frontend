import { create } from 'zustand'

interface SignalRConnectionState {
  isConnected: boolean
  setConnected: (isConnected: boolean) => void
}

export const useSignalRConnectionStore = create<SignalRConnectionState>(
  (set) => ({
    isConnected: false,
    setConnected: (isConnected) => set({ isConnected }),
  }),
)
