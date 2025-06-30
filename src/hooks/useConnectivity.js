// src/hooks/useConnectivity.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_CONFIG } from '../config/config.server';
import { CONNECTIVITY_CONFIG } from '../utils/constants';

/**
 * Hook personalizado para verificar conectividad real al backend
 * @param {Object} options - Configuración del hook
 * @param {number} options.checkInterval - Intervalo de verificación en ms (default: 30000)
 * @param {number} options.timeout - Timeout para requests en ms (default: 5000)
 * @param {boolean} options.checkOnFocus - Verificar al enfocar ventana (default: true)
 * @param {boolean} options.checkOnVisibilityChange - Verificar al cambiar visibilidad (default: true)
 * @returns {Object} Estado de conectividad y funciones
 */
export function useConnectivity({
  checkInterval = CONNECTIVITY_CONFIG.INTERVAL,
  timeout = CONNECTIVITY_CONFIG.TIMEOUT,
  checkOnFocus = CONNECTIVITY_CONFIG.CHECK_ON_FOCUS,
  checkOnVisibilityChange = CONNECTIVITY_CONFIG.CHECK_ON_VISIBILITY_CHANGE
} = {}) {

  const [connectivity, setConnectivity] = useState({
    isOnline: navigator.onLine, // Conexión a internet
    isBackendOnline: null, // Conexión al backend (null = no verificado aún)
    lastCheck: null,
    lastError: null,
    responseTime: null
  });

  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef(null);

  /**
   * Función para verificar la conectividad al backend
   */
  const checkBackendConnectivity = useCallback(async (force = false) => {
    // Evitar múltiples verificaciones simultáneas
    if (isCheckingRef.current && !force) {
      return connectivity.isBackendOnline;
    }

    isCheckingRef.current = true;
    const startTime = Date.now();

    try {
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();

      console.log('🔄 Checking backend connectivity...');

      // Hacer un request ligero al endpoint de health check
      const response = await fetch(`${API_CONFIG.BASE_URL}/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
        // Configuración de timeout manual
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

      console.log('✅ Backend connectivity check successful', {
        responseTime: `${responseTime}ms`,
        status: response.status
      });

      setConnectivity(prev => ({
        ...prev,
        isBackendOnline: true,
        lastCheck: new Date(),
        lastError: null,
        responseTime
      }));

      return true;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // No loggear errores de AbortError (cancelaciones)
      if (error.name !== 'AbortError') {
        console.log('❌ Backend connectivity check failed:', {
          error: error.message,
          responseTime: `${responseTime}ms`
        });
      }

      setConnectivity(prev => ({
        ...prev,
        isBackendOnline: false,
        lastCheck: new Date(),
        lastError: error.message,
        responseTime
      }));

      return false;

    } finally {
      isCheckingRef.current = false;
    }
  }, [timeout, connectivity.isBackendOnline]);

  /**
   * Manejar cambios en la conectividad de internet
   */
  const handleOnlineChange = useCallback(() => {
    const isOnline = navigator.onLine;
    console.log(`🌐 Internet connectivity changed: ${isOnline ? 'online' : 'offline'}`);

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
        lastError: 'Sin conexión a internet'
      }));
    }
  }, [checkBackendConnectivity]);

  /**
   * Manejar cambios de visibilidad de la página
   */
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && checkOnVisibilityChange) {
      console.log('👁️ Page became visible, checking connectivity...');
      setTimeout(() => checkBackendConnectivity(true), CONNECTIVITY_CONFIG.TIMEOUT);
    }
  }, [checkBackendConnectivity, checkOnVisibilityChange]);

  /**
   * Manejar enfoque de la ventana
   */
  const handleWindowFocus = useCallback(() => {
    if (checkOnFocus) {
      console.log('🎯 Window focused, checking connectivity...');
      setTimeout(() => checkBackendConnectivity(true),CONNECTIVITY_CONFIG.CHECK_BACKEND_TIMEOUT);
    }
  }, [checkBackendConnectivity, checkOnFocus]);

  /**CHECK_BACKEND_TIMEOUT
   * Función para forzar verificación manual
   */
  const recheckConnectivity = useCallback(() => {
    return checkBackendConnectivity(true);
  }, [checkBackendConnectivity]);

  // ✅ Configurar event listeners y intervalos
  useEffect(() => {
    // Verificación inicial
    checkBackendConnectivity(true);

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
  }, [checkInterval, checkBackendConnectivity, handleOnlineChange, handleVisibilityChange, handleWindowFocus]);

  // ✅ Estado derivado para facilitar el uso
  const isFullyConnected = connectivity.isOnline && connectivity.isBackendOnline;
  const connectionStatus = !connectivity.isOnline
    ? 'offline'
    : connectivity.isBackendOnline === null
      ? 'checking'
      : connectivity.isBackendOnline
        ? 'connected'
        : 'backend-offline';

  return {
    // Estados básicos
    ...connectivity,

    // Estados derivados
    isFullyConnected,
    connectionStatus,

    // Funciones
    recheckConnectivity,

    // Información adicional
    isChecking: isCheckingRef.current
  };
}

/**
 * Hook simplificado para solo verificar el estado actual
 */
export function useSimpleConnectivity() {
  const { isFullyConnected, connectionStatus, isBackendOnline, isOnline, responseTime } = useConnectivity({
    checkInterval: CONNECTIVITY_CONFIG.INTERVAL,
    timeout: CONNECTIVITY_CONFIG.TIMEOUT
  });

  return {
    isConnected: isFullyConnected,
    status: connectionStatus,
    isBackendOnline,
    isOnline,
    responseTime
  };
}

export default useConnectivity;