import { useState, useMemo, useEffect, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
  PencilIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
import OrderEditModal from './OrderEditModal';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import { getOrders } from '../../utils/api';

function Orders({ onBack }) {
  console.log('🎯 Orders component rendering...');

  const { setLoading } = useLoading();
  const { setMessage } = useMessage();
  const { theme } = useTheme();

  // Estados existentes
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('today');
  const [sortByDate, setSortByDate] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Nuevos estados para edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);

  console.log('📊 Current state - orders:', orders?.length || 0, 'loading:', isLoadingOrders, 'filter:', filter);

  // ✅ Usar useRef para evitar dobles peticiones
  const hasFetched = useRef(false);
  const isCurrentlyFetching = useRef(false);

  // ✅ FUNCIÓN PARA TRANSFORMAR DATOS DEL BACKEND AL FORMATO ESPERADO
  const transformBackendOrder = (backendOrder) => {
    return {
      // ✅ Mapeo correcto de campos del backend
      id_order: backendOrder.id_order,
      created_at: backendOrder.order_date,           // ✅ order_date → created_at
      total_amount: backendOrder.bill,               // ✅ bill → total_amount
      client_name: backendOrder.client_name || '',
      comment: backendOrder.comment || '',

      // ✅ Transformar payment_method de número a objeto
      payment_method: {
        id_payment_method: backendOrder.payment_method,
        name: backendOrder.payment_name || 'Desconocido'
      },

      // ✅ Mapear items del backend al formato esperado por el frontend
      items: (backendOrder.items || []).map((item, index) => ({
        // Campos básicos del item
        id_order_detail: item.id_order_detail || `temp-${index}`,
        id_product: item.id_product,
        id_variant: item.id_variant,
        quantity: item.quantity || 1,
        unit_price: item.product_price || 0,
        total_price: item.product_price || 0,
        comment: item.comment || '',

        // ✅ Estructura del producto (anidada para compatibilidad)
        product: {
          id_product: item.id_product,
          name: item.product_name,
          image: item.product_image
        },

        // ✅ Estructura de la variante (anidada para compatibilidad)
        variant: {
          id_variant: item.id_variant,
          size: item.variant_name,
          name: item.variant_name
        },

        // ✅ Campos directos para compatibilidad con otros componentes
        product_name: item.product_name,
        product_image: item.product_image,
        variant_name: item.variant_name,

        // ✅ Arrays de modificaciones
        extras: item.extras || [],
        sauces: item.sauces || [],

        // ✅ IMPORTANTE: Manejar sabor como objeto único (no array)
        flavor: item.flavor || null,
        flavors: item.flavor ? [item.flavor] : [] // Para compatibilidad
      }))
    };
  };

  // ✅ Función para obtener órdenes de la API con transformación correcta
  const fetchOrders = async () => {
    console.log('🔍 Iniciando fetchOrders...');
    if (isCurrentlyFetching.current) {
      console.log('🚫 Ya hay una petición en curso, saltando...');
      return;
    }

    isCurrentlyFetching.current = true;
    setIsLoadingOrders(true);

    try {
      console.log('📡 Fetching orders from API...');

      // ✅ USAR NUEVA FUNCIÓN DE API EN LUGAR DE FETCH DIRECTO
      const ordersData = await getOrders();

      console.log('📥 Raw backend data:', ordersData);
      console.log('📊 Orders length:', ordersData?.length || 0);

      if (Array.isArray(ordersData) && ordersData.length >= 0) {
        console.log('✅ Órdenes cargadas exitosamente:', ordersData.length);

        // ✅ Transformar datos usando la función de mapeo correcta
        const transformedOrders = ordersData.map(order => transformBackendOrder(order));

        console.log('✅ Transformed orders:', transformedOrders);
        setOrders(transformedOrders);
        setMessage(null); // Limpiar mensaje de error
        hasFetched.current = true; // ✅ Marcar como cargado exitosamente

      } else {
        console.log('⚠️ No se recibieron órdenes válidas:', ordersData);
        setOrders([]);
        setMessage({ text: 'No se encontraron órdenes', type: 'info' });
      }

    } catch (error) {
      console.error('❌ Error al cargar órdenes:', error);
      hasFetched.current = false; // ✅ Permitir retry en caso de error

      let errorMessage = 'Error al cargar las órdenes.';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Error del servidor: ${error.message}`;
      } else if (error.message.includes('CORS')) {
        errorMessage = 'Error de CORS. Verifica la configuración del backend.';
      }

      setMessage({
        text: errorMessage,
        type: 'error'
      });

      // En caso de error, setear array vacío para evitar problemas de rendering
      setOrders([]);

    } finally {
      setIsLoadingOrders(false);
      isCurrentlyFetching.current = false; // ✅ Liberar el flag
    }
  };

  // ✅ Cargar órdenes al montar el componente
  useEffect(() => {
    console.log('📋 Orders useEffect triggered, hasFetched:', hasFetched.current);

    // Solo cargar si no se ha cargado exitosamente antes
    if (!hasFetched.current) {
      fetchOrders();
    }
  }, []); // ✅ Array de dependencias vacío para que solo se ejecute al montar

  // ✅ Función para refrescar órdenes manualmente
  const refreshOrders = async () => {
    console.log('🔄 Refrescando órdenes manualmente...');
    hasFetched.current = false; // Reset flag para permitir nueva carga
    await fetchOrders();
  };

  // ✅ Filtrado optimizado de órdenes
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      console.log('📋 No hay órdenes para filtrar');
      return [];
    }

    console.log('🔍 Filtrando órdenes. Filter:', filter, 'Total orders:', orders.length);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filtered = orders.filter(order => {
      if (!order.created_at) return false;

      const orderDate = new Date(order.created_at);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

      switch (filter) {
        case 'today':
          return orderDay.getTime() === today.getTime();
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return orderDate >= monthAgo;
        case 'all':
        default:
          return true;
      }
    });

    // ✅ Ordenar por fecha
    if (sortByDate) {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    console.log(`📋 Filtered orders for "${filter}":`, filtered.length);
    return filtered;
  }, [orders, filter, sortByDate]);

  // ✅ Funciones para edición de órdenes
  const handleEditOrder = (order) => {
    console.log('✏️ Editando orden:', order);
    setOrderToEdit(order);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setOrderToEdit(null);
  };

  const handleOrderUpdated = async (updatedOrder) => {
    console.log('✅ Orden actualizada, refrescando lista...');
    setIsEditModalOpen(false);
    setOrderToEdit(null);
    await refreshOrders();
  };

  // ✅ Formatear fecha
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // ✅ Formatear precio
  const formatPrice = (price) => {
    try {
      const numPrice = Number(price);
      return isNaN(numPrice) ? '$0.00' : `$${numPrice.toFixed(2)}`;
    } catch (error) {
      return '$0.00';
    }
  };

  // ✅ Renderizar loading
  if (isLoadingOrders) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <BusinessHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ArrowPathIcon className="w-12 h-12 mx-auto mb-4 animate-spin text-green-600" />
            <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Cargando órdenes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <BusinessHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className={`rounded-xl shadow-sm border mb-6 p-6 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <div>
                <h1 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Órdenes
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Gestiona todas las órdenes del sistema
                </p>
              </div>
            </div>

            <button
              onClick={refreshOrders}
              disabled={isLoadingOrders}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className={`w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="all">Todas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sortByDate"
                checked={sortByDate}
                onChange={(e) => setSortByDate(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
              />
              <label
                htmlFor="sortByDate"
                className={`text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Ordenar por fecha
              </label>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className={`p-6 rounded-xl shadow-sm border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Total Órdenes
                </p>
                <p className={`text-3xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {filteredOrders.length}
                </p>
              </div>
              <ShoppingBagIcon className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Ventas Totales
                </p>
                <p className={`text-3xl font-bold text-green-600`}>
                  {formatPrice(filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0))}
                </p>
              </div>
              <CurrencyDollarIcon className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Promedio por Orden
                </p>
                <p className={`text-3xl font-bold text-blue-600`}>
                  {filteredOrders.length > 0
                    ? formatPrice(filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) / filteredOrders.length)
                    : '$0.00'
                  }
                </p>
              </div>
              <ClockIcon className="w-12 h-12 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Lista de Órdenes */}
        <div className={`rounded-xl shadow-sm border overflow-hidden ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={`${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Orden
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Cliente
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Fecha
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Total
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Items
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  {filteredOrders.map((order) => (
                    <tr key={order.id_order} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          #{order.id_order}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {order.client_name || 'Cliente genérico'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">
                          {formatPrice(order.total_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {order.items?.length || 0} productos
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Editar orden"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBagIcon className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <h3 className={`text-lg font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                No hay órdenes
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {filter === 'today'
                  ? 'No se encontraron órdenes para hoy.'
                  : `No se encontraron órdenes para el filtro "${filter}".`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      {isEditModalOpen && orderToEdit && (
        <OrderEditModal
          order={orderToEdit}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </div>
  );
}

export default Orders;