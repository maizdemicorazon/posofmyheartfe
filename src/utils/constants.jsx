// src/utils/constants.js

// ✅ CONSTANTES DE MÉTODOS DE PAGO
export const PAYMENT_METHODS = {
  EFECTIVO: 'efectivo',
  TB: 'tarjeta',
  CLABE: 'transferencia',
  QR: 'qr',
  LINK: 'link'
};

// ✅ MAPEO DE IDS DE MÉTODOS DE PAGO
export const PAYMENT_METHOD_IDS = {
  EFECTIVO: 1,
  TARJETA: 2,
  TRANSFERENCIA: 3,
  QR: 4,
  LINK: 5
};

// ✅ ICONOS PARA MÉTODOS DE PAGO
export const PAYMENT_METHOD_ICONS = {
  [PAYMENT_METHOD_IDS.EFECTIVO]: 'CurrencyDollarIcon',
  [PAYMENT_METHOD_IDS.TARJETA]: 'CreditCardIcon',
  [PAYMENT_METHOD_IDS.TRANSFERENCIA]: 'BanknotesIcon',
  [PAYMENT_METHOD_IDS.QR]: 'QrCodeIcon',
  [PAYMENT_METHOD_IDS.LINK]: 'LinkIcon'
};

// ✅ CONSTANTES DE CATEGORÍAS
export const CATEGORIES = {
  ALL: null,
  ESQUITES: 1,
  ELOTES: 2,
  BEBIDAS: 3,
  ESPECIALES: 4,
  ANTOJITOS: 5
};

// ✅ NOMBRES DE CATEGORÍAS
export const CATEGORY_NAMES = {
  [CATEGORIES.ALL]: 'Todos',
  [CATEGORIES.ESQUITES]: 'Esquites',
  [CATEGORIES.ELOTES]: 'Elotes',
  [CATEGORIES.BEBIDAS]: 'Bebidas',
  [CATEGORIES.ESPECIALES]: 'Especiales',
  [CATEGORIES.ANTOJITOS]: 'Antojitos'
};

// ✅ CONSTANTES DE ESTADO DE ÓRDENES
export const ORDER_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// ✅ COLORES PARA ESTADOS DE ÓRDENES
export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'yellow',
  [ORDER_STATUS.PREPARING]: 'blue',
  [ORDER_STATUS.READY]: 'green',
  [ORDER_STATUS.DELIVERED]: 'gray',
  [ORDER_STATUS.CANCELLED]: 'red'
};

// ✅ CONSTANTES DE FILTROS DE TIEMPO
export const TIME_FILTERS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
  ALL: 'all',
  CUSTOM: 'custom'
};

// ✅ CONSTANTES DE ORDENAMIENTO
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  HIGHEST: 'highest',
  LOWEST: 'lowest',
  CLIENT: 'client',
  STATUS: 'status'
};

// ✅ CONFIGURACIÓN DE PAGINACIÓN
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
  MAX_VISIBLE_PAGES: 5
};

// ✅ CONFIGURACIÓN DE IMÁGENES
export const IMAGE_CONFIG = {
  PLACEHOLDER_SIZE: 400,
  THUMBNAIL_SIZE: 150,
  MEDIUM_SIZE: 300,
  LARGE_SIZE: 600,
  DEFAULT_QUALITY: 85,
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'gif']
};

// ✅ CONFIGURACIÓN DE TEMAS
export const THEME_CONFIG = {
  LIGHT: 'light',
  DARK: 'dark',
  STORAGE_KEY: 'theme'
};

// ✅ CONFIGURACIÓN DE MENSAJES
export const MESSAGE_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// ✅ CONFIGURACIÓN DE BREAKPOINTS (Tailwind CSS)
export const BREAKPOINTS = {
  XS: 475,
  SM: 580,
  MD: 768,
  LG: 1024
};

// ✅ CONFIGURACIÓN DE LA API
export const API_ENDPOINTS = {
  PRODUCTS: '/products',
  ORDERS: '/orders',
  CATEGORIES: '/categories',
  EXTRAS: '/extras',
  SAUCES: '/sauces',
  PAYMENT_METHODS: '/payment-methods',
  EARNINGS: '/earnings',
  REPORTS: '/reports'
};

// ✅ CONFIGURACIÓN DE ERRORES
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN'
};

// ✅ MENSAJES DE ERROR LOCALIZADOS
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Error de conexión. Verifica tu conexión a internet.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Tiempo de espera agotado. Inténtalo de nuevo.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Los datos proporcionados no son válidos.',
  [ERROR_CODES.SERVER_ERROR]: 'Error interno del servidor. Contacta al administrador.',
  [ERROR_CODES.NOT_FOUND]: 'El recurso solicitado no fue encontrado.',
  [ERROR_CODES.UNAUTHORIZED]: 'No tienes autorización para realizar esta acción.',
  [ERROR_CODES.FORBIDDEN]: 'Acceso denegado a este recurso.'
};

// ✅ CONFIGURACIÓN DEL NEGOCIO
export const BUSINESS_CONFIG = {
  NAME: 'MAÍZ DE MI CORAZÓN',
  SLOGAN: 'Calidad, servicio e higiene a toda maíz',
  CURRENCY: 'MXN',
  CURRENCY_SYMBOL: '$',
  TIMEZONE: 'America/Mexico_City',
  LOCALE: 'es-MX'
};

// ✅ CONFIGURACIÓN DE FORMATO
export const FORMAT_CONFIG = {
  DATE_FORMAT: 'dd/MM/yyyy',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'dd/MM/yyyy HH:mm',
  CURRENCY_FORMAT: {
    style: 'currency',
    currency: BUSINESS_CONFIG.CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  },
  NUMBER_FORMAT: {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }
};

// ✅ CONFIGURACIÓN DE VALIDACIÓN
export const VALIDATION_CONFIG = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 100,
  MIN_PRICE: 0.01,
  MAX_PRICE: 99999.99,
  MAX_COMMENT_LENGTH: 500,
  MAX_CLIENT_NAME_LENGTH: 100,
  MIN_CLIENT_NAME_LENGTH: 1
};

// ✅ CONFIGURACIÓN DE CACHE
export const CACHE_CONFIG = {
  PRODUCTS_TTL: 5 * 60 * 1000, // 5 minutos
  ORDERS_TTL: 1 * 60 * 1000,   // 1 minuto
  METRICS_TTL: 2 * 60 * 1000,  // 2 minutos
  STATIC_TTL: 30 * 60 * 1000   // 30 minutos
};

// ✅ CONFIGURACIÓN DE NOTIFICACIONES
export const NOTIFICATION_CONFIG = {
  DEFAULT_DURATION: 3000,
  SUCCESS_DURATION: 2000,
  ERROR_DURATION: 5000,
  WARNING_DURATION: 4000,
  INFO_DURATION: 3000
};

// ✅ CONFIGURACIÓN DE MODALES
export const MODAL_CONFIG = {
  OVERLAY_OPACITY: 0.5,
  ANIMATION_DURATION: 300,
  BACKDROP_BLUR: true,
  CLOSE_ON_OVERLAY_CLICK: true,
  CLOSE_ON_ESC: true
};

// ✅ CONFIGURACIÓN DE FORMULARIOS
export const FORM_CONFIG = {
  DEBOUNCE_DELAY: 300,
  AUTO_SAVE_DELAY: 1000,
  VALIDATION_DELAY: 500
};

export const CONNECTIVITY_CONFIG = {
  INTERVAL: 600000, // 10 min
  TIMEOUT: 10000, // 10 segundos
  CHECK_ON_FOCUS: false,
  CHECK_ON_VISIBILITY_CHANGE: true,
  CHECK_BACKEND_TIMEOUT: 1000
};

export default {
  PAYMENT_METHODS,
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_ICONS,
  CATEGORIES,
  CATEGORY_NAMES,
  ORDER_STATUS,
  ORDER_STATUS_COLORS,
  TIME_FILTERS,
  SORT_OPTIONS,
  PAGINATION,
  IMAGE_CONFIG,
  THEME_CONFIG,
  MESSAGE_TYPES,
  API_ENDPOINTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  BUSINESS_CONFIG,
  FORMAT_CONFIG,
  VALIDATION_CONFIG,
  CACHE_CONFIG,
  NOTIFICATION_CONFIG,
  MODAL_CONFIG,
  FORM_CONFIG,
  CONNECTIVITY_CONFIG
};