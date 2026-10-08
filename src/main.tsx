import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/src/shared/ui/feedback/toast'
import './index.css'
import App from '@/src/App'
import { AuthInitProvider } from '@/src/app/system/AuthInitProvider'
import { ErrorBoundary } from '@/src/app/system/ErrorBoundary'
import { queryClient } from '@/src/shared/lib/queryClient'

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
