import { useState, useEffect, useCallback, useRef } from 'react';
import {
  API_CONFIG,
  API_ENDPOINTS,
  DEBUG_CONFIG,
  getCurrentEnvironment,
  getCurrentConfig,
  validateConfig,
  CONNECTIVITY_CONFIG
} from '../config/config.server';

/**
 * Hook combinado para manejar configuración de API y conectividad
 * Combina las funcionalidades de useApiConfig y useConnectivity
 * @param {Object} options - Configuración del hook
 * @param {number} options.checkInterval - Intervalo de verificación en ms
 * @param {number} options.timeout - Timeout para requests en ms  
 * @param {boolean} options.checkOnFocus - Verificar al enfocar ventana
 * @param {boolean} options.checkOnVisibilityChange - Verificar al cambiar visibilidad
 * @param {boolean} options.enableVisualIndicator - Habilitar indicador visual
 * @returns {Object} Estado completo de configuración y conectividad
 */
export function useApiConnectivity({
  checkInterval = getCurrentConfig().INTERVAL,
  timeout = getCurrentConfig().TIMEOUT,
  checkOnFocus = getCurrentConfig().CHECK_ON_FOCUS,
  checkOnVisibilityChange = getCurrentConfig().CHECK_ON_VISIBILITY_CHANGE,
  enableVisualIndicator = false
} = {}) {

  // ✅ ESTADOS DE CONFIGURACIÓN
  const [isConfigured, setIsConfigured] = useState(false);
  const [configErrors, setConfigErrors] = useState([]);
  const [environment, setEnvironment] = useState(null);

  // ✅ ESTADOS DE CONECTIVIDAD
  const [connectivity, setConnectivity] = useState({
    isOnline: navigator.onLine, // Conexión a internet
    isBackendOnline: null, // Conexión al backend (null = no verificado aún)
    lastCheck: null,
    lastError: null,
    responseTime: null,
    apiStatus: 'unknown' // 'unknown', 'checking', 'connected', 'error'
  });

  // ✅ REFS PARA CONTROL DE PROCESOS
  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef(null);

  // ✅ VERIFICAR CONFIGURACIÓN
  const checkConfiguration = useCallback(() => {
    try {
      const isValid = validateConfig();
      const currentEnv = getCurrentEnvironment();
      const config = getCurrentConfig();

      setEnvironment(currentEnv);
      setIsConfigured(isValid);

      if (!isValid) {
        setConfigErrors(['Configuration validation failed']);
      } else {
        setConfigErrors([]);
      }

      if (DEBUG_CONFIG.ENABLED) {
        console.log('⚙️ Configuration check:', {
          isValid,
          environment: currentEnv,
          apiUrl: API_CONFIG.BASE_URL
        });
      }

      return { isValid, environment: currentEnv, config };
    } catch (error) {
      console.error('❌ Error checking configuration:', error);
      setIsConfigured(false);
      setConfigErrors([error.message]);
      return { isValid: false, error };
    }
  }, []);

  // ✅ VERIFICAR CONECTIVIDAD AL BACKEND (FUNCIÓN PRINCIPAL)
  const checkBackendConnectivity = useCallback(async (force = false) => {
    // Evitar múltiples verificaciones simultáneas
    if (isCheckingRef.current && !force) {
      return connectivity.isBackendOnline;
    }

    isCheckingRef.current = true;
    const startTime = Date.now();

    // Actualizar estado a "checking"
    setConnectivity(prev => ({
      ...prev,
      apiStatus: 'checking'
    }));

    try {
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();

      if (DEBUG_CONFIG.ENABLED) {
        console.log('🔄 Checking backend connectivity...');
      }

      // Endpoint para verificar conectividad
      const checkUrl = `${API_ENDPOINTS.HEALTH}`;
      
      // Hacer el request con timeout
      const response = await fetch(checkUrl, {
        method: 'GET',
        headers: API_CONFIG.DEFAULT_HEADERS,
        signal: abortControllerRef.current.signal,
        cache: 'no-cache'
      });

      // Implementar timeout manual
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      });

      // Competir entre la respuesta y el timeout
      await Promise.race([
        response.ok ? Promise.resolve() : Promise.reject(new Error(`HTTP ${response.status}`)),
        timeoutPromise
      ]);

      const responseTime = Date.now() - startTime;

      if (DEBUG_CONFIG.ENABLED) {
        console.log('✅ Backend connectivity check successful', {
          responseTime: `${responseTime}ms`,
          status: response.status,
          url: checkUrl
        });
      }

      setConnectivity(prev => ({
        ...prev,
        isBackendOnline: true,
        lastCheck: new Date(),
        lastError: null,
        responseTime,
        apiStatus: 'connected'
      }));

      return true;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // No loggear errores de AbortError (cancelaciones)
      if (error.name !== 'AbortError') {
        if (DEBUG_CONFIG.ENABLED) {
          console.log('❌ Backend connectivity check failed:', {
            error: error.message,
            responseTime: `${responseTime}ms`,
            url: `${API_ENDPOINTS.PING}"+10`
          });
        }
      }

      setConnectivity(prev => ({
        ...prev,
        isBackendOnline: false,
        lastCheck: new Date(),
        lastError: error.message,
        responseTime,
        apiStatus: 'error'
      }));

      return false;

    } finally {
      isCheckingRef.current = false;
    }
  }, [timeout, connectivity.isBackendOnline]);

  // ✅ MANEJAR CAMBIOS EN LA CONECTIVIDAD DE INTERNET
  const handleOnlineChange = useCallback(() => {
    const isOnline = navigator.onLine;
    
    if (DEBUG_CONFIG.ENABLED) {
      console.log(`🌐 Internet connectivity changed: ${isOnline ? 'online' : 'offline'}`);
    }

    setConnectivity(prev => ({
      ...prev,
      isOnline
    }));

    // Si volvemos a estar online, verificar backend inmediatamente
    if (isOnline) {
      setTimeout(() => checkBackendConnectivity(true), CONNECTIVITY_CONFIG.CHECK_BACKEND_TIMEOUT);
    } else {
      // Si no hay internet, definitivamente no hay backend
      setConnectivity(prev => ({
        ...prev,
        isBackendOnline: false,
        lastError: 'Sin conexión a internet',
        apiStatus: 'error'
      }));
    }
  }, [checkBackendConnectivity]);

  // ✅ MANEJAR CAMBIOS DE VISIBILIDAD DE LA PÁGINA
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && checkOnVisibilityChange) {
      if (DEBUG_CONFIG.ENABLED) {
        console.log('👁️ Page became visible, checking connectivity...');
      }
      setTimeout(() => checkBackendConnectivity(true), CONNECTIVITY_CONFIG.CHECK_BACKEND_TIMEOUT);
    }
  }, [checkBackendConnectivity, checkOnVisibilityChange]);

  // ✅ MANEJAR ENFOQUE DE LA VENTANA
  const handleWindowFocus = useCallback(() => {
    if (checkOnFocus) {
      if (DEBUG_CONFIG.ENABLED) {
        console.log('🎯 Window focused, checking connectivity...');
      }
      setTimeout(() => checkBackendConnectivity(true), CONNECTIVITY_CONFIG.CHECK_BACKEND_TIMEOUT);
    }
  }, [checkBackendConnectivity, checkOnFocus]);

  // ✅ OBTENER INFORMACIÓN COMPLETA DE LA CONFIGURACIÓN
  const getConfigInfo = useCallback(() => {
    return {
      environment: getCurrentEnvironment(),
      config: getCurrentConfig(),
      apiConfig: API_CONFIG,
      debugConfig: DEBUG_CONFIG,
      connectivity,
      envVars: {
        VITE_PROFILE: import.meta.env.VITE_PROFILE,
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        VITE_API_BASE_URL_ROOT: import.meta.env.VITE_API_BASE_URL_ROOT,
        VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE,
        MODE: import.meta.env.VITE_DEVELOPMENT_API_URL,
        DEV: import.meta.env.VITE_STAGING_API_URL,
        PROD: import.meta.env.VITE_PRODUCTION_API_URL
      }
    };
  }, [connectivity]);

  // ✅ OBTENER DIAGNÓSTICOS COMPLETOS
  const getDiagnostics = useCallback(() => {
    const diagnostics = {
      issues: [],
      warnings: [],
      info: []
    };

    // Verificar variables de entorno críticas
    if (!import.meta.env.VITE_PROFILE) {
      diagnostics.warnings.push('VITE_PROFILE no está definida. Usando detección automática.');
    }

    if (!import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL_ROOT) {
      diagnostics.issues.push('Ninguna URL de API está configurada en variables de entorno.');
    }

    // Verificar configuración del entorno actual
    const currentEnv = getCurrentEnvironment();
    if (!['development', 'staging', 'production'].includes(currentEnv)) {
      diagnostics.warnings.push(`Entorno desconocido: ${currentEnv}`);
    }

    // Verificar URL de API
    if (!API_CONFIG.BASE_URL.startsWith('http')) {
      diagnostics.issues.push('URL de API no válida (debe comenzar con http:// o https://)');
    }

    // Verificar timeout
    if (API_CONFIG.DEFAULT_TIMEOUT < 5000) {
      diagnostics.warnings.push('Timeout muy bajo (menor a 5 segundos)');
    }

    // Verificar conectividad
    if (!connectivity.isOnline) {
      diagnostics.issues.push('Sin conexión a internet');
    } else if (!connectivity.isBackendOnline) {
      diagnostics.issues.push('Sin conexión al backend');
    }

    // Información útil
    diagnostics.info.push(`Entorno actual: ${currentEnv}`);
    diagnostics.info.push(`URL de API: ${API_CONFIG.BASE_URL}`);
    diagnostics.info.push(`Debug habilitado: ${DEBUG_CONFIG.ENABLED ? 'Sí' : 'No'}`);
    diagnostics.info.push(`Estado de conexión: ${getConnectionStatusText()}`);
    
    if (connectivity.responseTime) {
      diagnostics.info.push(`Tiempo de respuesta: ${connectivity.responseTime}ms`);
    }

    return diagnostics;
  }, [connectivity]);

  // ✅ FUNCIÓN PARA REFRESCAR TODO
  const refreshAll = useCallback(async () => {
    if (DEBUG_CONFIG.ENABLED) {
      console.log('🔄 Refreshing all (configuration + connectivity)...');
    }

    const configResult = checkConfiguration();

    if (configResult.isValid) {
      await checkBackendConnectivity(true);
    }

    return configResult;
  }, [checkConfiguration, checkBackendConnectivity]);

  // ✅ FUNCIÓN PARA FORZAR VERIFICACIÓN MANUAL
  const recheckConnectivity = useCallback(() => {
    return checkBackendConnectivity(true);
  }, [checkBackendConnectivity]);

  // ✅ OBTENER TEXTO DEL ESTADO DE CONEXIÓN
  const getConnectionStatusText = useCallback(() => {
    if (!connectivity.isOnline) return 'Sin Internet';
    if (connectivity.apiStatus === 'checking') return 'Verificando...';
    if (connectivity.isBackendOnline === null) return 'No verificado';
    if (connectivity.isBackendOnline) return 'Conectado';
    return 'Servidor desconectado';
  }, [connectivity]);

  // ✅ CONFIGURAR EVENT LISTENERS Y INTERVALOS
  useEffect(() => {
    // Verificación inicial
    refreshAll();

    // Configurar intervalo de verificación
    if (checkInterval > 0) {
      intervalRef.current = setInterval(() => {
        // Solo verificar si la página está visible y hay conexión a internet
        if (!document.hidden && navigator.onLine) {
          checkBackendConnectivity();
        }
      }, checkInterval);
    }

    // Event listeners
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [checkInterval, refreshAll, handleOnlineChange, handleVisibilityChange, handleWindowFocus]);

  // ✅ ESTADOS DERIVADOS PARA FACILITAR EL USO
  const isFullyConnected = connectivity.isOnline && connectivity.isBackendOnline;
  const connectionStatus = !connectivity.isOnline
    ? 'offline'
    : connectivity.apiStatus === 'checking'
      ? 'checking'
      : connectivity.isBackendOnline
        ? 'connected'
        : 'backend-offline';

  return {
    // ✅ ESTADOS DE CONFIGURACIÓN
    isConfigured,
    configErrors,
    environment,

    // ✅ ESTADOS DE CONECTIVIDAD
    ...connectivity,
    
    // ✅ ESTADOS DERIVADOS
    isFullyConnected,
    connectionStatus,
    connectionStatusText: getConnectionStatusText(),

    // ✅ INFORMACIÓN DE CONFIGURACIÓN
    config: API_CONFIG,
    debugEnabled: DEBUG_CONFIG.ENABLED,

    // ✅ MÉTODOS PRINCIPALES
    checkConfiguration,
    checkBackendConnectivity: recheckConnectivity,
    refreshAll,
    getConfigInfo,
    getDiagnostics,

    // ✅ HELPERS
    isProduction: API_CONFIG.IS_PRODUCTION,
    isStaging: API_CONFIG.IS_STAGING,
    isDevelopment: API_CONFIG.IS_DEVELOPMENT,

    // ✅ ESTADOS DE CONECTIVIDAD ESPECÍFICOS
    isApiConnected: connectivity.apiStatus === 'connected',
    isApiChecking: connectivity.apiStatus === 'checking',
    isApiError: connectivity.apiStatus === 'error',

    // ✅ INFORMACIÓN ADICIONAL
    isChecking: isCheckingRef.current,
    lastErrorMessage: connectivity.lastError,
    lastCheckTime: connectivity.lastCheck
  };
}

export default useApiConnectivity;