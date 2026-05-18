import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/red-hat-text/400.css'
import '@fontsource/red-hat-text/500.css'
import '@fontsource/red-hat-text/600.css'
import '@fontsource/red-hat-text/700.css'
import '@fontsource/red-hat-display/600.css'
import '@fontsource/red-hat-display/700.css'
import '@fontsource/red-hat-mono/400.css'
import '@fontsource/red-hat-mono/500.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
