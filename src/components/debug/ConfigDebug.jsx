import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  API_CONFIG,
  DEBUG_CONFIG,
  getCurrentEnvironment,
  getCurrentConfig,
  validateConfig
} from '../../config/config.server';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  WifiIcon,
  CogIcon
} from '@heroicons/react/24/outline';

/**
 * Componente de debug para verificar la configuración de la aplicación
 * Solo se muestra en modo desarrollo cuando DEBUG_CONFIG.ENABLED es true
 */
function ConfigDebug({ isVisible = false, onToggle }) {
  const { theme } = useTheme();
  const [apiStatus, setApiStatus] = useState('checking');
  const [configStatus, setConfigStatus] = useState(null);
  const [envVars, setEnvVars] = useState({});

  // ✅ VERIFICAR ESTADO DE LA API
  const checkApiStatus = async () => {
    setApiStatus('checking');

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/flavors`, {
        method: 'GET',
        timeout: 5000,
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    } catch (error) {
      console.error('❌ API connection check failed:', error);
      setApiStatus('error');
    }
  };

  // ✅ VERIFICAR CONFIGURACIÓN
  const checkConfiguration = () => {
    const isValid = validateConfig();
    const environment = getCurrentEnvironment();
    const config = getCurrentConfig();

    setConfigStatus({
      isValid,
      environment,
      config
    });
  };

  // ✅ OBTENER VARIABLES DE ENTORNO
  const getEnvironmentVariables = () => {
    const vars = {
      // Variables de Vite disponibles
      VITE_ENV_NODE: import.meta.env.VITE_ENV_NODE,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_API_BASE_URL_ROOT: import.meta.env.VITE_API_BASE_URL_ROOT,
      VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE,
      VITE_MODE: import.meta.env.VITE_MODE,
      VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,

      // Variables internas de Vite
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,

      // URLs calculadas
      CALCULATED_BASE_URL: API_CONFIG.BASE_URL,
      CALCULATED_ROOT_URL: API_CONFIG.BASE_URL_ROOT,
      CALCULATED_ENVIRONMENT: API_CONFIG.ENVIRONMENT
    };

    setEnvVars(vars);
  };

  // ✅ EFECTOS DE INICIALIZACIÓN
  useEffect(() => {
    if (isVisible) {
      checkConfiguration();
      getEnvironmentVariables();
      checkApiStatus();
    }
  }, [isVisible]);

  // ✅ NO MOSTRAR EN PRODUCCIÓN O SI NO ESTÁ HABILITADO
  if (!DEBUG_CONFIG.ENABLED || API_CONFIG.IS_PRODUCTION) {
    return null;
  }

  return (
    <>
      {/* ✅ BOTÓN FLOTANTE PARA TOGGLE */}
      <button
        onClick={onToggle}
        className={`
          fixed top-4 right-2 z-50 p-3 rounded-full shadow-lg
          ${theme === 'dark'
            ? 'bg-gray-800 text-white border border-gray-600'
            : 'bg-white text-gray-800 border border-gray-300'
          }
          hover:shadow-xl transition-all duration-300
          ${isVisible ? 'bg-blue-600 text-white' : ''}
        `}
        title="Toggle Configuration Debug"
      >
        <CogIcon className="w-5 h-5" />
      </button>

      {/* ✅ PANEL DE DEBUG */}
      {isVisible && (
        <div className={`
          fixed inset-0 z-40 overflow-y-auto
          ${theme === 'dark' ? 'bg-black bg-opacity-50' : 'bg-gray-900 bg-opacity-50'}
        `}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className={`
              w-full max-w-4xl rounded-lg shadow-xl
              ${theme === 'dark'
                ? 'bg-gray-800 border border-gray-700'
                : 'bg-white border border-gray-200'
              }
            `}>
              {/* ✅ HEADER */}
              <div className={`
                px-6 py-4 border-b
                ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
              `}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CogIcon className="w-6 h-6" />
                    Configuration Debug
                  </h2>
                  <button
                    onClick={onToggle}
                    className={`
                      p-2 rounded-lg transition-colors
                      ${theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* ✅ CONTENIDO */}
              <div className="p-6 space-y-6">

                {/* ✅ ESTADO DE LA API */}
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <WifiIcon className="w-5 h-5" />
                    API Connection Status
                  </h3>

                  <div className="flex items-center gap-3 mb-3">
                    {apiStatus === 'checking' && (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />
                        <span>Checking connection...</span>
                      </>
                    )}
                    {apiStatus === 'connected' && (
                      <>
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        <span className="text-green-600">Connected to API</span>
                      </>
                    )}
                    {apiStatus === 'error' && (
                      <>
                        <XCircleIcon className="w-5 h-5 text-red-500" />
                        <span className="text-red-600">Connection failed</span>
                      </>
                    )}

                    <button
                      onClick={checkApiStatus}
                      className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Test Again
                    </button>
                  </div>

                  <div className={`
                    p-3 rounded text-sm
                    ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}
                  `}>
                    <strong>API URL:</strong> {API_CONFIG.BASE_URL}
                  </div>
                </div>

                {/* ✅ CONFIGURACIÓN ACTUAL */}
                {configStatus && (
                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                      {configStatus.isValid ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                      )}
                      Configuration Status
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`
                        p-4 rounded
                        ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}
                      `}>
                        <h4 className="font-medium mb-2">Environment</h4>
                        <p className="text-sm">
                          <strong>Current:</strong> {configStatus.environment}
                        </p>
                        <p className="text-sm">
                          <strong>Debug Mode:</strong> {configStatus.config.DEBUG_MODE ? 'Enabled' : 'Disabled'}
                        </p>
                        <p className="text-sm">
                          <strong>Timeout:</strong> {configStatus.config.TIMEOUT}ms
                        </p>
                      </div>

                      <div className={`
                        p-4 rounded
                        ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}
                      `}>
                        <h4 className="font-medium mb-2">API Configuration</h4>
                        <p className="text-sm break-all">
                          <strong>Base URL:</strong> {API_CONFIG.BASE_URL}
                        </p>
                        <p className="text-sm break-all">
                          <strong>Root URL:</strong> {API_CONFIG.BASE_URL_ROOT}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ VARIABLES DE ENTORNO */}
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <InformationCircleIcon className="w-5 h-5" />
                    Environment Variables
                  </h3>

                  <div className={`
                    max-h-60 overflow-y-auto p-4 rounded text-sm font-mono
                    ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}
                  `}>
                    {Object.entries(envVars).map(([key, value]) => (
                      <div key={key} className="mb-1">
                        <span className="text-blue-600 dark:text-blue-400">{key}:</span>{' '}
                        <span className={value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {value || 'undefined'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ✅ ACCIONES */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      checkConfiguration();
                      getEnvironmentVariables();
                      checkApiStatus();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Refresh All
                  </button>

                  <button
                    onClick={() => {
                      console.log('🔍 Current Configuration:', {
                        API_CONFIG,
                        envVars,
                        configStatus
                      });
                    }}
                    className={`
                      px-4 py-2 rounded transition-colors
                      ${theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                      }
                    `}
                  >
                    Log to Console
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ConfigDebug;