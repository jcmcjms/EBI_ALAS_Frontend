import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/src/components/ui/toast'
import './index.css'
import App from '@/src/App'
import { AuthInitProvider } from '@/src/components/system/AuthInitProvider'
import { ErrorBoundary } from '@/src/components/system/ErrorBoundary'
import { queryClient } from '@/src/lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthInitProvider>
          <App />
        </AuthInitProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
