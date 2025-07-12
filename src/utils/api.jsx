// ===============================================
// 🚀 UTILIDADES DE API - CENTRALIZADAS
// ===============================================

import { API_CONFIG, API_ENDPOINTS, DEBUG_CONFIG } from '../config/config.server.jsx';

/**
 * Clase para manejar todas las operaciones de API de manera centralizada
 */
class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
    this.timeout = API_CONFIG.DEFAULT_TIMEOUT;
  }

  /**
   * ✅ Función base para hacer requests HTTP
   */
  async request(url, options = {}) {
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      signal: AbortSignal.timeout(options.timeout || this.timeout),
      ...options
    };

    // Debug logging
    DEBUG_CONFIG.logRequest(url, config);

    try {
      const response = await fetch(url, config);

      DEBUG_CONFIG.logResponse(url, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      DEBUG_CONFIG.logError(url, error);
      throw this.handleError(error, url);
    }
  }

  /**
   * ✅ Manejar errores de manera consistente
   */
  handleError(error, url) {
    let errorMessage = 'Error de conexión con el servidor';

    if (error.name === 'TimeoutError') {
      errorMessage = 'Tiempo de espera agotado. Verifica tu conexión.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'No se puede conectar al servidor. Verifica que esté corriendo.';
    } else if (error.message.includes('HTTP')) {
      errorMessage = `Error del servidor: ${error.message}`;
    }

    return new Error(`${errorMessage} (${url})`);
  }

  // ===============================================
  // 📦 PRODUCTOS
  // ===============================================

  /**
   * Obtener todos los productos con extras y salsas
   */
  async getProducts() {
    const response = await this.request(API_ENDPOINTS.PRODUCTS);
    return response.json();
  }

  /**
   * Obtener producto por ID
   */
  async getProductById(id) {
    const response = await this.request(API_ENDPOINTS.PRODUCT_BY_ID(id));
    return response.json();
  }

  // ===============================================
  // 📋 ÓRDENES
  // ===============================================

  /**
   * Obtener todas las órdenes
   */
  async getOrders() {
    const response = await this.request(API_ENDPOINTS.ORDERS);
    return response.json();
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(id) {
    const response = await this.request(API_ENDPOINTS.ORDER_BY_ID(id));
    return response.json();
  }

    /**
     * Obtener ordenes por fecha
     */
    async getOrdersByDate(date) {
      const response = await this.request(API_ENDPOINTS.ORDERS_BY_DATE(date));
      return response.json();
    }

    /**
     * Obtener ordenes por periodo de días
     */
    async getOrdersByPeriod(start, end) {
      const response = await this.request(API_ENDPOINTS.ORDERS_BY_PERIOD(start, end));
      return response.json();
    }

    /**
     * Obtener ordenes agrupadas por estatus
     */
    async getOrdersGroupedByStatus() {
      const response = await this.request(API_ENDPOINTS.ORDERS_GROUP_BY_STATUS);
      return response.json();
    }

    /**
     * Obtener ordenes agrupadas por estatus
     */
    async nextStatus(id, status) {
      const response = await this.request(API_ENDPOINTS.ORDERS_NEXT_STATUS(id), {
        method: 'PUT',
        body: JSON.stringify({status:status})
      });
      return;
    }

  /**
   * Crear nueva orden
   */
  async createOrder(orderData) {
    const response = await this.request(API_ENDPOINTS.ORDERS, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    return response.json();
  }

  /**
   * Actualizar orden existente
   */
  async updateOrder(id, orderData) {
    const response = await this.request(API_ENDPOINTS.ORDER_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
    return response.json();
  }

  /**
   * Eliminar orden
   */
  async deleteOrder(id) {
    const response = await this.request(API_ENDPOINTS.ORDER_BY_ID(id), {
      method: 'DELETE'
    });
    return;
  }

  // ===============================================
  // 🏷️ CATÁLOGOS
  // ===============================================

  /**
   * Obtener todos los extras
   */
  async getExtras() {
    const response = await this.request(API_ENDPOINTS.EXTRAS);
    return response.json();
  }

  /**
   * Obtener todas las salsas
   */
  async getSauces() {
    const response = await this.request(API_ENDPOINTS.SAUCES);
    return response.json();
  }

  /**
   * Obtener sabores por id de producto
   */
  async getFlavorsByIdProduct(id) {
    const response = await this.request(API_ENDPOINTS.FLAVORS_BY_ID(id));
    return response.json();
  }

   /**
   * Obtener variantes por id de producto
   */
  async getVariantsByIdProduct(id) {
    const response = await this.request(API_ENDPOINTS.VARIANTS_BY_ID(id));
    return response.json();
  }

  /**
   * Obtener todos los sabores
   */
  async getFlavors() {
    const response = await this.request(API_ENDPOINTS.FLAVORS);
    return response.json();
  }

  /**
   * Obtener métodos de pago
   */
  async getPaymentMethods() {
    const response = await this.request(API_ENDPOINTS.PAYMENT_METHODS);
    return response.json();
  }

  /**
   * Cargar todos los catálogos de una vez
   */
  async loadCatalogs() {
    try {
      const [extrasRes, saucesRes, flavorsRes, paymentsRes] = await Promise.allSettled([
        this.request(API_ENDPOINTS.EXTRAS),
        this.request(API_ENDPOINTS.SAUCES),
        this.request(API_ENDPOINTS.FLAVORS),
        this.request(API_ENDPOINTS.PAYMENT_METHODS)
      ]);

      const catalogs = {
        extras: [],
        sauces: [],
        flavors: [],
        paymentMethods: []
      };

      if (extrasRes.status === 'fulfilled') {
        catalogs.extras = await extrasRes.value.json();
      }

      if (saucesRes.status === 'fulfilled') {
        catalogs.sauces = await saucesRes.value.json();
      }

      if (flavorsRes.status === 'fulfilled') {
        catalogs.flavors = await flavorsRes.value.json();
      }

      if (paymentsRes.status === 'fulfilled') {
        catalogs.paymentMethods = await paymentsRes.value.json();
      }

      return catalogs;
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
      throw error;
    }
  }

  // ===============================================
  // 📊 MÉTRICAS Y REPORTES
  // ===============================================

  /**
   * Obtener ganancias diarias
   */
  async getDailyEarnings(days = null) {
    const response = await this.request(API_ENDPOINTS.DAILY_EARNINGS(days));
    return response.json();
  }

  /**
   * Obtener ganancias con porcentaje
   */
  async getEarningsWithPercentage(percentage) {
    const response = await this.request(API_ENDPOINTS.EARNINGS_WITH_PERCENTAGE(percentage));
    return response.json();
  }

  /**
   * Obtener reporte de ventas
   */
  async getSalesReport(days) {
    const response = await this.request(API_ENDPOINTS.SALES_REPORT(days));
    return response.json();
  }

  // ===============================================
  // 🔧 UTILIDADES
  // ===============================================

  /**
   * Verificar salud de la API
   */
  async checkHealth() {
    try {
       const response = await this.request(API_ENDPOINTS.PING);
       return response.json();
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener configuración actual
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: this.defaultHeaders
    };
  }
}

// ===============================================
// 🎯 INSTANCIA SINGLETON
// ===============================================

// ✅ CREAR UNA INSTANCIA ÚNICA DEL SERVICIO
const apiService = new ApiService();

// ===============================================
// 🔄 FUNCIONES DE CONVENIENCIA (EXPORTS INDIVIDUALES)
// ===============================================

// ✅ PRODUCTOS
export const getProducts = async () => {
  try {
    return await apiService.getProducts();
  } catch (error) {
    console.error('❌ Error in getProducts:', error);
    throw error;
  }
};

export const getImageById = (id) => {
  try {
    return API_ENDPOINTS.IMAGE_BY_ID(id);
  } catch (error) {
    console.error('❌ Error in getImageById:', error);
    throw error;
  }
};

// ✅ ÓRDENES
export const getOrders = async () => {
  try {
    return await apiService.getOrders();
  } catch (error) {
    console.error('❌ Error in getOrders:', error);
    throw error;
  }
};

export const getOrderById = async (id) => {
  try {
    return await apiService.getOrderById(id);
  } catch (error) {
    console.error('❌ Error in getOrderById:', error);
    throw error;
  }
};

export const getOrdersByDate = async (date) => {
  try {
    return await apiService.getOrdersByDate(date);
  } catch (error) {
    console.error('❌ Error in getOrdersByDate:', error);
    throw error;
  }
};

export const getOrdersByPeriod = async (start, end) => {
  try {
    return await apiService.getOrdersByPeriod(start, end);
  } catch (error) {
    console.error('❌ Error in getOrdersByPeriod:', error);
    throw error;
  }
};

export const getOrdersGroupedByStatus = async () => {
  try {
    return await apiService.getOrdersGroupedByStatus();
  } catch (error) {
    console.error('❌ Error in getOrdersByPeriod:', error);
    throw error;
  }
};

export const nextStatus = async (id, status) => {
  try {
    return await apiService.nextStatus(id, status);
  } catch (error) {
    console.error('❌ Error in getOrdersByPeriod:', error);
    throw error;
  }
};

export const createOrder = async (data) => {
  try {
    return await apiService.createOrder(data);
  } catch (error) {
    console.error('❌ Error in createOrder:', error);
    throw error;
  }
};

export const updateOrder = async (id, data) => {
  try {
    return await apiService.updateOrder(id, data);
  } catch (error) {
    console.error('❌ Error in updateOrder:', error);
    throw error;
  }
};

export const deleteOrder = async (id) => {
  try {
    return await apiService.deleteOrder(id);
  } catch (error) {
    console.error('❌ Error in deleteOrder:', error);
    throw error;
  }
};

// ✅ CATÁLOGOS
export const getExtras = async () => {
  try {
    return await apiService.getExtras();
  } catch (error) {
    console.error('❌ Error in getExtras:', error);
    throw error;
  }
};

export const getSauces = async () => {
  try {
    return await apiService.getSauces();
  } catch (error) {
    console.error('❌ Error in getSauces:', error);
    throw error;
  }
};

export const getFlavorsByIdProduct = async (id) => {
  try {
    return await apiService.getFlavorsByIdProduct(id);
  } catch (error) {
    console.error('❌ Error in getFlavorsByIdProduct:', error);
    throw error;
  }
};

export const getVariantsByIdProduct = async (id) => {
  try {
    return await apiService.getVariantsByIdProduct(id);
  } catch (error) {
    console.error('❌ Error in getVariantsByIdProduct:', error);
    throw error;
  }
};

export const getFlavors = async () => {
  try {
    return await apiService.getFlavors();
  } catch (error) {
    console.error('❌ Error in getFlavors:', error);
    throw error;
  }
};

export const getPaymentMethods = async () => {
  try {
    return await apiService.getPaymentMethods();
  } catch (error) {
    console.error('❌ Error in getPaymentMethods:', error);
    throw error;
  }
};

export const loadCatalogs = async () => {
  try {
    return await apiService.loadCatalogs();
  } catch (error) {
    console.error('❌ Error in loadCatalogs:', error);
    throw error;
  }
};

// ✅ MÉTRICAS
export const getDailyEarnings = async (days) => {
  try {
    return await apiService.getDailyEarnings(days);
  } catch (error) {
    console.error('❌ Error in getDailyEarnings:', error);
    throw error;
  }
};

export const getEarningsWithPercentage = async (percentage) => {
  try {
    return await apiService.getEarningsWithPercentage(percentage);
  } catch (error) {
    console.error('❌ Error in getEarningsWithPercentage:', error);
    throw error;
  }
};

export const getSalesReport = async (days) => {
  try {
    return await apiService.getSalesReport(days);
  } catch (error) {
    console.error('❌ Error in getSalesReport:', error);
    throw error;
  }
};

// ✅ UTILIDADES
export const checkApiHealth = async () => {
  try {
    return await apiService.checkHealth();
  } catch (error) {
    console.error('❌ Error in checkApiHealth:', error);
    return false;
  }
};

// ===============================================
// 📤 EXPORT DEFAULT
// ===============================================

export default apiService;