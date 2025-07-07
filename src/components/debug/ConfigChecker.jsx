import { useState } from 'react';
import { useApiConnectivity } from '../../hooks/useApiConnectivity';
import {
  API_CONFIG,
  DEBUG_CONFIG,
  getDiagnostics,
  getConfigInfo
} from '../../config/config.server';

function ConfigChecker({ children }) {
  const {
    isConfigured,
    configErrors,
    isFullyConnected,
    connectionStatus,
    connectionStatusText,
    environment,
    refreshAll,
    checkBackendConnectivity
  } = useApiConnectivity();

  const [showForceLoad, setShowForceLoad] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Solo mostrar el checker si hay errores de configuración y no se está forzando la carga
  if (!isConfigured && configErrors.length > 0 && !showForceLoad) {
    // Obtener diagnósticos usando la función unificada
    const diagnostics = getDiagnostics();
    const configInfo = getConfigInfo();

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.204 0 2.187-1.007 2.187-2.25 0-.358-.083-.697-.229-.992L13.875 4.242a2.25 2.25 0 00-3.75 0L3.104 17.758c-.142.295-.229.634-.229.992 0 1.243.983 2.25 2.187 2.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error de Configuración
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Hay problemas con la configuración de la aplicación que impiden su funcionamiento normal.
            </p>
          </div>

          {/* ✅ Estado de conectividad */}
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Estado de conexión:</span>
              <span className={`text-sm px-2 py-1 rounded ${
                connectionStatus === 'connected'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : connectionStatus === 'checking'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}>
                {connectionStatusText}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Entorno:</strong> {environment}</p>
              <p><strong>API URL:</strong> {API_CONFIG.BASE_URL}</p>
              <p><strong>Timeout:</strong> {API_CONFIG.DEFAULT_TIMEOUT}ms</p>
            </div>
          </div>

          {/* ✅ Mostrar errores de configuración */}
          {configErrors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                Errores de configuración:
              </h3>
              <ul className="text-sm space-y-1">
                {configErrors.map((error, index) => (
                  <li key={index} className="text-red-600 dark:text-red-400">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ Mostrar problemas críticos */}
          {diagnostics.issues.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                Problemas críticos:
              </h3>
              <ul className="text-sm space-y-1">
                {diagnostics.issues.map((issue, index) => (
                  <li key={index} className="text-red-600 dark:text-red-400">• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ Mostrar advertencias */}
          {diagnostics.warnings.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                Advertencias:
              </h3>
              <ul className="text-sm space-y-1">
                {diagnostics.warnings.map((warning, index) => (
                  <li key={index} className="text-yellow-600 dark:text-yellow-400">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ Diagnósticos detallados */}
          <div className="mb-6">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showDiagnostics ? 'Ocultar' : 'Mostrar'} diagnósticos detallados
            </button>

            {showDiagnostics && (
              <div className="mt-2 space-y-3">
                {/* Información del sistema */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                  <h4 className="font-medium mb-2">Información del sistema:</h4>
                  <ul className="space-y-1">
                    {diagnostics.info.map((info, index) => (
                      <li key={index} className="text-gray-600 dark:text-gray-400">• {info}</li>
                    ))}
                  </ul>
                </div>

                {/* Variables de entorno clave */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                  <h4 className="font-medium mb-2">Variables de entorno:</h4>
                  <div className="space-y-1 font-mono">
                    {Object.entries(configInfo.envVars).slice(0, 5).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-blue-600 dark:text-blue-400">{key}:</span>{' '}
                        <span className={value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {value?.toString() || 'undefined'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Acciones */}
          <div className="space-y-3">
            <button
              onClick={async () => {
                try {
                  await refreshAll();
                  // Si después de refrescar sigue habiendo problemas de conectividad, intentar reconectar
                  if (connectionStatus !== 'connected') {
                    await checkBackendConnectivity();
                  }
                } catch (error) {
                  console.error('Error refreshing configuration:', error);
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Verificar configuración y conectividad
            </button>

            <button
              onClick={() => setShowForceLoad(true)}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.204 0 2.187-1.007 2.187-2.25 0-.358-.083-.697-.229-.992L13.875 4.242a2.25 2.25 0 00-3.75 0L3.104 17.758c-.142.295-.229.634-.229.992 0 1.243.983 2.25 2.187 2.25z" />
              </svg>
              Continuar de todos modos
            </button>

            {DEBUG_CONFIG.ENABLED && (
              <button
                onClick={() => {
                  console.group('🔍 Configuration Checker Debug Info');
                  console.log('Hook State:', {
                    isConfigured,
                    configErrors,
                    environment,
                    connectionStatus,
                    isFullyConnected
                  });
                  console.log('Diagnostics:', diagnostics);
                  console.log('API Config:', API_CONFIG);
                  console.log('Config Info:', configInfo);
                  console.groupEnd();
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Log Info to Console
              </button>
            )}
          </div>

          {/* ✅ Información adicional en modo debug */}
          {DEBUG_CONFIG.ENABLED && (
            <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded text-xs">
              <p className="text-blue-600 dark:text-blue-400">
                <strong>Debug Mode:</strong> Información adicional disponible en la consola del navegador
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return children;
}

export default ConfigChecker;