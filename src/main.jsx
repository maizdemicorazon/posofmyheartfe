import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import { MessageProvider } from './context/MessageContext';
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LoadingProvider>
        <MessageProvider>
          <App />
        </MessageProvider>
      </LoadingProvider>
    </ThemeProvider>
  </StrictMode>,
)
