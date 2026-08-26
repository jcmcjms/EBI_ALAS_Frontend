import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from '@/src/App'
import { ErrorBoundary } from '@/src/components/ErrorBoundary'
import { AuthInitProvider } from '@/src/components/AuthInitProvider'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthInitProvider>
          <App />
        </AuthInitProvider>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
