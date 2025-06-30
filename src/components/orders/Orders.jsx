import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useCart } from '../../context/CartContext';
import {
  ShoppingBagIcon,
  PencilIcon,
  ArrowLeftIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  EyeIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
import ProductModal from '../modals/ProductModal';
import Swal from 'sweetalert2';
import { getOrders, getOrdersByPeriod, updateOrder, getOrderById } from '../../utils/api';
import { handleApiError, formatPrice, debugLog } from '../../utils/helpers';
import { startOfToday, subDays, subMonths } from 'date-fns';

function Orders({ onBack }) {
  const { theme } = useTheme();
  const { setLoading } = useLoading();
  const { setMessage } = useMessage();
  const { paymentMethods } = useCart();

  // Estados principales
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Estados de filtros mejorados
  const [filters, setFilters] = useState({
    period: 'today',
    search: '',
    clientName: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'newest',
    showFilters: false
  });

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Estados para edición de productos individuales
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);

  // Estados para edición completa de orden
  const [isEditingFullOrder, setIsEditingFullOrder] = useState(false);
  const [fullOrderEdit, setFullOrderEdit] = useState({
    id_order: null,
    client_name: '',
    comment: '',
    id_payment_method: null,
    items: []
  });

  const subtractDays = (dias) => {
    const resultado = new Date();
    resultado.setDate(resultado.getDate() - dias);
    return resultado;
  };

  // ✅ MODAL COMBINADO PARA CLIENTE Y MÉTODO DE PAGO (IGUAL QUE EN CART)
  const showClientAndPaymentModal = async (initialClientName = '', initialPaymentMethod = null) => {
    if (!paymentMethods || paymentMethods.length === 0) {
      await Swal.fire({
        title: 'Error',
        text: 'No hay métodos de pago disponibles',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
      return null;
    }

    // Variable para almacenar la selección
    let selectedPaymentMethodId = initialPaymentMethod || null;

    // HTML personalizado para el modal
    const modalHtml = `
      <div class="space-y-6">
        <!-- Sección de Cliente -->
        <div>
          <label class="block text-sm font-semibold mb-3 text-left ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}">
            👤 Nombre del Cliente (Opcional)
          </label>
          <input
            id="swal-client-name"
            type="text"
            placeholder="Ej: Juan Pérez"
            value="${initialClientName || ''}"
            class="w-full px-4 py-3 rounded-lg border text-center ${theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'}
              focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <!-- Sección de Métodos de Pago -->
        <div>
          <label class="block text-sm font-semibold mb-3 text-left ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}">
            💳 Método de Pago <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" id="payment-methods-grid">
            ${paymentMethods.map(method => `
              <button
                type="button"
                data-payment-id="${method.id_payment_method}"
                class="payment-method-btn relative flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all min-h-[4rem] ${
                  (initialPaymentMethod && initialPaymentMethod == method.id_payment_method)
                    ? `border-green-500 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'}`
                    : `border-gray-300 ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500 active:bg-gray-700' : 'hover:border-gray-400 active:bg-gray-50'}`
                }"
              >
                <div class="payment-icon w-8 h-8 rounded-lg flex items-center justify-center ${
                  (initialPaymentMethod && initialPaymentMethod == method.id_payment_method)
                    ? 'bg-green-500 text-white'
                    : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                }">
                  ${method.name.toLowerCase().includes('efectivo') ? '💵' :
                    method.name.toLowerCase().includes('tarjeta') ? '💳' :
                    method.name.toLowerCase().includes('clabe') ? '🏦' :
                    method.name.toLowerCase().includes('qr') ? '📱' :
                    method.name.toLowerCase().includes('link') ? '🔗' : '💵'}
                </div>
                <div class="text-center">
                  <div class="font-medium text-xs leading-tight">${method.name}</div>
                </div>
                <div class="payment-check absolute -top-1 -right-1 ${
                  (initialPaymentMethod && initialPaymentMethod == method.id_payment_method) ? '' : 'hidden'
                }">
                  <div class="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
                    <span class="text-xs">✓</span>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
          <div id="payment-error" class="text-red-500 text-sm mt-2 hidden">
            Selecciona un método de pago
          </div>
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: '🔄 Actualizar Orden',
      html: modalHtml,
      showCancelButton: true,
      confirmButtonText: '✅ Actualizar',
      cancelButtonText: '❌ Cancelar',
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#f9fafb' : '#111827',
      customClass: {
        confirmButton: `px-6 py-3 ${theme === 'dark'
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg font-medium transition-colors`,
        cancelButton: `px-6 py-3 ${theme === 'dark'
          ? 'bg-gray-600 hover:bg-gray-700'
          : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-lg font-medium transition-colors mr-3`,
        popup: 'max-w-md sm:max-w-lg'
      },
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: true,
      didOpen: () => {
        // Configurar listeners para métodos de pago
        const paymentButtons = document.querySelectorAll('.payment-method-btn');
        const paymentError = document.getElementById('payment-error');

        function selectPaymentMethod(button, paymentId) {
          // Deseleccionar todos
          paymentButtons.forEach(btn => {
            btn.classList.remove('border-green-500');
            btn.classList.add('border-gray-300');
            if (theme === 'dark') {
              btn.classList.add('border-gray-600');
              btn.classList.remove('bg-green-900/30');
            } else {
              btn.classList.remove('bg-green-50');
            }
            const icon = btn.querySelector('.payment-icon');
            const check = btn.querySelector('.payment-check');
            icon.classList.remove('bg-green-500', 'text-white');
            icon.classList.add(theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200');
            check.classList.add('hidden');
          });

          // Seleccionar actual
          button.classList.remove('border-gray-300');
          if (theme === 'dark') {
            button.classList.remove('border-gray-600');
            button.classList.add('bg-green-900/30');
          } else {
            button.classList.add('bg-green-50');
          }
          button.classList.add('border-green-500');
          const icon = button.querySelector('.payment-icon');
          const check = button.querySelector('.payment-check');
          icon.classList.remove(theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200');
          icon.classList.add('bg-green-500', 'text-white');
          check.classList.remove('hidden');

          selectedPaymentMethodId = parseInt(paymentId);
          paymentError.classList.add('hidden');

          console.log('✅ Payment method selected:', selectedPaymentMethodId);
        }

        paymentButtons.forEach(button => {
          button.addEventListener('click', () => {
            const paymentId = button.getAttribute('data-payment-id');
            selectPaymentMethod(button, paymentId);
          });
        });

        console.log('🔧 Modal opened with initial payment method:', selectedPaymentMethodId);
      },
      preConfirm: () => {
        const clientName = document.getElementById('swal-client-name').value.trim();
        const paymentError = document.getElementById('payment-error');

        console.log('🔍 Validating payment method:', selectedPaymentMethodId);

        // Validar método de pago
        if (!selectedPaymentMethodId) {
          paymentError.classList.remove('hidden');
          console.log('❌ No payment method selected');
          return false;
        }

        console.log('✅ Validation passed, returning:', {
          clientName,
          selectedPaymentMethod: selectedPaymentMethodId
        });

        return {
          clientName,
          selectedPaymentMethod: selectedPaymentMethodId
        };
      }
    });

    if (result.isConfirmed) {
      return result.value;
    }

    return null;
  };

  // Cargar órdenes al montar el componente
  useEffect(() => {
    loadOrdersByPeriod();
  }, [filters.period]);

  // Aplicar filtros a las órdenes
  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  function getStartDateForPeriod(period) {
      const today = startOfToday();

      const periodMap = {
          today: () => today,
          week: () => subDays(today, 7),
          month: () => subMonths(today, 1),
          all: () => new Date("2025-05-01"),//fecha de inauguración
      };

      // Llama a la función del mapa o a la de 'today' por defecto
      const getStartDate = periodMap[period] || periodMap.today;
      return getStartDate();
  }

  const loadOrdersByPeriod = async () => {
    try {
      setLoading(true);
      setIsLoading(true);
      debugLog('ORDERS', 'Loading orders with period:', filters.period);

     const start = queryFormatDate(
            getStartDateForPeriod(filters.period)
         );
     const end = queryFormatDate(new Date());

      const response = await getOrdersByPeriod(start, end);
      const ordersData = Array.isArray(response) ? response : response?.data || [];

      debugLog('ORDERS', 'Orders loaded successfully:', {
        count: ordersData.length,
        period: filters.period,
        start: start,
        end: end
      });

      setOrders(ordersData);
    } catch (error) {
      debugLog('ERROR', 'Failed to load orders:', error);
      handleApiError(error, setMessage);
      setOrders([]);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA APLICAR FILTROS
  const applyFilters = () => {
    let filtered = [...orders];

    // Filtro por búsqueda general
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.client_name?.toLowerCase().includes(searchTerm) ||
        order.id_order.toString().includes(searchTerm) ||
        order.items?.some(item =>
          item.product_name?.toLowerCase().includes(searchTerm)
        ) ||
        order.comment?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por nombre de cliente
    if (filters.clientName.trim()) {
      filtered = filtered.filter(order =>
        order.client_name?.toLowerCase().includes(filters.clientName.toLowerCase())
      );
    }

    // Filtro por método de pago
    if (filters.paymentMethod) {
      filtered = filtered.filter(order =>
        order.id_payment_method?.toString() === filters.paymentMethod
      );
    }

    // Filtro por rango de montos
    if (filters.minAmount) {
      filtered = filtered.filter(order =>
        parseFloat(order.total_amount || order.bill || 0) >= parseFloat(filters.minAmount)
      );
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(order =>
        parseFloat(order.total_amount || order.bill || 0) <= parseFloat(filters.maxAmount)
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.order_date) - new Date(a.order_date);
        case 'oldest':
          return new Date(a.order_date) - new Date(b.order_date);
        case 'highest':
          return parseFloat(b.total_amount || b.bill || 0) - parseFloat(a.total_amount || a.bill || 0);
        case 'lowest':
          return parseFloat(a.total_amount || a.bill || 0) - parseFloat(b.total_amount || b.bill || 0);
        case 'client':
          return (a.client_name || '').localeCompare(b.client_name || '');
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
    setCurrentPage(1); // Reset a primera página cuando se aplican filtros
  };

  // ✅ FUNCIÓN PARA LIMPIAR FILTROS
  const clearFilters = () => {
    setFilters({
      period: 'today',
      search: '',
      clientName: '',
      paymentMethod: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'newest',
      showFilters: false
    });
  };

  // ✅ FUNCIÓN PARA MANEJAR CAMBIOS EN FILTROS
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

    const queryFormatDate = (dateString) => {
      if (!dateString) return 'Fecha no disponible';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-CA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch (error) {
        return 'Fecha inválida';
      }
    };


  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // ✅ FUNCIÓN PARA EDITAR PRODUCTO INDIVIDUAL
  const handleEditOrderItem = async (order, itemIndex) => {
    try {
      const item = order.items[itemIndex];
      if (!item || !item.id_product) {
        setMessage({
          text: 'No se puede editar este producto',
          type: 'error'
        });
        return;
      }

      setLoading(true);
      debugLog('ORDERS', 'Editing order item:', {
        orderId: order.id_order,
        itemIndex,
        item
      });

      // ✅ CARGAR DATOS COMPLETOS DEL PRODUCTO PARA EL MODAL
      const productData = await getOrderById(order.id_order);

      if (!productData) {
        setMessage({
          text: 'No se pudo cargar la información del producto',
          type: 'error'
        });
        return;
      }

      // ✅ CONSTRUIR ESTRUCTURA COMPLETA PARA EL MODAL CON PRECIOS CORRECTOS
      const completeProduct = {
        id_product: item.id_product,
        name: item.product_name,
        image: item.product_image,
        price: item.product_price, // ✅ PRECIO BASE DEL PRODUCTO
        product_price: item.product_price, // ✅ PRECIO BASE ALTERNATIVO
        options: productData.options || [],
        flavors: productData.flavors || [],
        ...(productData.product || {})
      };

      // ✅ CONSTRUIR OPCIÓN SELECCIONADA CON PRECIO CORRECTO
      const selectedOption = item.id_variant ? {
        id_variant: item.id_variant,
        size: item.variant_name,
        price: item.product_price // ✅ USAR EL PRECIO DEL ITEM
      } : null;

      // ✅ CONSTRUIR SABOR SELECCIONADO SI EXISTE
      const selectedFlavor = item.flavor ? {
        id_flavor: item.flavor.id_flavor,
        name: item.flavor.name
      } : null;

      console.log("✅ Complete product with pricing:", {
        completeProduct,
        selectedOption,
        selectedFlavor,
        basePrice: item.product_price,
        variantPrice: item.product_price
      });

      setEditingOrder(order);
      setCurrentItemIndex(itemIndex);
      setEditingItem(item);
      setEditingProduct(completeProduct);

    } catch (error) {
      debugLog('ERROR', 'Failed to load product for editing:', error);
      handleApiError(error, setMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA GUARDAR CAMBIOS CON MODAL - MODIFICADA
  const handleSaveItemChanges = async (itemData) => {
    try {
      // Mostrar modal para capturar cliente y método de pago
      const modalResult = await showClientAndPaymentModal(
        editingOrder.client_name,
        editingOrder.id_payment_method
      );

      // Si el usuario canceló, no continúa
      if (!modalResult) {
        return;
      }

      setLoading(true);

      debugLog('ORDERS', 'Saving item changes with modal data:', {
        orderId: editingOrder.id_order,
        itemIndex: currentItemIndex,
        itemData,
        modalResult
      });

      // ✅ CONSTRUIR EL PAYLOAD CORRECTO PARA LA API
      const orderUpdateData = {
        id_payment_method: modalResult.selectedPaymentMethod,
        client_name: modalResult.clientName || 'Cliente POS',
        updated_items: [{
          id_order_detail: editingItem.id_order_detail || editingItem.id_product,
          id_product: editingItem.id_product,
          id_variant: itemData.selectedOption?.id_variant || editingItem.id_variant,
          comment: itemData.comment || editingOrder.comment,
          quantity: itemData.quantity || 1,
          updated_extras: (itemData.selectedExtras || []).map(extra => ({
            id_extra: extra.id_extra,
            quantity: extra.quantity || 1
          })),
          updated_sauces: (itemData.selectedSauces || []).map(sauce => ({
            id_sauce: sauce.id_sauce
          })),
          ...(itemData.selectedFlavor && {
            id_flavor: itemData.selectedFlavor.id_flavor
          })
        }]
      };

      console.log('📤 Enviando datos de actualización:', orderUpdateData);

      await updateOrder(editingOrder.id_order, orderUpdateData);

      // ✅ Actualizar el estado local
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id_order === editingOrder.id_order
            ? {
                ...order,
                client_name: modalResult.clientName || order.client_name,
                id_payment_method: modalResult.selectedPaymentMethod,
                items: order.items.map((item, index) =>
                  index === currentItemIndex
                    ? {
                        ...item,
                        id_variant: itemData.selectedOption?.id_variant || item.id_variant,
                        variant_name: itemData.selectedOption?.size || item.variant_name,
                        comment: itemData.comment || item.comment,
                        product_price: itemData.selectedOption?.price || item.product_price,
                        flavor: itemData.selectedFlavor || item.flavor,
                        extras: itemData.selectedExtras ? itemData.selectedExtras.map(extra => ({
                          id_extra: extra.id_extra,
                          name: extra.name,
                          actual_price: extra.price,
                          quantity: extra.quantity || 1
                        })) : item.extras,
                        sauces: itemData.selectedSauces ? itemData.selectedSauces.map(sauce => ({
                          id_sauce: sauce.id_sauce,
                          name: sauce.name,
                          image: sauce.image
                        })) : item.sauces
                      }
                    : item
                )
              }
            : order
        )
      );

      handleCloseEditModal();

      setMessage({
        text: 'Producto actualizado exitosamente',
        type: 'success'
      });

      await Swal.fire({
        title: '¡Producto actualizado!',
        text: 'Los cambios se han guardado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });

    } catch (error) {
      debugLog('ERROR', 'Failed to update order item:', error);
      handleApiError(error, setMessage);

      Swal.fire({
        title: 'Error al actualizar',
        text: 'No se pudo actualizar el producto. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditingProduct(null);
    setEditingItem(null);
    setEditingOrder(null);
    setCurrentItemIndex(null);
    debugLog('ORDERS', 'Edit modal closed');
  };

  // ✅ CÁLCULOS PARA PAGINACIÓN
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // ✅ ESTADÍSTICAS MEJORADAS
  const getFilterStats = () => {
    const total = filteredOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || order.bill || 0), 0);
    const uniqueClients = new Set(filteredOrders.map(order => order.client_name).filter(Boolean)).size;
    const paymentMethodsUsed = new Set(filteredOrders.map(order => order.payment_name).filter(Boolean)).size;

    return {
      count: filteredOrders.length,
      total: total,
      uniqueClients,
      paymentMethodsUsed,
      averageTicket: filteredOrders.length > 0 ? total / filteredOrders.length : 0
    };
  };

  const stats = getFilterStats();

  const filterOptions = [
    { value: 'today', label: 'Hoy'},
    { value: 'week', label: 'Esta semana'},
    { value: 'month', label: 'Este mes' },
    { value: 'all', label: 'Todas' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Más recientes' },
    { value: 'oldest', label: 'Más antiguos' },
    { value: 'highest', label: 'Mayor monto' },
    { value: 'lowest', label: 'Menor monto' },
    { value: 'client', label: 'Por cliente' }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* Header Mejorado */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-4 gap-4">
            {/* Título y navegación */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <ShoppingBagIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Órdenes
                  </h1>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.count} órdenes • {formatPrice(stats.total)} • {stats.uniqueClients} clientes
                  </p>
                </div>
              </div>
            </div>

            {/* Controles principales */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Búsqueda rápida */}
              <div className="relative">
                <MagnifyingGlassIcon className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Buscar órdenes, clientes..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className={`pl-10 pr-4 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Botón filtros avanzados */}
              <button
                onClick={() => handleFilterChange('showFilters', !filters.showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  filters.showFilters
                    ? 'bg-blue-600 text-white border-blue-600'
                    : theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                <span className="text-sm">Filtros</span>
              </button>
            </div>
          </div>

          {/* ✅ FILTROS AVANZADOS DESPLEGABLES */}
          {filters.showFilters && (
            <div className={`pb-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtro por período */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Período
                  </label>
                  <select
                    value={filters.period}
                    onChange={(e) => handleFilterChange('period', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {filterOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por cliente */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={filters.clientName}
                    onChange={(e) => handleFilterChange('clientName', e.target.value)}
                    placeholder="Nombre del cliente"
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Filtro por método de pago */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Método de Pago
                  </label>
                  <select
                    value={filters.paymentMethod}
                    onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Todos los métodos</option>
                    {paymentMethods && paymentMethods.map(method => (
                      <option key={method.id_payment_method} value={method.id_payment_method}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ordenamiento */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ordenar por
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rango de montos */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Rango de Montos
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={filters.minAmount}
                      onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                      placeholder="Mínimo"
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    <input
                      type="number"
                      value={filters.maxAmount}
                      onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                      placeholder="Máximo"
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Botón limpiar filtros */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className={`w-full px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className={`ml-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Cargando órdenes...
            </span>
          </div>
        ) : paginatedOrders.length > 0 ? (
          <>
            {/* Lista de órdenes mejorada */}
            <div className="grid gap-4 mb-6">
              {paginatedOrders.map((order) => {
                const isExpanded = expandedOrders.has(order.id_order);
                const orderTotal = parseFloat(order.total_amount || order.bill || 0);

                return (
                  <div
                    key={order.id_order}
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${
                      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    } overflow-hidden transition-all duration-200 hover:shadow-md`}
                  >
                    {/* Header de la orden mejorado */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} flex items-center justify-center`}>
                            <span className={`text-lg font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                              #{order.id_order}
                            </span>
                          </div>
                          <div>
                            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {order.client_name || 'Cliente genérico'}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                <CalendarIcon className="w-4 h-4" />
                                {formatDate(order.order_date)}
                              </span>
                              <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                <CreditCardIcon className="w-4 h-4" />
                                {order.payment_name || 'Sin método'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Total */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatPrice(orderTotal)}
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {order.items?.length || 0} producto{order.items?.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleOrderExpansion(order.id_order)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'text-gray-400 hover:bg-gray-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title={isExpanded ? 'Contraer' : 'Expandir'}
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Vista previa rápida de productos mejorada */}
                    {!isExpanded && order.items && order.items.length > 0 && (
                      <div className={`px-4 pb-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="pt-3 flex flex-wrap gap-2">
                          {order.items.slice(0, 3).map((item, index) => (
                            <div key={index} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}>
                              <span className="font-medium">{item.product_name}</span>
                              <button
                                onClick={() => handleEditOrderItem(order, index)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                                title="Editar producto"
                              >
                                <PencilIcon className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${
                              theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                            }`}>
                              +{order.items.length - 3} más
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Detalles expandidos mejorados */}
                    {isExpanded && (
                      <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        {/* Comentarios de la orden */}
                        {order.items?.map((item, index) => (
                          <div className="px-4 py-3 bg-opacity-50">
                            <div className="flex items-start gap-2">
                              <ChatBubbleLeftRightIcon className={`w-4 h-4 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                              <div>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Comentarios:
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {item.comment}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Lista detallada de productos mejorada */}
                        <div className="p-4">
                          <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Productos de la orden:
                          </h4>
                          <div className="space-y-2">
                            {order.items?.map((item, index) => (
                              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                              }`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    {/* ✅ IMAGEN DEL PRODUCTO */}
                                    {item.product_image && (
                                      <img
                                        src={item.product_image}
                                        alt={item.product_name}
                                        className="w-10 h-10 rounded-lg object-cover"
                                        loading="lazy"
                                      />
                                    )}
                                    <div>
                                      <h5 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {item.product_name || 'Producto'} • {item.variant_name}
                                      </h5>
                                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} space-y-0.5`}>
                                        {/* Extras y salsas */}
                                        {((item.extras && item.extras.length > 0) || (item.sauces && item.sauces.length > 0)) && (
                                          <div>
                                            {item.extras && item.extras.length > 0 && (
                                              <div>Extras: {item.extras.map(e => e.name).join(', ')}</div>
                                            )}
                                            {item.sauces && item.sauces.length > 0 && (
                                              <div>Salsas: {item.sauces.map(s => s.name).join(', ')}</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="font-semibold text-green-600">
                                      {formatPrice(item.product_price)}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleEditOrderItem(order, index)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      theme === 'dark'
                                        ? 'text-blue-400 hover:bg-blue-900/20'
                                        : 'text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Editar producto"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ✅ PAGINACIÓN MEJORADA */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredOrders.length)} de {filteredOrders.length} órdenes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 disabled:hover:bg-gray-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'
                    }`}
                  >
                    Anterior
                  </button>
                  <span className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 disabled:hover:bg-gray-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'
                    }`}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <ShoppingBagIcon className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {filters.search || filters.clientName || filters.paymentMethod || filters.minAmount || filters.maxAmount
                ? 'No se encontraron órdenes'
                : 'No hay órdenes'
              }
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {filters.search || filters.clientName || filters.paymentMethod || filters.minAmount || filters.maxAmount
                ? 'Intenta ajustar los filtros para obtener más resultados.'
                : filters.period === 'today'
                  ? 'No se encontraron órdenes para hoy.'
                  : `No se encontraron órdenes para el filtro "${filters.period}".`
              }
            </p>
            {(filters.search || filters.clientName || filters.paymentMethod || filters.minAmount || filters.maxAmount) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ✅ Modal de edición de producto individual MODIFICADO CON DATOS COMPLETOS */}
      {editingProduct && editingItem && editingOrder && (
        <ProductModal
          isOpen={true}
          onClose={handleCloseEditModal}
          product={editingProduct}
          initialQuantity={editingItem.quantity || 1}
          initialOptions={editingItem.id_variant ? [{
            id_variant: editingItem.id_variant,
            size: editingItem.variant_name,
            price: editingItem.product_price // ✅ PRECIO CORRECTO DEL RESPONSE
          }] : (editingProduct.options || [])}
          initialFlavors={editingItem.flavor ? [{
            id_flavor: editingItem.flavor.id_flavor,
            name: editingItem.flavor.name
          }] : (editingProduct.flavors || [])}
          initialExtras={editingItem.extras ? editingItem.extras.map(extra => ({
            id_extra: extra.id_extra,
            name: extra.name,
            price: extra.actual_price, // ✅ USAR actual_price del response
            quantity: extra.quantity || 1
          })) : []}
          initialSauces={editingItem.sauces ? editingItem.sauces.map(sauce => ({
            id_sauce: sauce.id_sauce,
            name: sauce.name,
            image: sauce.image
          })) : []}
          initialComment={editingItem.comment || ''}
          onSave={handleSaveItemChanges}
          isEditing={true}
        />
      )}
    </div>
  );
}

export default Orders;