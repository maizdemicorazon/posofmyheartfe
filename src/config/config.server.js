// ===============================================
// 🔧 CONFIGURACIÓN DE API - CENTRALIZADA
// ===============================================

/**
 * Configuración base de la API
 * Centraliza todas las URLs y configuraciones de endpoints
 */

// ✅ HOST BASE - Se puede cambiar según el entorno
const getApiContextUrl = () => {
  // Prioridad: Variable de entorno -> localhost por defecto
  return import.meta.env.VITE_API_BASE_URL_ROOT;
};

// ✅ HOST BASE - Se puede cambiar según el entorno
const getApiBaseUrl = () => {
  // Prioridad: Variable de entorno -> localhost por defecto
  return import.meta.env.VITE_API_BASE_URL;
};

// ✅ CONFIGURACIÓN PRINCIPAL
export const API_CONFIG = {
  // URL base de la API
  BASE_URL: getApiBaseUrl(),
  BASE_URL_ROOT: getApiContextUrl(),

  // Timeout por defecto para todas las requests (15 segundos)
  DEFAULT_TIMEOUT: 15000,

  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // Configuración de reintentos
  RETRY_CONFIG: {
    maxRetries: 3,
    retryDelay: 1000, // 1 segundo
  }
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

// ✅ CONFIGURACIONES POR ENTORNO
export const ENVIRONMENT_CONFIG = {
  development: {
    API_BASE_URL: 'http://localhost:8081/api',
    DEBUG_MODE: true,
    TIMEOUT: 15000,
  },
  production: {
    API_BASE_URL: 'https://posofmyheart.up.railway.app/api', // Cambiar por tu URL de producción
    DEBUG_MODE: false,
    TIMEOUT: 10000,
  },
  staging: {
    API_BASE_URL: 'https://posofmyheartfe-develop.up.railway.app/api', // Cambiar por tu URL de staging
    DEBUG_MODE: true,
    TIMEOUT: 12000,
  }
};

// ✅ DETECTAR ENTORNO ACTUAL
export const getCurrentEnvironment = () => {
  return import.meta.env.MODE || 'development';
};

// ✅ OBTENER CONFIGURACIÓN DEL ENTORNO ACTUAL
export const getCurrentConfig = () => {
  const env = getCurrentEnvironment();
  return ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
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
  ENABLED: getCurrentConfig().DEBUG_MODE,

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
  }
};

export default {
  API_CONFIG,
  API_ENDPOINTS,
  ENVIRONMENT_CONFIG,
  getCurrentEnvironment,
  getCurrentConfig,
  buildApiUrl,
  DEBUG_CONFIG
};