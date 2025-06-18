import { useState, useMemo, useEffect } from 'react';
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
  PencilIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
import OrderEditModal from './OrderEditModal';

function Orders({ onBack }) {
  console.log('🎯 Orders component rendering...');

  const { setLoading } = useLoading();
  const { setMessage } = useMessage();
  const { theme } = useTheme();
  const { transformOrderData } = useCart(); // ✅ Usar función de transformación del contexto

  // Estados existentes
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('today');
  const [sortByDate, setSortByDate] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Nuevos estados para edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);

  console.log('📊 Current state - orders:', orders?.length || 0, 'loading:', isLoadingOrders, 'filter:', filter);

  // ✅ Función para obtener órdenes de la API con mejor debugging y transformación
  const fetchOrders = async () => {
    console.log('🔍 Iniciando fetchOrders...');
    setIsLoadingOrders(true);

    try {
      console.log('📡 Haciendo fetch a: http://localhost:8081/api/orders');

      const response = await fetch('http://localhost:8081/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(120000) // ✅ 15 segundos timeout
      });

      console.log('📥 Response recibido:', response);
      console.log('📊 Response status:', response.status);
      console.log('✅ Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Orders API Response:', data);
      console.log('📊 Número de órdenes:', data.length);

      // ✅ Transformar datos usando función mejorada
      const transformedOrders = data.map(order => ({
        id_order: order.id_order,
        client_name: order.client_name,
        order_date: order.order_date,
        total: order.bill || order.total || 0, // ✅ Múltiples fallbacks
        payment_method: {
          id_payment_method: order.payment_method,
          name: order.payment_name || 'Desconocido'
        },
        comment: order.comment,
        items: (order.items || []).map(item => ({
          id_order_detail: item.id_order_detail,
          id_product: item.id_product,
          id_variant: item.id_variant,
          quantity: item.quantity || 1,
          price: item.price || item.product_price || 0,

          // ✅ Estructura anidada para compatibilidad con OrderEditModal
          product: {
            id_product: item.id_product,
            name: item.product_name,
            image: item.product_image
          },
          variant: {
            id_variant: item.id_variant,
            size: item.variant_name
          },

          // ✅ También mantener campos directos por compatibilidad
          product_name: item.product_name,
          product_image: item.product_image,
          variant_name: item.variant_name,

          sauces: item.sauces || [],
          extras: item.extras || [],
          flavors: item.flavors || []
        }))
      }));

      setOrders(transformedOrders);
      console.log('✅ Órdenes guardadas en estado:', transformedOrders);
      setMessage(null); // Limpiar mensajes de error previos
    } catch (error) {
      console.error('❌ Error fetching orders:', error);

      let errorMessage = 'Error al cargar las órdenes.';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:8081';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'Error de CORS. Verifica la configuración del backend.';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Error del servidor: ${error.message}`;
      }

      setMessage({
        text: errorMessage,
        type: 'error'
      });
      setOrders([]); // Limpiar órdenes en caso de error
    } finally {
      console.log('🏁 fetchOrders completed, setting loading to false');
      setIsLoadingOrders(false);
    }
  };

  // Cargar órdenes al montar el componente
  useEffect(() => {
    console.log('🚀 Orders component mounted, calling fetchOrders...');
    fetchOrders();
  }, []);

  // Función para refrescar órdenes
  const handleRefreshOrders = () => {
    console.log('🔄 Manual refresh triggered');
    fetchOrders();
  };

  // Nueva función para abrir modal de edición
  const handleEditOrder = (order) => {
    console.log('✏️ Editing order:', order);
    setOrderToEdit(order);
    setIsEditModalOpen(true);
  };

  // Nueva función para cerrar modal de edición
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setOrderToEdit(null);
  };

  // Nueva función para manejar cuando se actualiza una orden
  const handleOrderUpdated = (updatedOrder) => {
    console.log('🔄 Order updated:', updatedOrder);
    // Refrescar la lista de órdenes
    fetchOrders();
    setMessage({
      text: 'Orden actualizada exitosamente',
      type: 'success'
    });
  };

  // ✅ Filtros con corrección para zona horaria local
  const filteredOrders = useMemo(() => {
    console.log('🔍 Filtrando órdenes. Total órdenes:', orders?.length || 0);
    console.log('📋 Órdenes raw:', orders);

    if (!orders || orders.length === 0) {
      console.log('❌ No hay órdenes para filtrar');
      return [];
    }

    let filtered = [...orders];
    console.log('📊 Filtro actual:', filter);

    if (filter === 'today') {
      // Obtener fecha de hoy en formato local (YYYY-MM-DD)
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDay = String(today.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

      console.log('📅 Filtrando por fecha de hoy:', todayStr);

      filtered = filtered.filter(order => {
        if (!order.order_date) return false;

        // Extraer solo la parte de fecha del order_date (YYYY-MM-DD)
        const orderDateStr = order.order_date.split('T')[0];
        console.log(`🔍 Orden ${order.id_order}: ${orderDateStr} === ${todayStr} ?`, orderDateStr === todayStr);

        return orderDateStr === todayStr;
      });
    }

    if (sortByDate) {
      filtered.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    } else {
      filtered.sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
    }

    console.log('✅ Órdenes filtradas:', filtered.length);
    console.log('📋 Órdenes filtradas data:', filtered);
    return filtered;
  }, [orders, filter, sortByDate]);

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <BusinessHeader />

      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {/* Header con botón de regresar */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">Volver al Menú</span>
          </button>
          <div className="flex-1">
            <h1 className={`text-3xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Mis Pedidos
            </h1>
            <p className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Revisa y gestiona tus órdenes
            </p>
          </div>
        </div>

        {/* Controles de filtro y ordenamiento */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                filter === 'all'
                  ? 'bg-green-600 text-white border-green-600'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Todos
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                filter === 'today'
                  ? 'bg-green-600 text-white border-green-600'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Hoy
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleRefreshOrders}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
              disabled={isLoadingOrders}
            >
              <ArrowPathIcon className={`w-4 h-4 inline mr-2 ${
                isLoadingOrders ? 'animate-spin' : ''
              }`} />
              Actualizar
            </button>
            <button
              onClick={() => setSortByDate(!sortByDate)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              {sortByDate ? "Más recientes" : "Más antiguos"}
            </button>
          </div>
        </div>

        {/* Lista de órdenes */}
        {(() => {
          console.log('🎨 Rendering orders list. isLoading:', isLoadingOrders, 'filteredOrders:', filteredOrders.length);

          if (isLoadingOrders) {
            return (
              <div className={`rounded-xl shadow-sm border p-12 text-center ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Cargando pedidos...
                </p>
              </div>
            );
          }

          if (filteredOrders.length === 0) {
            console.log('📭 No filtered orders to show');
            return (
              <div className={`rounded-xl shadow-sm border p-12 text-center ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <ShoppingBagIcon className={`w-10 h-10 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {filter === 'today' ? 'No hay pedidos hoy' : 'No hay pedidos'}
                </h3>
                <p className={`mb-6 max-w-md mx-auto ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {filter === 'today'
                    ? 'Aún no has realizado pedidos hoy. ¡Es un buen momento para pedir algo delicioso!'
                    : 'Tus pedidos aparecerán aquí una vez que realices tu primera orden.'
                  }
                </p>
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1b7f2c] to-[#228B22] text-white rounded-lg hover:from-[#1a7329] hover:to-[#1f7a1f] transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Hacer un pedido
                </button>
              </div>
            );
          }

          console.log('📋 Rendering', filteredOrders.length, 'orders');
          return (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <div key={`order-${order.id_order}`} className={`rounded-xl shadow-sm border overflow-hidden ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className={`px-6 py-4 border-b ${
                    theme === 'dark'
                      ? 'border-gray-700 bg-gray-700'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className={`text-lg font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            Pedido #{order.id_order}
                          </h3>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {order.client_name} • {formatDate(order.order_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-xl font-bold ${
                            theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`}>
                            ${order.total?.toFixed(2) || '0.00'}
                          </p>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {order.payment_method?.name || 'N/A'}
                          </p>
                        </div>

                        {/* ✅ Botón de editar */}
                        <button
                          onClick={() => handleEditOrder(order)}
                          className={`p-2 rounded-lg border transition-colors ${
                            theme === 'dark'
                              ? 'border-gray-600 hover:bg-gray-600 text-gray-400 hover:text-white'
                              : 'border-gray-300 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                          }`}
                          title="Editar orden"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Comentarios de la orden */}
                    {order.comment && (
                      <div className={`mb-4 p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <p className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Comentarios: {order.comment}
                        </p>
                      </div>
                    )}

                    {/* ✅ Items de la orden con imágenes mejoradas */}
                    <div className="space-y-4">
                      {order.items?.map((item, idx) => (
                        <div key={`order-${order.id_order}-item-${idx}`} className="flex items-start gap-4">
                          <img
                            src={item.product?.image || item.product_image || '/api/placeholder/100/100'}
                            alt={item.product?.name || item.product_name || 'Producto'}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border"
                            onError={(e) => {
                              e.target.src = '/api/placeholder/100/100';
                            }}
                          />
                          <div className="flex-1">
                            <h4 className={`font-semibold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {item.product?.name || item.product_name || 'Producto'}
                            </h4>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {item.variant?.size || item.variant_name || 'Tamaño'} • Cantidad: {item.quantity}
                            </p>

                            {/* Extras */}
                            {item.extras && item.extras.length > 0 && (
                              <div className="mt-2">
                                <p className={`text-xs font-medium ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Extras:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.extras.map((extra, i) => (
                                    <span
                                      key={`extra-${i}`}
                                      className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs"
                                    >
                                      {extra.name} {extra.quantity && extra.quantity > 1 ? `x${extra.quantity}` : ''}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Salsas */}
                            {item.sauces && item.sauces.length > 0 && (
                              <div className="mt-2">
                                <p className={`text-xs font-medium ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Salsas:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.sauces.map((sauce, i) => (
                                    <span
                                      key={`sauce-${i}`}
                                      className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                                    >
                                      {sauce.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Sabores */}
                            {item.flavors && item.flavors.length > 0 && (
                              <div className="mt-2">
                                <p className={`text-xs font-medium ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Sabor:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.flavors.map((flavor, i) => (
                                    <span
                                      key={`flavor-${i}`}
                                      className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                                    >
                                      {flavor.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <p className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            ${item.price?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ✅ Modal de edición */}
      <OrderEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        order={orderToEdit}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  );
}

export default Orders;