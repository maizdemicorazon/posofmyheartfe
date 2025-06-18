/**
 * 🛠️ UTILIDADES Y HELPERS PARA EL PROYECTO POS
 * Archivo: src/utils/helpers.js
 */

// ======================================
// 🔗 API UTILITIES
// ======================================

/**
 * Configuración base para requests de API
 */
export const API_CONFIG = {
  baseURL: 'http://localhost:8081/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
};

/**
 * Clase de error personalizada para APIs
 */
export class APIError extends Error {
  constructor(message, status = null, endpoint = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.endpoint = endpoint;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Clase de error personalizada para validación
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Wrapper para fetch con configuración predeterminada y manejo de errores
 * @param {string} endpoint - Endpoint de la API
 * @param {object} options - Opciones del fetch
 * @returns {Promise} Promesa del fetch
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.baseURL}${endpoint}`;

  const config = {
    method: 'GET',
    headers: API_CONFIG.headers,
    signal: AbortSignal.timeout(API_CONFIG.timeout),
    ...options
  };

  console.log(`📡 API Request: ${config.method} ${url}`);

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new APIError(`HTTP error! status: ${response.status} - ${response.statusText}`, response.status);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${config.method} ${url}`, data);

    return data;
  } catch (error) {
    console.error(`❌ API Error: ${config.method} ${url}`, error);
    throw error;
  }
};

/**
 * Maneja errores de API de manera uniforme
 * @param {Error} error - Error capturado
 * @returns {object} Objeto con mensaje de error formateado
 */
export const handleApiError = (error) => {
  let message = 'Error de conexión';
  let type = 'error';
  let canRetry = true;

  if (error instanceof APIError) {
    switch (error.status) {
      case 400:
        message = 'Datos inválidos enviados al servidor';
        canRetry = false;
        break;
      case 401:
        message = 'No autorizado. Verifica tus credenciales';
        canRetry = false;
        break;
      case 403:
        message = 'Acceso denegado';
        canRetry = false;
        break;
      case 404:
        message = 'Recurso no encontrado';
        canRetry = false;
        break;
      case 500:
        message = 'Error interno del servidor';
        break;
      default:
        message = `Error del servidor (${error.status})`;
    }
  } else if (error.name === 'TimeoutError') {
    message = 'Tiempo de espera agotado. Verifica tu conexión.';
    type = 'warning';
  } else if (error.message.includes('Failed to fetch')) {
    message = 'No se puede conectar al servidor. Verifica que esté corriendo.';
    type = 'warning';
  } else if (error.message.includes('CORS')) {
    message = 'Error de CORS. Verifica la configuración del backend.';
    canRetry = false;
  } else if (error instanceof ValidationError) {
    message = error.message;
    type = 'warning';
    canRetry = false;
  }

  return { message, type, canRetry, originalError: error };
};

// ======================================
// 🔄 DATA VALIDATION UTILITIES
// ======================================

/**
 * Valida y limpia datos de catálogos
 * @param {Array} data - Datos a validar
 * @param {string} idField - Campo ID a validar
 * @param {Array} requiredFields - Campos requeridos adicionales
 * @returns {Array} Datos validados y limpios
 */
export const validateCatalogData = (data, idField = 'id', requiredFields = ['name']) => {
  if (!Array.isArray(data)) {
    console.warn('⚠️ validateCatalogData: data is not an array', data);
    return [];
  }

  const validItems = data.filter(item => {
    // Verificar que el item existe
    if (!item || typeof item !== 'object') {
      return false;
    }

    // Verificar ID válido
    if (item[idField] === undefined || item[idField] === null) {
      return false;
    }

    // Verificar campos requeridos
    for (const field of requiredFields) {
      if (!item[field] || typeof item[field] !== 'string' || item[field].trim() === '') {
        return false;
      }
    }

    return true;
  });

  const invalidCount = data.length - validItems.length;
  if (invalidCount > 0) {
    console.warn(`⚠️ Removed ${invalidCount} invalid items from catalog data`);
  }

  return validItems;
};

/**
 * Valida nombre de cliente
 * @param {string} name - Nombre a validar
 * @returns {object} Resultado de validación
 */
export const validateClientName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      message: 'El nombre es requerido'
    };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return {
      isValid: false,
      message: 'El nombre debe tener al menos 2 caracteres'
    };
  }

  if (trimmedName.length > 50) {
    return {
      isValid: false,
      message: 'El nombre no puede tener más de 50 caracteres'
    };
  }

  return { isValid: true, message: '', value: trimmedName };
};

/**
 * Valida cantidad de extra
 * @param {number} quantity - Cantidad a validar
 * @returns {object} Resultado de validación
 */
export const validateExtraQuantity = (quantity) => {
  const qty = Number(quantity);

  if (!qty || qty < 1) {
    return {
      isValid: false,
      message: '¡Debes agregar al menos 1 extra!'
    };
  }

  if (qty > 10) {
    return {
      isValid: false,
      message: '¡Máximo 10 extras por producto!'
    };
  }

  return { isValid: true, message: '', value: qty };
};

/**
 * Valida datos de orden antes de enviar al API
 * @param {object} orderData - Datos de la orden
 * @returns {object} Resultado de validación
 */
export const validateOrderData = (orderData) => {
  const errors = {};

  // Validar método de pago
  if (!orderData.id_payment_method) {
    errors.payment_method = 'Método de pago es requerido';
  }

  // Validar items
  if (!orderData.updated_items || !Array.isArray(orderData.updated_items) || orderData.updated_items.length === 0) {
    errors.items = 'La orden debe tener al menos un producto';
  } else {
    // Validar cada item
    orderData.updated_items.forEach((item, index) => {
      if (!item.id_order_detail) {
        errors[`item_${index}_detail`] = `Item ${index + 1}: ID de detalle requerido`;
      }
      if (!item.id_product) {
        errors[`item_${index}_product`] = `Item ${index + 1}: ID de producto requerido`;
      }
      if (!item.id_variant) {
        errors[`item_${index}_variant`] = `Item ${index + 1}: ID de variante requerido`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: errors
  };
};

// ======================================
// 🖼️ IMAGE UTILITIES
// ======================================

/**
 * Optimiza URLs de imágenes de Google Drive
 * @param {string} imageUrl - URL original de la imagen
 * @param {number} size - Tamaño deseado (default: 300)
 * @returns {string|null} URL optimizada o null
 */
export const optimizeGoogleDriveImageUrl = (imageUrl, size = 300) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  // Si no es una URL de Google Drive, retornar tal como está
  if (!imageUrl.includes('drive.google.com')) {
    return imageUrl;
  }

  try {
    // Extraer el ID del archivo de diferentes formatos de URL
    let fileId = null;

    // Formato: https://drive.google.com/file/d/FILE_ID/view
    if (imageUrl.includes('/file/d/')) {
      const match = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      fileId = match?.[1];
    }
    // Formato: https://drive.google.com/thumbnail?id=FILE_ID
    else if (imageUrl.includes('thumbnail?id=')) {
      const match = imageUrl.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/);
      fileId = match?.[1];
    }
    // Formato: https://drive.google.com/open?id=FILE_ID
    else if (imageUrl.includes('open?id=')) {
      const match = imageUrl.match(/open\?id=([a-zA-Z0-9_-]+)/);
      fileId = match?.[1];
    }
    // Formato: ?id=FILE_ID en cualquier URL
    else if (imageUrl.includes('id=')) {
      const match = imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      fileId = match?.[1];
    }

    if (fileId) {
      // Crear URL optimizada para thumbnail con tamaño específico
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}-h${size}-c`;
    }

    console.warn(`⚠️ Could not extract file ID from Google Drive URL: ${imageUrl}`);
    return imageUrl;

  } catch (error) {
    console.error('❌ Error optimizing Google Drive URL:', error, imageUrl);
    return imageUrl;
  }
};

/**
 * Genera SVG placeholder inline para productos (sin dependencias externas)
 * @param {string} productName - Nombre del producto
 * @param {number} size - Tamaño (default: 200)
 * @param {boolean} isDark - Si usar tema oscuro (default: false)
 * @returns {string} Data URL del SVG
 */
export const generatePlaceholderUrl = (productName, size = 200, isDark = false) => {
  try {
    const cleanName = (productName || 'Producto')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .substring(0, 12)
      .trim();

    // ✅ Colores adaptables al tema
    const backgroundColor = isDark ? '#374151' : '#e5e7eb';
    const textColor = isDark ? '#d1d5db' : '#6b7280';
    const accentColor = isDark ? '#9ca3af' : '#9ca3af';

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}" rx="8"/>
        <circle cx="50%" cy="40%" r="${size/12}" fill="${accentColor}" opacity="0.4"/>
        <text x="50%" y="65%" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.max(10, size/12)}" font-weight="500" fill="${textColor}">
          ${cleanName}
        </text>
      </svg>
    `;

    const encodedSvg = encodeURIComponent(svg.trim());
    return `data:image/svg+xml,${encodedSvg}`;
  } catch (error) {
    console.error('❌ Error generating placeholder SVG:', error);
    // Fallback SVG simple
    const fallbackColor = isDark ? '#374151' : '#e5e7eb';
    const fallbackText = isDark ? '#d1d5db' : '#6b7280';
    const fallbackSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${fallbackColor}" rx="8"/><text x="50%" y="50%" text-anchor="middle" font-family="system-ui" font-size="12" fill="${fallbackText}">Imagen</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(fallbackSvg)}`;
  }
};

// ======================================
// 📅 DATE UTILITIES
// ======================================

/**
 * Formatea fecha para mostrar en UI
 * @param {string} dateString - Fecha en formato ISO
 * @param {object} options - Opciones de formato
 * @returns {string} Fecha formateada
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'Fecha no disponible';

  try {
    const date = new Date(dateString);

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };

    return date.toLocaleString('es-ES', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Fecha inválida';
  }
};

// ======================================
// 🔧 DEBUGGING UTILITIES
// ======================================

/**
 * Logger mejorado para debugging
 * @param {string} category - Categoría del log
 * @param {string} message - Mensaje
 * @param {any} data - Datos adicionales
 */
export const debugLog = (category, message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString().substr(11, 8);
    const emoji = {
      'API': '📡',
      'ERROR': '❌',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'INFO': 'ℹ️',
      'DEBUG': '🔍',
      'CATALOG': '📋',
      'VALIDATION': '🔍'
    }[category] || '📝';

    console.log(`${emoji} [${timestamp}] ${category}: ${message}`, data || '');
  }
};

/**
 * Función para debugging de estructura de datos
 * @param {string} label - Etiqueta descriptiva
 * @param {any} data - Datos a examinar
 */
export const debugDataStructure = (label, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 DEBUG: ${label}`);
    console.log('Type:', typeof data);
    console.log('Is Array:', Array.isArray(data));
    console.log('Length/Keys:', Array.isArray(data) ? data.length : Object.keys(data || {}).length);
    console.log('Data:', data);
    console.groupEnd();
  }
};

// ======================================
// 🎯 CATALOG LOADING UTILITIES
// ======================================

/**
 * Configuración de catálogos disponibles
 */
export const CATALOG_CONFIGS = {
  extras: {
    endpoint: '/extras',
    idField: 'id_extra',
    name: 'Extras'
  },
  sauces: {
    endpoint: '/sauces',
    idField: 'id_sauce',
    name: 'Salsas'
  },
  flavors: {
    endpoint: '/flavors',
    idField: 'id_flavor',
    name: 'Sabores'
  },
  payments: {
    endpoint: '/payments',
    idField: 'id_payment',
    name: 'Métodos de Pago'
  }
};

/**
 * Carga un catálogo específico con manejo de errores
 * @param {string} catalogType - Tipo de catálogo (extras, sauces, etc.)
 * @returns {Promise<Array>} Datos del catálogo
 */
export const loadCatalog = async (catalogType) => {
  const config = CATALOG_CONFIGS[catalogType];

  if (!config) {
    throw new ValidationError(`Tipo de catálogo inválido: ${catalogType}`);
  }

  try {
    debugLog('CATALOG', `Loading ${config.name}...`);

    const data = await apiRequest(config.endpoint);
    const validatedData = validateCatalogData(data, config.idField);

    debugLog('SUCCESS', `${config.name} loaded`, {
      total: data.length,
      valid: validatedData.length
    });

    return validatedData;

  } catch (error) {
    debugLog('ERROR', `Failed to load ${config.name}`, error);
    throw new APIError(`Error cargando ${config.name}: ${error.message}`, error.status, config.endpoint);
  }
};

/**
 * Carga múltiples catálogos de forma paralela
 * @param {Array<string>} catalogTypes - Tipos de catálogos a cargar
 * @returns {Promise<Object>} Objeto con los catálogos cargados
 */
export const loadMultipleCatalogs = async (catalogTypes) => {
  const results = {};
  const errors = {};

  const loadPromises = catalogTypes.map(async (catalogType) => {
    try {
      const data = await loadCatalog(catalogType);
      results[catalogType] = data;
    } catch (error) {
      errors[catalogType] = error;
      results[catalogType] = []; // Array vacío, NO datos hardcodeados
    }
  });

  await Promise.allSettled(loadPromises);

  return {
    data: results,
    errors: errors,
    hasErrors: Object.keys(errors).length > 0
  };
};

// ======================================
// 🚀 PERFORMANCE UTILITIES
// ======================================

/**
 * Debounce function para optimizar performance
 * @param {Function} func - Función a debounce
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función con debounce
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// ======================================
// 📊 EXPORT DEFAULT OBJECT
// ======================================

export default {
  // API utilities
  apiRequest,
  handleApiError,
  APIError,
  ValidationError,

  // Validation utilities
  validateCatalogData,
  validateClientName,
  validateExtraQuantity,
  validateOrderData,

  // Image utilities
  optimizeGoogleDriveImageUrl,
  generatePlaceholderUrl,

  // Date utilities
  formatDate,

  // Debugging
  debugLog,
  debugDataStructure,

  // Catalog utilities
  loadCatalog,
  loadMultipleCatalogs,
  CATALOG_CONFIGS,

  // Performance
  debounce
};