// ===============================================
// 🔧 CONFIGURACIÓN UNIFICADA DE API Y CONECTIVIDAD
// ===============================================

/**
 * Configuración centralizada que incluye:
 * - Detección y configuración de entornos
 * - URLs y endpoints de API
 * - Configuración de conectividad
 * - Utilidades de validación y diagnóstico
 * - Configuración de debug y logging
 */

// ===============================================
// 🌍 DETECCIÓN DE ENTORNO
// ===============================================

/**
 * Detecta el entorno actual basado en variables de entorno
 * @returns {string} El entorno actual: 'development', 'staging', 'production'
 */
export const getCurrentEnvironment = () => {
  const envFromVite = import.meta.env.VITE_PROFILE;
  const mode = import.meta.env.MODE;
  const isDev = import.meta.env.VITE_DEVELOPMENT_API_URL;
  const isProd = import.meta.env.VITE_PRODUCTION_API_URL;

  console.log('🔍 Environment detection:', {
    VITE_PROFILE: envFromVite,
    MODE: mode,
    DEV: isDev,
    PROD: isProd
  });

  if (envFromVite) {
    console.log(`✅ Using environment from VITE_PROFILE: ${envFromVite}`);
    return envFromVite;
  }

  if (isProd) {
    return 'production';
  } else if (mode === 'staging') {
    return 'staging';
  } else {
    return 'development';
  }
};

// ===============================================
// ⚙️ CONFIGURACIONES POR ENTORNO
// ===============================================

export const ENVIRONMENT_CONFIG = {
  development: {
    API_BASE_URL: import.meta.env.VITE_DEVELOPMENT_API_URL || 'http://localhost:8081/api/v1',
    DEBUG_MODE: true,
    TIMEOUT: 15000,
    RETRY_ATTEMPTS: 3,
    CHECK_INTERVAL: 300000, // 5 minutos
  },
  staging: {
    API_BASE_URL: import.meta.env.VITE_STAGING_API_URL || 'https://posofmyheart-develop.up.railway.app/api/v1',
    DEBUG_MODE: true,
    TIMEOUT: 12000,
    RETRY_ATTEMPTS: 2,
    CHECK_INTERVAL: 600000, // 10 minutos
  },
  production: {
    API_BASE_URL: import.meta.env.VITE_PRODUCTION_API_URL || 'https://posofmyheart.up.railway.app/api/v1',
    DEBUG_MODE: false,
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 1,
    CHECK_INTERVAL: 900000, // 15 minutos
  }
};

/**
 * Obtiene la configuración del entorno actual
 * @returns {Object} Configuración del entorno
 */
export const getCurrentConfig = () => {
  const env = getCurrentEnvironment();
  console.log(`🎯 Working with environment: ${env}`);

  const config = ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
  console.log(`📋 Environment config:`, config);

  return config;
};

// ===============================================
// 🔗 CONFIGURACIÓN DE URLs
// ===============================================

/**
 * Obtiene la URL base de la API con prioridad de configuraciones
 * @returns {string} URL base de la API
 */
const getApiBaseUrl = () => {
  // Prioridad: Variable directa -> Configuración por entorno -> Fallback
  const directUrl = import.meta.env.VITE_API_BASE_URL;
  if (directUrl) {
    console.log(`🔗 Using direct API URL: ${directUrl}`);
    return directUrl;
  }

  const config = getCurrentConfig();
  if (config.API_BASE_URL) {
    console.log(`🔗 Using environment API URL: ${config.API_BASE_URL}`);
    return config.API_BASE_URL;
  }

  // Fallback
  const fallback = 'http://localhost:8081/api/v1';
  console.warn(`⚠️ Using fallback API URL: ${fallback}`);
  return fallback;
};

/**
 * Obtiene la URL root de la API
 * @returns {string} URL root de la API
 */
const getApiContextUrl = () => {
  const rootUrl = import.meta.env.VITE_API_BASE_URL_ROOT;
  if (rootUrl) {
    console.log(`🏠 Using API root URL: ${rootUrl}`);
    return rootUrl;
  }

  // Extraer del URL base
  const baseUrl = getApiBaseUrl();
  const rootFromBase = baseUrl.replace(/\/api.*$/, '');
  console.log(`🏠 Extracted API root URL: ${rootFromBase}`);
  return rootFromBase;
};

// ===============================================
// 📡 CONFIGURACIÓN PRINCIPAL DE API
// ===============================================

export const API_CONFIG = {
  // URLs
  BASE_URL: getApiBaseUrl(),
  BASE_URL_ROOT: getApiContextUrl(),

  // Timeouts y reintentos
  DEFAULT_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || getCurrentConfig().TIMEOUT,
  RETRY_CONFIG: {
    maxRetries: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS) || getCurrentConfig().RETRY_ATTEMPTS,
    retryDelay: 1000,
  },

  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // Información del entorno
  ENVIRONMENT: getCurrentEnvironment(),
  IS_DEVELOPMENT: getCurrentEnvironment() === 'development',
  IS_STAGING: getCurrentEnvironment() === 'staging',
  IS_PRODUCTION: getCurrentEnvironment() === 'production',
};

// ===============================================
// 🌐 CONFIGURACIÓN DE CONECTIVIDAD
// ===============================================

export const CONNECTIVITY_CONFIG = {
  // Intervalos de verificación (en ms)
  INTERVAL: getCurrentConfig().CHECK_INTERVAL,
  TIMEOUT: 5000, // Timeout específico para verificación de conectividad
  CHECK_BACKEND_TIMEOUT: 500, // Delay antes de verificar backend

  // Opciones de verificación
  CHECK_ON_FOCUS: false,
  CHECK_ON_VISIBILITY_CHANGE: false,

  // Endpoints para verificación
  PING_ENDPOINT: '/ping',
};

// ===============================================
// 🎯 ENDPOINTS DE API
// ===============================================

export const API_ENDPOINTS = {
  IMAGE_BY_ID: (id) => `${API_CONFIG.BASE_URL}/catalogs/images/${id}/view`,

  // Productos
  PRODUCTS: `${API_CONFIG.BASE_URL}/products`,
  PRODUCT_BY_ID: (id) => `${API_CONFIG.BASE_URL}/products/${id}`,

  // Órdenes
  ORDERS: `${API_CONFIG.BASE_URL}/orders`,
  ORDER_BY_ID: (id) => `${API_CONFIG.BASE_URL}/orders/${id}`,
  ORDERS_BY_DATE: (date) => `${API_CONFIG.BASE_URL}/orders/by-date/${date}`,
  ORDERS_BY_PERIOD: (start, end) => `${API_CONFIG.BASE_URL}/orders/since/${start}/until/${end}`,
  ORDERS_GROUP_BY_STATUS: `${API_CONFIG.BASE_URL}/orders/status/group`,
  ORDERS_NEXT_STATUS: (id) => `${API_CONFIG.BASE_URL}/orders/status/${id}`,

  // Catálogos
  EXTRAS: `${API_CONFIG.BASE_URL}/extras`,
  SAUCES: `${API_CONFIG.BASE_URL}/sauces`,
  FLAVORS: `${API_CONFIG.BASE_URL}/flavors`,
  FLAVORS_BY_ID: (id) => `${API_CONFIG.BASE_URL}/products/${id}/flavors`,
  VARIANTS_BY_ID: (id) => `${API_CONFIG.BASE_URL}/products/${id}/variants`,
  PAYMENT_METHODS: `${API_CONFIG.BASE_URL}/payments`,

  // Métricas y reportes
  DAILY_EARNINGS: (days = null) =>
    days ? `${API_CONFIG.BASE_URL}/metrics/daily-earnings/${days}` : `${API_CONFIG.BASE_URL}/metrics/daily-earnings`,
  EARNINGS_WITH_PERCENTAGE: (percentage) =>
    `${API_CONFIG.BASE_URL}/metrics/summary/${percentage}`,
  SALES_REPORT: (days) => `${API_CONFIG.BASE_URL}/reports/sales/${days}`,

  // Utilidades y verificación
  HEALTH: `${API_CONFIG.BASE_URL}${CONNECTIVITY_CONFIG.PING_ENDPOINT}`,
};

// ===============================================
// 🐛 CONFIGURACIÓN DE DEBUG Y LOGGING
// ===============================================

export const DEBUG_CONFIG = {
  ENABLED: import.meta.env.VITE_DEBUG_MODE === 'true' || getCurrentConfig().DEBUG_MODE,
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',

  // Métodos de logging
  logRequest: (url, options) => {
    if (DEBUG_CONFIG.ENABLED) {
      console.log(`🔍 API Request: ${options?.method || 'GET'} ${url}`, options);
    }
  },

  logResponse: (url, response) => {
    if (DEBUG_CONFIG.ENABLED) {
      console.log(`📥 API Response: ${url}`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
    }
  },

  logError: (url, error) => {
    if (DEBUG_CONFIG.ENABLED) {
      console.error(`❌ API Error: ${url}`, error);
    }
  },

  logConnectivity: (status, details) => {
    if (DEBUG_CONFIG.ENABLED) {
      console.log(`🌐 Connectivity: ${status}`, details);
    }
  },

  logConfig: () => {
    if (DEBUG_CONFIG.ENABLED) {
      console.group('⚙️ Unified API Configuration');
      console.log('Environment:', API_CONFIG.ENVIRONMENT);
      console.log('Base URL:', API_CONFIG.BASE_URL);
      console.log('Root URL:', API_CONFIG.BASE_URL_ROOT);
      console.log('Timeout:', API_CONFIG.DEFAULT_TIMEOUT);
      console.log('Debug enabled:', DEBUG_CONFIG.ENABLED);
      console.log('Connectivity check interval:', CONNECTIVITY_CONFIG.INTERVAL);
      console.log('Available env vars:', {
        VITE_PROFILE: import.meta.env.VITE_PROFILE,
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        VITE_API_BASE_URL_ROOT: import.meta.env.VITE_API_BASE_URL_ROOT,
        VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE,
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD
      });
      console.groupEnd();
    }
  }
};

// ===============================================
// 🔍 UTILIDADES DE VALIDACIÓN
// ===============================================

/**
 * Valida la configuración actual
 * @returns {boolean} true si la configuración es válida
 */
export const validateConfig = () => {
  const issues = [];
  const warnings = [];

  // Validaciones críticas
  if (!API_CONFIG.BASE_URL) {
    issues.push('❌ BASE_URL is not defined');
  }

  if (!API_CONFIG.BASE_URL.startsWith('http')) {
    issues.push('❌ BASE_URL should start with http:// or https://');
  }

  // Validaciones de advertencia
  if (API_CONFIG.DEFAULT_TIMEOUT < 5000) {
    warnings.push('⚠️ Timeout is very low, consider increasing it');
  }

  if (!import.meta.env.VITE_PROFILE) {
    warnings.push('⚠️ VITE_PROFILE not defined, using auto-detection');
  }

  // Mostrar resultados
  if (issues.length > 0) {
    console.error('🚨 Configuration issues detected:');
    issues.forEach(issue => console.error(issue));
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    warnings.forEach(warning => console.warn(warning));
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ Configuration validation passed');
  }

  return issues.length === 0;
};

/**
 * Obtiene diagnósticos completos del sistema
 * @returns {Object} Objeto con diagnósticos
 */
export const getDiagnostics = () => {
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

  // Información útil
  diagnostics.info.push(`Entorno actual: ${currentEnv}`);
  diagnostics.info.push(`URL de API: ${API_CONFIG.BASE_URL}`);
  diagnostics.info.push(`Debug habilitado: ${DEBUG_CONFIG.ENABLED ? 'Sí' : 'No'}`);
  diagnostics.info.push(`Timeout: ${API_CONFIG.DEFAULT_TIMEOUT}ms`);
  diagnostics.info.push(`Reintentos máximos: ${API_CONFIG.RETRY_CONFIG.maxRetries}`);

  return diagnostics;
};

// ===============================================
// 🛠️ UTILIDADES AUXILIARES
// ===============================================

/**
 * Construye URLs de API con parámetros
 * @param {string} endpoint - Endpoint base
 * @param {Object} params - Parámetros para reemplazar
 * @returns {string} URL construida
 */
export const buildApiUrl = (endpoint, params = {}) => {
  let url = endpoint;
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });
  return url;
};

/**
 * Obtiene información completa de la configuración
 * @returns {Object} Información completa
 */
export const getConfigInfo = () => {
  return {
    environment: getCurrentEnvironment(),
    config: getCurrentConfig(),
    apiConfig: API_CONFIG,
    connectivityConfig: CONNECTIVITY_CONFIG,
    debugConfig: DEBUG_CONFIG,
    endpoints: API_ENDPOINTS,
    envVars: {
      VITE_PROFILE: import.meta.env.VITE_PROFILE,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_API_BASE_URL_ROOT: import.meta.env.VITE_API_BASE_URL_ROOT,
      VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD
    }
  };
};

/**
 * Verifica la conectividad básica al endpoint de ping
 * @param {number} timeout - Timeout para la verificación
 * @returns {Promise<boolean>} true si está conectado
 */
export const checkBasicConnectivity = async (timeout = CONNECTIVITY_CONFIG.TIMEOUT) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(API_ENDPOINTS.PING, {
      method: 'GET',
      headers: API_CONFIG.DEFAULT_HEADERS,
      signal: controller.signal,
      cache: 'no-cache'
    });

    clearTimeout(timeoutId);

    DEBUG_CONFIG.logConnectivity('Check completed', {
      url: API_ENDPOINTS.PING,
      status: response.status,
      ok: response.ok
    });

    return response.ok;
  } catch (error) {
    DEBUG_CONFIG.logConnectivity('Check failed', {
      url: API_ENDPOINTS.PING,
      error: error.message
    });
    return false;
  }
};

// ===============================================
// 🚀 INICIALIZACIÓN
// ===============================================

// Ejecutar validación y logging inicial
validateConfig();
DEBUG_CONFIG.logConfig();

// ===============================================
// 📤 EXPORTS
// ===============================================

export default {
  // Configuraciones principales
  API_CONFIG,
  API_ENDPOINTS,
  CONNECTIVITY_CONFIG,
  DEBUG_CONFIG,
  ENVIRONMENT_CONFIG,

  // Funciones de detección y configuración
  getCurrentEnvironment,
  getCurrentConfig,

  // Utilidades
  buildApiUrl,
  validateConfig,
  getDiagnostics,
  getConfigInfo,
  checkBasicConnectivity
};