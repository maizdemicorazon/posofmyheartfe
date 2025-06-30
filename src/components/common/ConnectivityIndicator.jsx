import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import { CONNECTIVITY_CONFIG, BREAKPOINTS } from '../../utils/constants';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

/**
 * Componente indicador de conectividad real al backend
 * @param {Object} props - Propiedades del componente
 * @param {string} props.position - Posición del indicador: 'fixed' | 'static' (default: 'fixed')
 * @param {string} props.placement - Ubicación si es fixed: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' (default: 'bottom-right')
 * @param {boolean} props.showDetails - Mostrar detalles en hover (default: true)
 * @param {boolean} props.showResponseTime - Mostrar tiempo de respuesta (default: true)
 * @param {function} props.onClick - Función al hacer click (default: recheck)
 */
function ConnectivityIndicator({
  position = 'fixed',
  placement = 'bottom-right',
  showDetails = true,
  showResponseTime = true,
  onClick = null
}) {
  const { theme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINTS.MD);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < BREAKPOINTS.MD);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    isOnline,
    isBackendOnline,
    isFullyConnected,
    connectionStatus,
    lastCheck,
    lastError,
    responseTime,
    isChecking,
    recheckConnectivity
  } = useConnectivity({
    checkInterval: CONNECTIVITY_CONFIG.INTERVAL,
    timeout: CONNECTIVITY_CONFIG.TIMEOUT,
    checkOnFocus: CONNECTIVITY_CONFIG.CHECK_ON_FOCUS,
    checkOnVisibilityChange: CONNECTIVITY_CONFIG.CHECK_ON_VISIBILITY_CHANGE
  });

  /**
   * Obtener configuración visual según el estado
   */
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircleIcon,
          color: 'green',
          text: isMobile ? '' : 'Conectado',
          description: 'Conexión estable al servidor',
          bgClass: theme === 'dark' ? 'bg-green-900/80 text-green-300 border-green-700' : 'bg-green-100 text-green-700 border-green-200',
          dotClass: 'bg-green-500 animate-pulse'
        };

      case 'backend-offline':
        return {
          icon: ExclamationTriangleIcon,
          color: 'red',
          text: isMobile ? '' : 'Sin servidor',
          description: 'No se puede conectar al servidor',
          bgClass: theme === 'dark' ? 'bg-red-900/80 text-red-300 border-red-700' : 'bg-red-100 text-red-700 border-red-200',
          dotClass: 'bg-red-500'
        };

      case 'offline':
        return {
          icon: WifiIcon,
          color: 'gray',
          text: isMobile ? '' : 'Sin internet',
          description: 'Sin conexión a internet',
          bgClass: theme === 'dark' ? 'bg-gray-800/80 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300',
          dotClass: 'bg-gray-500'
        };

      case 'checking':
      default:
        return {
          icon: ClockIcon,
          color: 'yellow',
          text: isMobile ? '' : 'Verificando...',
          description: 'Verificando conexión al servidor',
          bgClass: theme === 'dark' ? 'bg-yellow-900/80 text-yellow-300 border-yellow-700' : 'bg-yellow-100 text-yellow-700 border-yellow-200',
          dotClass: 'bg-yellow-500 animate-pulse'
        };
    }
  };

  /**
   * Obtener clases de posición
   */
  const getPositionClasses = () => {
    if (position === 'static') return '';

    const placements = {
      'bottom-right': 'fixed bottom-4 right-4',
      'bottom-left': 'fixed bottom-4 left-4',
      'top-right': 'fixed top-4 right-4',
      'top-left': 'fixed top-4 left-4'
    };

    return placements[placement] || placements['bottom-right'];
  };

  /**
   * Manejar click en el indicador
   */
  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else {
      // Comportamiento por defecto: recheck
      await recheckConnectivity();
    }
  };

  /**
   * Formatear última verificación
   */
  const formatLastCheck = (date) => {
    if (!date) return 'Nunca';

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `Hace ${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)}m`;
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className={`${getPositionClasses()} z-20`}>
      <div className="relative">
        {/* Indicador Principal */}
        <button
          onClick={handleClick}
          onMouseEnter={() => showDetails && setShowTooltip(true)}
          onMouseLeave={() => showDetails && setShowTooltip(false)}
          className={`
            flex items-center ${isMobile ? 'gap-0 px-2 py-2' : 'gap-2 px-3 py-2'} rounded-full text-xs font-medium
            transition-all duration-300 border backdrop-blur-sm
            hover:scale-105 active:scale-95 cursor-pointer
            ${config.bgClass}
            ${isChecking ? 'animate-pulse' : ''}
          `}
          disabled={isChecking}
          title={config.description}
        >
          {/* Icono de estado */}
           {!isMobile && (
              <div className="relative">
                {isChecking ? (
                  <ArrowPathIcon className="w-3 h-3 animate-spin" />
                ) : (
                  <IconComponent className="w-3 h-3" />
                )}
              </div>
          )}
          {/* Dot indicator */}
          <div className={`w-2 h-2 rounded-full ${config.dotClass}`}></div>

          {/* Texto de estado */}
          <span className="whitespace-nowrap">{config.text}</span>

          {/* Tiempo de respuesta (opcional) */}
          {showResponseTime && responseTime && isFullyConnected && !isMobile && (
            <span className="text-xs opacity-75">
              {responseTime}ms
            </span>
          )}
        </button>

        {/* Tooltip detallado */}
        {showTooltip && showDetails && (
          <div className={`
            absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2
            px-4 py-3 rounded-lg shadow-xl border min-w-48
            transition-all duration-200 animate-in fade-in slide-in-from-bottom-2
            ${theme === 'dark'
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-200 text-gray-900'
            }
          `}>

            {/* Flecha del tooltip */}
            <div className={`
              absolute top-full left-1/2 transform -translate-x-1/2
              w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent
              ${theme === 'dark' ? 'border-t-gray-800' : 'border-t-white'}
            `}></div>

            {/* Contenido del tooltip */}
            <div className="space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                {config.text}
              </div>

              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="opacity-75">Internet:</span>
                  <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                    {isOnline ? '✓ Conectado' : '✗ Desconectado'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="opacity-75">Servidor:</span>
                  <span className={isBackendOnline ? 'text-green-600' : 'text-red-600'}>
                    {isBackendOnline === null ? '? Verificando' :
                     isBackendOnline ? '✓ Disponible' : '✗ No disponible'}
                  </span>
                </div>

                {responseTime && (
                  <div className="flex justify-between">
                    <span className="opacity-75">Latencia:</span>
                    <span className={responseTime < 1000 ? 'text-green-600' :
                                   responseTime < 3000 ? 'text-yellow-600' : 'text-red-600'}>
                      {responseTime}ms
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="opacity-75">Última verificación:</span>
                  <span>{formatLastCheck(lastCheck)}</span>
                </div>

                {lastError && (
                  <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-red-600 text-xs">
                      <span className="opacity-75">Error:</span>
                      <div className="font-mono mt-1 p-1 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                        {lastError}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón de recheck */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    recheckConnectivity();
                    setShowTooltip(false);
                  }}
                  className={`
                    w-full px-2 py-1 rounded text-xs font-medium transition-colors
                    ${theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }
                  `}
                  disabled={isChecking}
                >
                  {isChecking ? 'Verificando...' : 'Verificar ahora'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectivityIndicator;