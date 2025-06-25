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
  CurrencyDollarIcon,
  ShoppingCartIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
import OrderEditModal from './OrderEditModal';
import Swal from 'sweetalert2';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import { getOrders } from '../../utils/api';

function Orders({ onBack }) {
  console.log('🎯 Orders component rendering...');

  const { setLoading } = useLoading();
  const { setMessage } = useMessage();
  const { theme } = useTheme();

  // ✅ NUEVO: Acceso al contexto del carrito para edición
  const { loadOrderIntoCart, isCartEditMode, editingOrderId } = useCart();

  // Estados existentes
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('today');
  const [sortByDate, setSortByDate] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Nuevos estados para edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);

  // ✅ NUEVO: Estado para menús desplegables de acciones
  const [openActionMenus, setOpenActionMenus] = useState({});

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

    console.log('🔍 Filtrando órdenes con filtro:', filter);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let filtered = orders.filter(order => {
      if (!order.created_at) return false;

      const orderDate = new Date(order.created_at);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

      switch (filter) {
        case 'today':
          return orderDay.getTime() === today.getTime();
        case 'yesterday':
          return orderDay.getTime() === yesterday.getTime();
        case 'this-week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          return orderDate >= weekStart;
        case 'all':
          return true;
        default:
          return true;
      }
    });

    console.log(`📊 Órdenes filtradas (${filter}):`, filtered.length);

    // Ordenar por fecha si está habilitado
    if (sortByDate) {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return filtered;
  }, [orders, filter, sortByDate]);

  // ✅ Funciones para manejar edición
  const handleEditOrder = (order) => {
    console.log('✏️ Editando orden:', order.id_order);
    setOrderToEdit(order);
    setIsEditModalOpen(true);
    setOpenActionMenus({}); // Cerrar menús abiertos
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setOrderToEdit(null);
  };

  const handleOrderUpdated = (updatedOrder) => {
    console.log('🔄 Orden actualizada:', updatedOrder);

    // Actualizar la orden en la lista local
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id_order === updatedOrder.id_order ? updatedOrder : order
      )
    );

    // Cerrar modal
    handleCloseEditModal();
  };

  // ✅ NUEVA FUNCIÓN: Cargar orden en carrito para edición
  const handleLoadOrderInCart = async (order) => {
    try {
      // Verificar si ya hay otra orden en edición
      if (isCartEditMode && editingOrderId !== order.id_order) {
        const result = await Swal.fire({
          title: 'Orden en edición',
          text: `Ya tienes la orden #${editingOrderId} en edición. ¿Quieres cambiar a la orden #${order.id_order}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3b82f6',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, cambiar orden',
          cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
          return;
        }
      }

      setOpenActionMenus({}); // Cerrar menús

      // Cargar orden en carrito
      await loadOrderIntoCart(order.id_order);

      await Swal.fire({
        title: '¡Orden cargada!',
        text: `La orden #${order.id_order} está ahora en el carrito para edición`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      // Navegar al carrito o mostrar carrito si existe una función para eso
      if (onBack) {
        onBack(); // Esto típicamente lleva al menú principal donde está el carrito
      }

    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: `No se pudo cargar la orden en el carrito: ${error.message}`,
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  // ✅ FUNCIÓN para manejar menús de acciones
  const toggleActionMenu = (orderId) => {
    setOpenActionMenus(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // ✅ Cerrar menús cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenActionMenus({});
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Funciones de utilidad para formateo
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha inválida';

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
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  const formatPrice = (amount) => {
    const numericAmount = Number(amount) || 0;
    return `$${numericAmount.toFixed(2)}`;
  };

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <BusinessHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>

            <div>
              <h1 className={`text-3xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Órdenes
              </h1>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Gestiona y revisa todas las órdenes
              </p>
            </div>
          </div>

          <button
            onClick={refreshOrders}
            disabled={isLoadingOrders}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isLoadingOrders
                ? 'opacity-50 cursor-not-allowed'
                : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            {isLoadingOrders ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'today', label: 'Hoy', icon: CalendarIcon },
            { key: 'yesterday', label: 'Ayer', icon: CalendarIcon },
            { key: 'this-week', label: 'Esta semana', icon: CalendarIcon },
            { key: 'all', label: 'Todas', icon: ShoppingBagIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                filter === key
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Controles adicionales */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSortByDate(!sortByDate)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                sortByDate
                  ? theme === 'dark'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              {sortByDate ? 'Ordenado por fecha' : 'Ordenar por fecha'}
            </button>
          </div>

          <div className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''} encontrada{filteredOrders.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Lista de órdenes */}
        <div className={`rounded-lg shadow overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2">Cargando órdenes...</span>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id_order}
                      className={`transition-colors ${
                        theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-3 ${
                            theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
                          }`}>
                            <CurrencyDollarIcon className={`w-5 h-5 ${
                              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            }`} />
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              #{order.id_order}
                            </div>
                            <div className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {order.payment_method?.name || 'Método desconocido'}
                            </div>
                          </div>
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
                        {/* ✅ NUEVO: Menú de acciones con múltiples opciones */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActionMenu(order.id_order);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                            }`}
                            title="Más opciones"
                          >
                            <EllipsisVerticalIcon className="w-5 h-5" />
                          </button>

                          {/* Menú desplegable */}
                          {openActionMenus[order.id_order] && (
                            <div className={`
                              absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-10 border
                              ${theme === 'dark'
                                ? 'bg-gray-800 border-gray-700'
                                : 'bg-white border-gray-200'
                              }
                            `}>
                              <div className="py-1">
                                {/* Editar en Modal */}
                                <button
                                  onClick={() => handleEditOrder(order)}
                                  className={`
                                    flex items-center gap-3 w-full px-4 py-2 text-sm text-left transition-colors
                                    ${theme === 'dark'
                                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                >
                                  <PencilIcon className="w-4 h-4 text-blue-500" />
                                  <div>
                                    <div className="font-medium">Editar en Modal</div>
                                    <div className="text-xs text-gray-500">
                                      Edición rápida en ventana emergente
                                    </div>
                                  </div>
                                </button>

                                {/* ✅ NUEVO: Editar en Carrito */}
                                <button
                                  onClick={() => handleLoadOrderInCart(order)}
                                  className={`
                                    flex items-center gap-3 w-full px-4 py-2 text-sm text-left transition-colors
                                    ${theme === 'dark'
                                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                >
                                  <ShoppingCartIcon className="w-4 h-4 text-green-500" />
                                  <div>
                                    <div className="font-medium">Editar en Carrito</div>
                                    <div className="text-xs text-gray-500">
                                      Cargar orden en carrito para edición completa
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
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

        {/* ✅ NUEVO: Indicator si hay orden en edición en carrito */}
        {isCartEditMode && (
          <div className={`
            mt-6 p-4 rounded-lg border-l-4 border-blue-500
            ${theme === 'dark'
              ? 'bg-blue-900/20 border-blue-400'
              : 'bg-blue-50 border-blue-500'
            }
          `}>
            <div className="flex items-center gap-3">
              <ShoppingCartIcon className="w-5 h-5 text-blue-500" />
              <div>
                <h4 className={`font-medium ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                }`}>
                  Orden #{editingOrderId} en edición
                </h4>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  Esta orden está actualmente cargada en el carrito para edición
                </p>
              </div>
            </div>
          </div>
        )}
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