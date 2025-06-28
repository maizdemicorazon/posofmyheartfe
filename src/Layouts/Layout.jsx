import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLoading } from '../context/LoadingContext';
import { useMessage } from '../context/MessageContext';
import TopNav from '../components/menu/TopNav';
import SlideMenu from "../components/menu/SlideMenu";
import BusinessHeader from '../components/menu/BusinessHeader';
import ConnectivityIndicator from '../components/common/ConnectivityIndicator';

function Layout({ children, selectedCategory, onSelectCategory, view, setView }) {
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { loading } = useLoading();
  const { message, setMessage } = useMessage();

  // ✅ CONFIGURACIÓN DE VISTAS QUE NECESITAN DIFERENTES HEADERS
  const viewConfig = {
    home: {
      showTopNav: true,
      showBusinessHeader: false, // TopNav ya incluye BusinessHeader
      title: 'Productos'
    },
    cart: {
      showTopNav: false,
      showBusinessHeader: true, // CartPage maneja su propio header
      title: 'Carrito'
    },
    orders: {
      showTopNav: false,
      showBusinessHeader: true, // Orders maneja su propio header
      title: 'Órdenes'
    },
    metrics: {
      showTopNav: false,
      showBusinessHeader: true, // DailyEarnings maneja su propio header
      title: 'Métricas Diarias'
    },
    'earnings-chart': {
      showTopNav: false,
      showBusinessHeader: true, // EarningsChart maneja su propio header
      title: 'Gráfico de Ganancias'
    },
    'sales-report': {
      showTopNav: false,
      showBusinessHeader: true, // SalesReport maneja su propio header
      title: 'Reporte de Ventas'
    }
  };

  const currentViewConfig = viewConfig[view] || {
    showTopNav: false,
    showBusinessHeader: true,
    title: 'Sistema POS'
  };

  // ✅ FUNCIÓN PARA OBTENER CLASES DE ALERTA MEJORADA
  const getAlertClasses = (type) => {
    const baseClasses = "px-4 py-3 rounded-lg relative mb-2 mx-4 mt-2 shadow-sm border transition-all duration-300";

    switch (type) {
      case 'success':
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-green-900/20 border-green-700 text-green-300'
          : 'bg-green-50 border-green-400 text-green-700'
        }`;
      case 'info':
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-blue-900/20 border-blue-700 text-blue-300'
          : 'bg-blue-50 border-blue-400 text-blue-700'
        }`;
      case 'warning':
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-yellow-900/20 border-yellow-700 text-yellow-300'
          : 'bg-yellow-50 border-yellow-400 text-yellow-700'
        }`;
      case 'error':
      default:
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-red-900/20 border-red-700 text-red-300'
          : 'bg-red-50 border-red-400 text-red-700'
        }`;
    }
  };

  // ✅ FUNCIÓN PARA OBTENER ICONOS DE ALERTA
  const getAlertIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
      default:
        return '❌';
    }
  };

  // ✅ FUNCIÓN PARA OBTENER TÍTULOS DE ALERTA
  const getAlertTitle = (type) => {
    switch (type) {
      case 'success':
        return '¡Éxito!';
      case 'info':
        return 'Información';
      case 'warning':
        return 'Advertencia';
      case 'error':
      default:
        return 'Error';
    }
  };

  // ✅ MANEJO DE TECLAS DE ESCAPE PARA CERRAR MENÚ
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // ✅ PREVENIR SCROLL CUANDO EL MENÚ ESTÁ ABIERTO
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <div
      className={`layout-background relative z-0 min-h-screen flex flex-col transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-900'
      }`}
    >

      {/* ✅ LOADER OVERLAY MEJORADO */}
      {loading && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[9999] transition-all duration-300"
          style={{ zIndex: 9999 }}
        >
          <div className={`text-center p-8 rounded-2xl shadow-2xl border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            {/* Spinner mejorado */}
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-600 border-r-blue-600 mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-600/20 mx-auto"></div>
            </div>

            {/* Texto de carga */}
            <div className={`space-y-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <p className="text-lg font-semibold">Cargando...</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Por favor espera un momento
              </p>
            </div>

            {/* Indicador de progreso animado */}
            <div className="mt-4">
              <div className={`h-1 w-48 mx-auto rounded-full overflow-hidden ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ HEADER CONDICIONAL MEJORADO */}
      {currentViewConfig.showBusinessHeader && (
        <BusinessHeader />
      )}

      {/* Header y navegación - Solo para vista home */}
      {currentViewConfig.showTopNav && (
        <TopNav
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          onMenuClick={() => setIsMenuOpen(true)}
        />
      )}

      {/* ✅ MENÚ LATERAL MEJORADO */}
      <SlideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        view={view}
        setView={setView}
      />

      {/* ✅ CONTENIDO PRINCIPAL */}
      <div className="flex-1 relative z-10">
        {/* ✅ MENSAJES DE ALERTA MEJORADOS */}
        {message && (
          <div
            className={`${getAlertClasses(message.type)} animate-in slide-in-from-top-5 fade-in duration-300 relative z-20`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {/* Icono de estado */}
                <div className="flex-shrink-0 mt-0.5">
                  <span className="text-lg" role="img" aria-label={message.type}>
                    {getAlertIcon(message.type)}
                  </span>
                </div>

                {/* Contenido del mensaje */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="font-bold text-sm">
                      {getAlertTitle(message.type)}
                    </strong>
                  </div>
                  <p className="text-sm leading-relaxed">
                    {message.text}
                  </p>
                </div>
              </div>

              {/* Botón de cerrar mejorado */}
              <button
                onClick={() => setMessage(null)}
                className={`flex-shrink-0 ml-4 p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
                }`}
                aria-label="Cerrar mensaje"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Barra de progreso para auto-cierre */}
            <div className={`absolute bottom-0 left-0 h-1 bg-current opacity-30 animate-pulse`}
                 style={{
                   width: '100%',
                   animation: 'shrink 3s linear forwards'
                 }}>
            </div>
          </div>
        )}

        <main className="flex-1 relative z-10">
           {children}
        </main>

      </div>

      {/* ✅ OVERLAY PARA MENÚ MÓVIL */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ✅ INDICADOR DE CONECTIVIDAD REAL AL BACKEND */}
      <ConnectivityIndicator
        position="fixed"
        placement="bottom-left"
        showDetails={true}
        showResponseTime={true}
      />

      {/* ✅ ESTILOS ADICIONALES PARA ANIMACIONES */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }

            .animate-in {
              animation-fill-mode: both;
            }

            .slide-in-from-top-5 {
              animation: slideInFromTop 0.3s ease-out;
            }

            .fade-in {
              animation: fadeIn 0.3s ease-out;
            }

            @keyframes slideInFromTop {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            /* Mejora de scrollbar */
            ::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }

            ::-webkit-scrollbar-track {
              background: ${theme === 'dark' ? '#374151' : '#f3f4f6'};
              border-radius: 3px;
            }

            ::-webkit-scrollbar-thumb {
              background: ${theme === 'dark' ? '#6b7280' : '#d1d5db'};
              border-radius: 3px;
            }

            ::-webkit-scrollbar-thumb:hover {
              background: ${theme === 'dark' ? '#9ca3af' : '#9ca3af'};
            }
            .layout-background::before {
              content: '';
              position: absolute;
              inset: 0;
              background-image: url('/images/maizmicorazon.png');
               background-size: 80px; /* Tamaño muy pequeño */
               background-repeat: repeat; /* Repetir en mosaico */
               opacity: 0.02; /* ¡Opacidad MUY baja! */
               transform: none; /* Sin rotación ni escala */
              z-index: -1;
              pointer-events: none;
              transition: opacity 0.3s ease-in-out;
            }
          `
        }}
      />
    </div>
  );
}

export default Layout;