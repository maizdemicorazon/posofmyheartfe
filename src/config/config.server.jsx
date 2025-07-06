// ===============================================
// 🔧 CONFIGURACIÓN DE API - CENTRALIZADA
// ===============================================

/**
 * Configuración base de la API
 * Centraliza todas las URLs y configuraciones de endpoints
 */

// ✅ DETECTAR ENTORNO ACTUAL
export const getCurrentEnvironment = () => {
  // Prioridad: Variable de entorno -> detección automática -> desarrollo por defecto
  const envFromVite = import.meta.env.VITE_ENV_NODE;
  const mode = import.meta.env.MODE; // 'development', 'production', etc.
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;

  console.log('🔍 Environment detection:', {
    VITE_ENV_NODE: envFromVite,
    MODE: mode,
    DEV: isDev,
    PROD: isProd
  });

  // Si está definido explícitamente en .env, usar ese
  if (envFromVite) {
    console.log(`✅ Using environment from VITE_ENV_NODE: ${envFromVite}`);
    return envFromVite;
  }

  // Fallback: detectar por URL o modo
  if (isProd) {
    return 'production';
  } else if (mode === 'staging') {
    return 'staging';
  } else {
    return 'development';
  }
};

// ✅ CONFIGURACIONES POR ENTORNO
export const ENVIRONMENT_CONFIG = {
  development: {
    API_BASE_URL: import.meta.env.VITE_DEVELOPMENT_API_URL || 'http://localhost:8081/api/v1',
    DEBUG_MODE: true,
    TIMEOUT: 15000,
  },
  staging: {
    API_BASE_URL: import.meta.env.VITE_STAGING_API_URL || 'https://posofmyheart-develop.up.railway.app/api/v1',
    DEBUG_MODE: true,
    TIMEOUT: 12000,
  },
  production: {
    API_BASE_URL: import.meta.env.VITE_PRODUCTION_API_URL || 'https://posofmyheart.up.railway.app/api/v1',
    DEBUG_MODE: false,
    TIMEOUT: 10000,
  }
};

// ✅ OBTENER CONFIGURACIÓN DEL ENTORNO ACTUAL
export const getCurrentConfig = () => {
  const env = getCurrentEnvironment();
  console.log(`🎯 Working with environment: ${env}`);

  const config = ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
  console.log(`📋 Environment config:`, config);

  return config;
};

// ✅ OBTENER URL BASE DE LA API
const getApiBaseUrl = () => {
  // Prioridad:
  // 1. Variable directa de entorno VITE_API_BASE_URL
  // 2. Configuración por entorno
  // 3. Fallback a localhost

  const directUrl = import.meta.env.VITE_API_BASE_URL;
  if (directUrl) {
    console.log(`🔗 Using direct API URL: ${directUrl}`);
    return directUrl;
  }

  const config = getCurrentConfig();
  console.log(`🔗 Using environment API URL: ${config.API_BASE_URL}`);
  return config.API_BASE_URL;
};

// ✅ OBTENER URL ROOT DE LA API
const getApiContextUrl = () => {
  const rootUrl = import.meta.env.VITE_API_BASE_URL_ROOT;
  if (rootUrl) {
    console.log(`🏠 Using API root URL: ${rootUrl}`);
    return rootUrl;
  }

  // Fallback: extraer del URL base
  const baseUrl = getApiBaseUrl();
  const rootFromBase = baseUrl.replace(/\/api.*$/, '');
  console.log(`🏠 Extracted API root URL: ${rootFromBase}`);
  return rootFromBase;
};

// ✅ CONFIGURACIÓN PRINCIPAL
export const API_CONFIG = {
  // URL base de la API
  BASE_URL: getApiBaseUrl(),
  BASE_URL_ROOT: getApiContextUrl(),

  // Timeout por defecto para todas las requests
  DEFAULT_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || getCurrentConfig().TIMEOUT,

  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // Configuración de reintentos
  RETRY_CONFIG: {
    maxRetries: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS) || 3,
    retryDelay: 1000, // 1 segundo
  },

  // Información del entorno
  ENVIRONMENT: getCurrentEnvironment(),
  IS_DEVELOPMENT: getCurrentEnvironment() === 'development',
  IS_STAGING: getCurrentEnvironment() === 'staging',
  IS_PRODUCTION: getCurrentEnvironment() === 'production',
};

// ✅ ENDPOINTS ESPECÍFICOS
export const API_ENDPOINTS = {
  // Productos
  PRODUCTS: `${API_CONFIG.BASE_URL}/products`,
  PRODUCT_BY_ID: (id) => `${API_CONFIG.BASE_URL}/products/${id}`,

  // Órdenes
  ORDERS: `${API_CONFIG.BASE_URL}/orders`,
  ORDER_BY_ID: (id) => `${API_CONFIG.BASE_URL}/orders/${id}`,
  ORDERS_BY_DATE: (date) => `${API_CONFIG.BASE_URL}/orders/by-date/${date}`,
  ORDERS_BY_PERIOD: (start, end) => `${API_CONFIG.BASE_URL}/orders/since/${start}/until/${end}`,
  ORDERS_GROUP_BY_STATUS: `${API_CONFIG.BASE_URL}/orders/status/group`,
  ORDERS_NEXT_STATUS: (id, status) => `${API_CONFIG.BASE_URL}/orders/status/${id}`,

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

  //Utils
  PING: `${API_CONFIG.BASE_URL}/flavors`
};

// ✅ FUNCIÓN HELPER PARA CONSTRUIR URLs
export const buildApiUrl = (endpoint, params = {}) => {
  let url = endpoint;

  // Reemplazar parámetros en la URL si existen
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });

  return url;
};

// ✅ CONFIGURACIÓN DE DEBUG
export const DEBUG_CONFIG = {
  ENABLED: import.meta.env.VITE_DEBUG_MODE === 'true' || getCurrentConfig().DEBUG_MODE,
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',

  // Log de requests
  logRequest: (url, options) => {
    if (DEBUG_CONFIG.ENABLED) {
      console.log(`🔍 API Request: ${options?.method || 'GET'} ${url}`, options);
    }
  },

  // Log de responses
  logResponse: (url, response) => {
    if (DEBUG_CONFIG.ENABLED) {
      console.log(`📥 API Response: ${url}`, response);
    }
  },

  // Log de errores
  logError: (url, error) => {
    if (DEBUG_CONFIG.ENABLED) {
      console.error(`❌ API Error: ${url}`, error);
    }
  },

  // Log de configuración
  logConfig: () => {
    if (DEBUG_CONFIG.ENABLED) {
      console.group('⚙️ API Configuration');
      console.log('Environment:', API_CONFIG.ENVIRONMENT);
      console.log('Base URL:', API_CONFIG.BASE_URL);
      console.log('Root URL:', API_CONFIG.BASE_URL_ROOT);
      console.log('Timeout:', API_CONFIG.DEFAULT_TIMEOUT);
      console.log('Debug enabled:', DEBUG_CONFIG.ENABLED);
      console.log('Available env vars:', {
        VITE_ENV_NODE: import.meta.env.VITE_ENV_NODE,
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

// ✅ INICIALIZAR CONFIGURACIÓN AL CARGAR
DEBUG_CONFIG.logConfig();

// ✅ FUNCIÓN PARA VALIDAR CONFIGURACIÓN
export const validateConfig = () => {
  const issues = [];

  if (!API_CONFIG.BASE_URL) {
    issues.push('❌ BASE_URL is not defined');
  }

  if (!API_CONFIG.BASE_URL.startsWith('http')) {
    issues.push('❌ BASE_URL should start with http:// or https://');
  }

  if (API_CONFIG.DEFAULT_TIMEOUT < 5000) {
    issues.push('⚠️ Timeout is very low, consider increasing it');
  }

  if (issues.length > 0) {
    console.warn('🚨 Configuration issues detected:');
    issues.forEach(issue => console.warn(issue));
  } else {
    console.log('✅ Configuration validation passed');
  }

  return issues.length === 0;
};

// ✅ VALIDAR CONFIGURACIÓN AL INICIALIZAR
validateConfig();

export default {
  API_CONFIG,
  API_ENDPOINTS,
  ENVIRONMENT_CONFIG,
  getCurrentEnvironment,
  getCurrentConfig,
  buildApiUrl,
  DEBUG_CONFIG,
  validateConfig
};