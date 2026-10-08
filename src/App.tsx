import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/src/app/routes/router'

function App() {
  return <RouterProvider router={router} />
}

export default App
