import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useApiConnectivity } from '../../hooks/useApiConnectivity';
import { BREAKPOINTS } from '../../utils/constants';
import {
  WifiIcon,
  ServerIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente visual para mostrar el estado de conectividad en tiempo real
 * Adaptativo: versión completa en desktop, minimalista en móvil
 * La información detallada se muestra solo al hacer click para expandir
 */
function ConnectivityIndicator({
  position = 'fixed',
  placement = 'bottom-left', // 'bottom-left', 'bottom-right', 'top-left', 'top-right'
  compact = false,
  showResponseTime = true,
  className = '',
  autoHide = false,
  autoHideDelay = 5000,
  onClick = null
}) {
  const { theme } = useTheme();
  const {
    isOnline,
    isBackendOnline,
    isFullyConnected,
    connectionStatus,
    connectionStatusText,
    responseTime,
    lastCheck,
    lastErrorMessage,
    isChecking,
    apiStatus,
    checkBackendConnectivity,
    environment,
    config
  } = useApiConnectivity();

  // ✅ ESTADOS LOCALES
  const [isExpanded, setIsExpanded] = useState(false); // Iniciar siempre compacto
  const [isVisible, setIsVisible] = useState(true);
  const [timeAgo, setTimeAgo] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINTS.MD);

  // ✅ DETECTAR CAMBIOS DE TAMAÑO DE PANTALLA
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.MD);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ ACTUALIZAR TIEMPO RELATIVO
  useEffect(() => {
    if (!lastCheck) return;

    const updateTimeAgo = () => {
      try {
        const distance = formatDistanceToNow(new Date(lastCheck), {
          addSuffix: true,
          locale: es
        });
        setTimeAgo(distance);
      } catch (error) {
        setTimeAgo('Hace un momento');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [lastCheck]);

  // ✅ AUTO-HIDE LOGIC
  useEffect(() => {
    if (autoHide && isFullyConnected) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, isFullyConnected, autoHideDelay]);

  // ✅ OBTENER CONFIGURACIÓN VISUAL SEGÚN EL ESTADO
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircleIcon,
          color: 'green',
          text: isMobile ? '' : 'Conectado',
          description: 'Conexión estable al servidor',
          bg: theme === 'dark' ? 'bg-green-900/90' : 'bg-green-50',
          border: 'border-green-500',
          text_color: 'text-green-700 dark:text-green-300',
          icon_color: 'text-green-500',
          dot: 'bg-green-500',
          bgClass: theme === 'dark' ? 'bg-green-900/80 text-green-300 border-green-700' : 'bg-green-100 text-green-700 border-green-200',
          dotClass: 'bg-green-500 animate-pulse'
        };

      case 'checking':
        return {
          icon: ArrowPathIcon,
          color: 'blue',
          text: isMobile ? '' : 'Verificando...',
          description: 'Verificando conexión al servidor',
          bg: theme === 'dark' ? 'bg-blue-900/90' : 'bg-blue-50',
          border: 'border-blue-500',
          text_color: 'text-blue-700 dark:text-blue-300',
          icon_color: 'text-blue-500',
          dot: 'bg-blue-500',
          bgClass: theme === 'dark' ? 'bg-blue-900/80 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-200',
          dotClass: 'bg-blue-500 animate-pulse'
        };

      case 'offline':
        return {
          icon: WifiIcon,
          color: 'red',
          text: isMobile ? '' : 'Sin internet',
          description: 'Sin conexión a internet',
          bg: theme === 'dark' ? 'bg-red-900/90' : 'bg-red-50',
          border: 'border-red-500',
          text_color: 'text-red-700 dark:text-red-300',
          icon_color: 'text-red-500',
          dot: 'bg-red-500',
          bgClass: theme === 'dark' ? 'bg-red-900/80 text-red-300 border-red-700' : 'bg-red-100 text-red-700 border-red-200',
          dotClass: 'bg-red-500'
        };

      case 'backend-offline':
        return {
          icon: ExclamationTriangleIcon,
          color: 'yellow',
          text: isMobile ? '' : 'Sin servidor',
          description: 'No se puede conectar al servidor',
          bg: theme === 'dark' ? 'bg-yellow-900/90' : 'bg-yellow-50',
          border: 'border-yellow-500',
          text_color: 'text-yellow-700 dark:text-yellow-300',
          icon_color: 'text-yellow-500',
          dot: 'bg-yellow-500',
          bgClass: theme === 'dark' ? 'bg-yellow-900/80 text-yellow-300 border-yellow-700' : 'bg-yellow-100 text-yellow-700 border-yellow-200',
          dotClass: 'bg-yellow-500'
        };

      default:
        return {
          icon: WifiIcon,
          color: 'gray',
          text: isMobile ? '' : 'Desconocido',
          description: 'Estado de conexión desconocido',
          bg: theme === 'dark' ? 'bg-gray-900/90' : 'bg-gray-50',
          border: 'border-gray-500',
          text_color: 'text-gray-700 dark:text-gray-300',
          icon_color: 'text-gray-500',
          dot: 'bg-gray-500',
          bgClass: theme === 'dark' ? 'bg-gray-800/80 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300',
          dotClass: 'bg-gray-500'
        };
    }
  };

  // ✅ OBTENER CLASES DE POSICIÓN
  const getPositionClasses = () => {
    if (position === 'static') return '';

    const placements = {
      'bottom-right': 'fixed bottom-4 right-4',
      'bottom-left': 'fixed bottom-4 left-4',
      'top-right': 'fixed top-4 right-4',
      'top-left': 'fixed top-4 left-4'
    };

    return placements[placement] || placements['bottom-left'];
  };

  // ✅ MANEJAR CLICK EN EL INDICADOR
  const handleMainClick = async () => {
    if (onClick) {
      onClick();
    } else {
      await checkBackendConnectivity();
    }
  };

  // ✅ MANEJAR CLICK EN EXPANDIR/CONTRAER
  const handleToggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // ✅ FORMATEAR ÚLTIMA VERIFICACIÓN
  const formatLastCheck = (date) => {
    if (!date) return 'Nunca';

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `Hace ${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)}m`;
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = getStatusConfig();
  const IconComponent = statusConfig.icon;

  // ✅ NO MOSTRAR SI NO ES VISIBLE
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`
          ${getPositionClasses()} z-40 p-2 rounded-full shadow-lg transition-all duration-300
          ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}
          border border-gray-300 dark:border-gray-600
        `}
        title="Mostrar estado de conexión"
      >
        <WifiIcon className="w-4 h-4 text-gray-500" />
      </button>
    );
  }

  return (
    <div className={`
      ${getPositionClasses()} z-50 transition-all duration-300
      ${className}
    `}>
      <div className="relative">
        {/* ✅ VERSIÓN MÓVIL MINIMALISTA O COMPACTA */}
        {(isMobile || compact || !isExpanded) ? (
          <div className={`
            flex items-center rounded-full text-xs font-medium
            transition-all duration-300 border backdrop-blur-sm
            hover:scale-105 active:scale-95 cursor-pointer
            ${statusConfig.bgClass}
            ${isChecking ? 'animate-pulse' : ''}
          `}
          onClick={handleMainClick}
          title={statusConfig.description}
          >
            <div className={`flex items-center ${isMobile ? 'gap-0 px-2 py-2' : 'gap-2 px-3 py-2'}`}>
              {/* Icono de estado (solo en desktop o cuando no es móvil) */}
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
              <div className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />

              {/* Texto de estado */}
              <span className="whitespace-nowrap">{statusConfig.text}</span>

              {/* Tiempo de respuesta (opcional y solo en desktop) */}
              {showResponseTime && responseTime && isFullyConnected && !isMobile && (
                <span className="text-xs opacity-75">
                  {responseTime}ms
                </span>
              )}
            </div>

            {/* Botón para expandir (integrado) */}
            {!isMobile && !compact && (
              <div
                onClick={handleToggleExpand}
                className={`
                  px-2 py-2 border-l border-opacity-30
                  transition-all duration-300 cursor-pointer
                  hover:bg-black/10 dark:hover:bg-white/10
                  ${statusConfig.icon_color}
                `}
                title={isExpanded ? "Contraer" : "Expandir"}
              >
                {isExpanded ? (
                  <EyeSlashIcon className="w-3 h-3" />
                ) : (
                  <EyeIcon className="w-3 h-3" />
                )}
              </div>
            )}
          </div>
        ) : (
          /* ✅ VERSIÓN DESKTOP EXPANDIDA */
          <div className={`
            min-w-72 rounded-lg shadow-xl backdrop-blur-sm border
            ${statusConfig.bg} ${statusConfig.border}
            ${theme === 'dark' ? 'bg-gray-800/95' : 'bg-white/95'}
          `}>
            {/* Header */}
            <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`${statusConfig.icon_color}`}>
                    {isChecking ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <IconComponent className="w-4 h-4" />
                    )}
                  </div>
                  <h3 className="font-medium text-sm">
                    {connectionStatusText}
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón de refresh */}
                  <div
                    onClick={checkBackendConnectivity}
                    className={`
                      p-1 rounded transition-colors cursor-pointer
                      ${statusConfig.icon_color} hover:bg-black/10 dark:hover:bg-white/10
                      ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title="Verificar ahora"
                  >
                    <ArrowPathIcon className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                  </div>

                  {/* Botón de contraer */}
                  <div
                    onClick={() => setIsExpanded(false)}
                    className={`p-1 rounded transition-colors cursor-pointer ${statusConfig.icon_color} hover:bg-black/10 dark:hover:bg-white/10`}
                    title="Contraer"
                  >
                    <EyeSlashIcon className="w-3 h-3" />
                  </div>

                  {/* Botón de ocultar */}
                  {autoHide && (
                    <div
                      onClick={() => setIsVisible(false)}
                      className={`p-1 rounded transition-colors cursor-pointer ${statusConfig.icon_color} hover:bg-black/10 dark:hover:bg-white/10`}
                      title="Ocultar"
                    >
                      ✕
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3 space-y-3 text-sm">
              {/* Estado de Internet */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiIcon className="w-4 h-4 text-gray-500" />
                  <span>Internet:</span>
                </div>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Conectado</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">Desconectado</span>
                    </>
                  )}
                </div>
              </div>

              {/* Estado del Servidor */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ServerIcon className="w-4 h-4 text-gray-500" />
                  <span>Servidor:</span>
                </div>
                <div className="flex items-center gap-1">
                  {isBackendOnline === null ? (
                    <>
                      <div className="w-4 h-4 rounded-full bg-gray-400 animate-pulse" />
                      <span className="text-gray-500">No verificado</span>
                    </>
                  ) : isBackendOnline ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Disponible</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">No disponible</span>
                    </>
                  )}
                </div>
              </div>

              {/* Latencia */}
              {responseTime && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SignalIcon className="w-4 h-4 text-gray-500" />
                    <span>Latencia:</span>
                  </div>
                  <span className={`font-mono ${
                    responseTime < 200
                      ? 'text-green-600 dark:text-green-400'
                      : responseTime < 500
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {responseTime}ms
                  </span>
                </div>
              )}

              {/* Última verificación */}
              {lastCheck && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span>Última verificación:</span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {timeAgo}
                  </span>
                </div>
              )}

              {/* Error message */}
              {lastErrorMessage && !isBackendOnline && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Error de conexión:
                      </p>
                      <p className="text-xs text-red-500 dark:text-red-400 break-words">
                        {lastErrorMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Environment info (solo en desarrollo) */}
              {environment === 'development' && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <CogIcon className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">Entorno:</span>
                    </div>
                    <span className="text-gray-500 font-mono">{environment}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con botón de verificar */}
            <div className={`px-4 py-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div
                onClick={checkBackendConnectivity}
                className={`
                  w-full px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer text-center
                  ${isChecking
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : `${statusConfig.bg} ${statusConfig.text_color} hover:bg-opacity-80`
                  }
                `}
              >
                {isChecking ? (
                  <div className="flex items-center justify-center gap-2">
                    <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    Verificando...
                  </div>
                ) : (
                  'Verificar ahora'
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectivityIndicator;