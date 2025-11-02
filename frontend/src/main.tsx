import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App.tsx'
import { SSEProvider } from './contexts/SSEContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SSEProvider>
      <App />
    </SSEProvider>
  </StrictMode>,
)
