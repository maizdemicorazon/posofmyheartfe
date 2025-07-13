import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ✅ CONFIGURACIÓN PARA DESARROLLO VS PRODUCCIÓN
const isDevelopment = import.meta.env.DEV;

// ✅ COMPONENTE WRAPPER CONDICIONAL PARA STRICTMODE
function AppWrapper() {
  // ✅ En desarrollo, usar StrictMode puede causar el error del contexto
  // debido a renderizados dobles. Si experimentas problemas, puedes
  // comentar la línea de StrictMode temporalmente
  if (isDevelopment) {
    console.log('🔧 Development mode detected');

    // ✅ OPCIÓN A: Con StrictMode (recomendado para detectar problemas)
    return (
      <StrictMode>
        <App />
      </StrictMode>
    );

    // ✅ OPCIÓN B: Sin StrictMode (usar solo si hay problemas persistentes)
    // return <App />;
  }

  // ✅ En producción, siempre usar la app directamente
  return <App />;
}

// ✅ FUNCIÓN DE INICIALIZACIÓN CON MANEJO DE ERRORES
function initializeApp() {
  try {
    const rootElement = document.getElementById('root');

    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = createRoot(rootElement);

    console.log('🚀 Initializing React app...');

    root.render(<AppWrapper />);

    console.log('✅ React app initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize React app:', error);

    // ✅ Mostrar error en pantalla si falla la inicialización
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        background-color: #f3f4f6;
      ">
        <div style="
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">
            Error al cargar la aplicación
          </h1>
          <p style="color: #6b7280; margin-bottom: 1rem;">
            Hubo un problema al inicializar la aplicación.
          </p>
          <button
            onclick="window.location.reload()"
            style="
              background: #2563eb;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 4px;
              cursor: pointer;
            "
          >
            Recargar página
          </button>
        </div>
      </div>
    `;
  }
}

// ✅ INICIALIZAR LA APLICACIÓN
initializeApp();