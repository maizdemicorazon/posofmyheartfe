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
  AdjustmentsHorizontalIcon,
  PlusIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
import ProductModal from '../modals/ProductModal';
import ClientPaymentModal from '../modals/ClientPaymentModal';
import Swal from 'sweetalert2';
import { getOrders, getOrdersByPeriod, updateOrder, getOrderById } from '../../utils/api';
import { handleApiError, formatPrice, debugLog, getPaymentMethodIcon } from '../../utils/helpers';
import { startOfToday, subDays, subMonths } from 'date-fns';
import { PAYMENT_METHODS } from '../../utils/constants';

function Orders({ onBack }) {
  const { theme } = useTheme();
  const { setLoading } = useLoading();
  const { setMessage } = useMessage();
  const { paymentMethods, products, extras, sauces } = useCart(); // ✅ OBTENER PRODUCTOS, EXTRAS Y SALSAS

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

  // ✅ NUEVO ESTADO: Para distinguir entre editar producto vs agregar a orden
  const [isEditingOrderMode, setIsEditingOrderMode] = useState(false);

  // ✅ ESTADOS PARA EL MODAL DE CLIENTE Y PAGO - SOLO PARA EDITAR DATOS DE ORDEN
  const [showClientPaymentModal, setShowClientPaymentModal] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState(null);

  // ✅ NUEVO ESTADO: Para controlar el auto-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  // ✅ NUEVA FUNCIÓN: Refrescar órdenes del día
  const handleRefreshToday = async () => {
    setIsRefreshing(true);
    try {
      // Forzar período a 'today' y recargar
      setFilters(prev => ({ ...prev, period: 'today' }));
      await loadOrdersByPeriod();
      setLastRefresh(new Date());

      setMessage({
        text: 'Órdenes actualizadas correctamente',
        type: 'success'
      });
    } catch (error) {
      handleApiError(error, setMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ FUNCIÓN PARA OBTENER TIEMPO TRANSCURRIDO DESDE LA ORDEN
  const getTimeElapsed = (orderDate) => {
    try {
      const now = new Date();
      const orderTime = new Date(orderDate);
      const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));

      if (diffInMinutes < 1) return 'Hace un momento';
      if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `Hace ${diffInHours}h ${diffInMinutes % 60}m`;

      return formatDate(orderDate);
    } catch (error) {
      return formatDate(orderDate);
    }
  };

  // ✅ FUNCIÓN PARA DETERMINAR URGENCIA DE LA ORDEN
  const getOrderUrgency = (orderDate) => {
    try {
      const now = new Date();
      const orderTime = new Date(orderDate);
      const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));

      if (diffInMinutes > 30) return 'urgent'; // Más de 30 min = urgente
      if (diffInMinutes > 15) return 'warning'; // Más de 15 min = advertencia
      return 'normal'; // Menos de 15 min = normal
    } catch (error) {
      return 'normal';
    }
  };

  // ✅ FUNCIÓN PARA EDITAR DATOS DE LA ORDEN (cliente y método de pago) - SIMPLIFICADA
  const handleEditOrderData = async (order) => {
    setEditingOrderData(order);
    setShowClientPaymentModal(true);
  };

  // ✅ FUNCIÓN PARA MANEJAR CONFIRMACIÓN DEL MODAL - SOLO PARA DATOS DE ORDEN
  const handleClientPaymentConfirm = async (modalData) => {
    setShowClientPaymentModal(false);

    try {
      setLoading(true);

      debugLog('ORDERS', 'Updating order data:', {
        orderId: editingOrderData.id_order,
        id_order_detail: editingOrderData.id_order_detail,
        newClientName: modalData.clientName,
        newPaymentMethod: modalData.selectedPaymentMethod
      });

      // ✅ CONSTRUIR PAYLOAD PARA ACTUALIZAR SOLO DATOS DE LA ORDEN
      const currentItems = editingOrderData.items || [];

      // ✅ MAPEAR PRODUCTOS EXISTENTES SIN CAMBIOS
      const existingItems = currentItems.map(item => ({
        id_product: item.id_product,
        id_variant: item.id_variant,
        comment: item.comment || '',
        quantity: item.quantity || 1,
        updated_extras: (item.extras || []).map(extra => ({
          id_extra: extra.id_extra,
          quantity: extra.quantity || 1
        })),
        updated_sauces: (item.sauces || []).map(sauce => ({
          id_sauce: sauce.id_sauce
        })),
        ...(item.flavor && {
          flavor: item.flavor.id_flavor
        })
      }));

      const orderUpdateData = {
        id_payment_method: modalData.selectedPaymentMethod,
        client_name: modalData.clientName || 'Cliente POS',
        updated_items: existingItems
      };

      console.log('📤 Enviando actualización de datos de orden:', orderUpdateData);

      await updateOrder(editingOrderData.id_order, orderUpdateData);

      // ✅ Actualizar el estado local
      setOrders(prevOrders =>
        prevOrders.map(ord =>
          ord.id_order === editingOrderData.id_order
            ? {
                ...ord,
                id_order_detail: ord.id_order_detail,
                client_name: modalData.clientName || ord.client_name,
                id_payment_method: modalData.selectedPaymentMethod,
                payment_name: paymentMethods.find(pm => pm.id_payment_method === modalData.selectedPaymentMethod)?.name || ord.payment_name
              }
            : ord
        )
      );

      setMessage({
        text: 'Datos de la orden actualizados exitosamente',
        type: 'success'
      });

      await Swal.fire({
        title: '¡Datos actualizados!',
        text: 'Los datos de la orden se han actualizado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });

    } catch (error) {
      debugLog('ERROR', 'Failed to update order data:', error);
      handleApiError(error, setMessage);

      Swal.fire({
        title: 'Error',
        text: 'No se pudo actualizar los datos de la orden. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
    } finally {
      setLoading(false);
      setEditingOrderData(null);
    }
  };

  // ✅ FUNCIÓN PARA CERRAR MODAL DE DATOS DE ORDEN
  const handleClientPaymentClose = () => {
    setShowClientPaymentModal(false);
    setEditingOrderData(null);
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
      filtered = filtered.filter(order => {
        const orderTotal = order.total_amount || order.bill || order.calculated_total ||
          (order.items ? order.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
        return parseFloat(orderTotal) >= parseFloat(filters.minAmount);
      });
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(order => {
        const orderTotal = order.total_amount || order.bill || order.calculated_total ||
          (order.items ? order.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
        return parseFloat(orderTotal) <= parseFloat(filters.maxAmount);
      });
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.order_date) - new Date(a.order_date);
        case 'oldest':
          return new Date(a.order_date) - new Date(b.order_date);
        case 'highest':
          return (() => {
            const totalA = a.total_amount || a.bill || a.calculated_total ||
              (a.items ? a.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
            const totalB = b.total_amount || b.bill || b.calculated_total ||
              (b.items ? b.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
            return parseFloat(totalB) - parseFloat(totalA);
          })();
        case 'lowest':
          return (() => {
            const totalA = a.total_amount || a.bill || a.calculated_total ||
              (a.items ? a.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
            const totalB = b.total_amount || b.bill || b.calculated_total ||
              (b.items ? b.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
            return parseFloat(totalA) - parseFloat(totalB);
          })();
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

  // ✅ FUNCIÓN PARA EDITAR PRODUCTO INDIVIDUAL - CORREGIDA PARA CARGAR OPCIONES Y SABORES
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

      // ✅ CARGAR INFORMACIÓN COMPLETA DEL PRODUCTO DESDE EL CONTEXTO
      let completeProductInfo = null;

      // Buscar el producto en el contexto
      if (products && products.length > 0) {
        completeProductInfo = products.find(p => p.id_product === item.id_product);
        console.log('🔍 Found product in context:', completeProductInfo);
      }

      // ✅ CONSTRUIR ESTRUCTURA COMPLETA PARA EL MODAL CON TODAS LAS OPCIONES
      const completeProduct = {
        id_product: item.id_product,
        name: item.product_name,
        image: item.product_image,
        price: item.product_price,
        product_price: item.product_price,
        // ✅ CONSTRUIR OPCIONES: usar del contexto O crear fallback
        options: completeProductInfo?.options || completeProductInfo?.variants || [
          {
            id_variant: item.id_variant,
            size: item.variant_name,
            price: item.product_price
          }
        ],
        // ✅ CONSTRUIR SABORES: usar del contexto O crear fallback
        flavors: completeProductInfo?.flavors || (item.flavor ? [
          {
            id_flavor: item.flavor.id_flavor,
            name: item.flavor.name
          }
        ] : []),
        ...(completeProductInfo || {})
      };

      // ✅ REORGANIZAR OPCIONES PARA QUE LA SELECCIONADA ESTÉ PRIMERA
      let initialOptions = [...(completeProduct.options || [])];
      if (item.id_variant && initialOptions.length > 1) {
        const selectedIndex = initialOptions.findIndex(opt => opt.id_variant === item.id_variant);
        if (selectedIndex > 0) {
          const selectedOption = initialOptions.splice(selectedIndex, 1)[0];
          initialOptions.unshift(selectedOption);
        }
      }

      // ✅ REORGANIZAR SABORES PARA QUE EL SELECCIONADO ESTÉ PRIMERO
      let initialFlavors = [...(completeProduct.flavors || [])];
      if (item.flavor?.id_flavor && initialFlavors.length > 1) {
        const selectedIndex = initialFlavors.findIndex(flavor => flavor.id_flavor === item.flavor.id_flavor);
        if (selectedIndex > 0) {
          const selectedFlavor = initialFlavors.splice(selectedIndex, 1)[0];
          initialFlavors.unshift(selectedFlavor);
        }
      }

      // ✅ SI NO HAY OPCIONES DEL CONTEXTO, USAR EXTRAS Y SALSAS GLOBALES
      const availableExtras = extras || [];
      const availableSauces = sauces || [];

      console.log("✅ Complete product setup:", {
        productFromContext: !!completeProductInfo,
        optionsCount: initialOptions.length,
        flavorsCount: initialFlavors.length,
        extrasCount: availableExtras.length,
        saucesCount: availableSauces.length,
        selectedOption: item.id_variant,
        selectedFlavor: item.flavor?.id_flavor
      });

      // ✅ CREAR OBJETO FINAL CON TODA LA INFORMACIÓN
      const finalProduct = {
        ...completeProduct,
        reorderedOptions: initialOptions,
        reorderedFlavors: initialFlavors,
        availableExtras,
        availableSauces
      };

      setEditingOrder(order);
      setCurrentItemIndex(itemIndex);
      setEditingItem(item);
      setEditingProduct(finalProduct);
      setIsEditingOrderMode(false); // ✅ Modo editar producto individual

    } catch (error) {
      debugLog('ERROR', 'Failed to load product for editing:', error);
      handleApiError(error, setMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Agregar producto a orden existente
  const handleAddProductToOrder = async (order) => {
    try {
      setLoading(true);
      debugLog('ORDERS', 'Adding product to existing order:', {
        orderId: order.id_order,
        availableProductsCount: products?.length || 0
      });

      // ✅ VERIFICAR QUE HAY PRODUCTOS DISPONIBLES
      if (!products || products.length === 0) {
        await Swal.fire({
          title: 'No hay productos disponibles',
          text: 'No se encontraron productos en el sistema. Verifica que los productos estén cargados.',
          icon: 'warning',
          confirmButtonText: 'Entendido',
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
        return;
      }

      // ✅ DEBUG: Mostrar estructura de productos disponibles
      console.log('🛒 Available products for order:', {
        productsCount: products.length,
        firstProduct: products[0],
        productsWithPrices: products.filter(p => p.product_price > 0 || p.options?.some(opt => opt.product_price > 0)),
        productsStructure: products.slice(0, 3).map(p => ({
          id: p.id_product,
          name: p.name,
          price: p.product_price,
          optionsCount: p.options?.length || 0,
          hasImage: !!p.image
        }))
      });

      // ✅ CREAR UN PRODUCTO GENÉRICO PARA SELECCIONAR
      const genericProduct = {
        id_product: null, // Se seleccionará en el modal
        name: 'Seleccionar Producto',
        image: null,
        price: 0,
        options: [],
        flavors: []
      };

      setEditingOrder(order);
      setCurrentItemIndex(null); // No hay item específico, es nuevo
      setEditingItem(null); // No hay item específico
      setEditingProduct(genericProduct);
      setIsEditingOrderMode(true); // ✅ Modo agregar a orden

    } catch (error) {
      debugLog('ERROR', 'Failed to prepare add product to order:', error);
      handleApiError(error, setMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA GUARDAR CAMBIOS DE PRODUCTO INDIVIDUAL - SIN MODAL
  const handleSaveItemChanges = async (itemData) => {
    try {
      setLoading(true);

      debugLog('ORDERS', 'Saving item changes directly:', {
        orderId: editingOrder.id_order,
        itemIndex: currentItemIndex,
        itemData
      });

      // ✅ CONSTRUIR EL PAYLOAD SEGÚN EL FORMATO CORRECTO DEL BACKEND
      const currentItems = editingOrder.items || [];

      // ✅ MAPEAR TODOS LOS PRODUCTOS DE LA ORDEN
      const updatedItems = currentItems.map((item, index) => {
        if (index === currentItemIndex) {
          // ✅ PRODUCTO QUE SE ESTÁ EDITANDO
          return {
            id_product: item.id_product,
            id_variant: itemData.selectedOption?.id_variant || item.id_variant,
            id_order_detail: itemData.selectedOption?.id_order_detail || item.id_order_detail,
            comment: itemData.comment || item.comment || '',
            quantity: itemData.quantity || item.quantity || 1,
            updated_extras: (itemData.selectedExtras || []).map(extra => ({
              id_extra: extra.id_extra,
              quantity: extra.quantity || 1
            })),
            updated_sauces: (itemData.selectedSauces || []).map(sauce => ({
              id_sauce: sauce.id_sauce
            })),
            ...(itemData.selectedFlavor && {
              flavor: itemData.selectedFlavor.id_flavor
            })
          };
        } else {
          // ✅ PRODUCTOS SIN CAMBIOS
          return {
            id_product: item.id_product,
            id_variant: item.id_variant,
            id_order_detail: item.id_order_detail,
            comment: item.comment || '',
            quantity: item.quantity || 1,
            updated_extras: (item.extras || []).map(extra => ({
              id_extra: extra.id_extra,
              quantity: extra.quantity || 1
            })),
            updated_sauces: (item.sauces || []).map(sauce => ({
              id_sauce: sauce.id_sauce
            })),
            ...(item.flavor && {
              flavor: item.flavor.id_flavor
            })
          };
        }
      });

      // ✅ PAYLOAD FINAL - MANTENER DATOS ACTUALES DE CLIENTE Y PAGO
      const orderUpdateData = {
        id_payment_method: editingOrder.id_payment_method,
        client_name: editingOrder.client_name || 'Cliente POS',
        updated_items: updatedItems
      };

      console.log('📤 Enviando datos de actualización de producto (sin modal):', orderUpdateData);

      await updateOrder(editingOrder.id_order, orderUpdateData);

      // ✅ Actualizar el estado local
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id_order === editingOrder.id_order
            ? {
                ...order,
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
                          price: extra.price,
                          quantity: extra.quantity || 1
                        })) : item.extras,
                        sauces: itemData.selectedSauces ? itemData.selectedSauces.map(sauce => ({
                          id_sauce: sauce.id_sauce,
                          name: sauce.name,
                          image: sauce.image
                        })) : item.sauces
                      }
                    : item
                ),
                // ✅ Recalcular total si no viene del backend
                ...((!order.total_amount && !order.bill) && {
                  calculated_total: order.items.reduce((sum, item, index) => {
                    if (index === currentItemIndex) {
                      // Calcular precio del item editado
                      const editedItem = {
                        ...item,
                        product_price: itemData.selectedOption?.price || item.product_price,
                        extras: itemData.selectedExtras || item.extras
                      };
                      return sum + calculateOrderItemPrice(editedItem);
                    }
                    return sum + calculateOrderItemPrice(item);
                  }, 0)
                })
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

  // ✅ NUEVA FUNCIÓN: Agregar producto adicional a la orden
  const handleAddAnotherToOrder = async (itemData) => {
    try {
      setLoading(true);

      debugLog('ORDERS', 'Adding another product to order:', {
        orderId: editingOrder.id_order,
        itemData
      });

      // ✅ CONSTRUIR PAYLOAD SEGÚN EL FORMATO CORRECTO DEL BACKEND
      // Todos los productos (existentes + nuevos) van en updated_items
      const currentItems = editingOrder.items || [];

      // ✅ MAPEAR PRODUCTOS EXISTENTES (sin cambios)
      const existingItems = currentItems.map(item => ({
        id_product: item.id_product,
        id_variant: item.id_variant,
        comment: item.comment || '',
        quantity: item.quantity || 1,
        updated_extras: (item.extras || []).map(extra => ({
          id_extra: extra.id_extra,
          quantity: extra.quantity || 1
        })),
        updated_sauces: (item.sauces || []).map(sauce => ({
          id_sauce: sauce.id_sauce
        })),
        ...(item.flavor && {
          flavor: item.flavor.id_flavor
        })
      }));

      // ✅ AGREGAR EL NUEVO PRODUCTO
      const newProduct = {
        id_product: itemData.selectedProduct?.id_product,
        id_variant: itemData.selectedOption?.id_variant,
        comment: itemData.comment || '',
        quantity: itemData.quantity || 1,
        updated_extras: (itemData.selectedExtras || []).map(extra => ({
          id_extra: extra.id_extra,
          quantity: extra.quantity || 1
        })),
        updated_sauces: (itemData.selectedSauces || []).map(sauce => ({
          id_sauce: sauce.id_sauce
        })),
        ...(itemData.selectedFlavor && {
          flavor: itemData.selectedFlavor.id_flavor
        })
      };

      // ✅ PAYLOAD FINAL SEGÚN EL FORMATO DEL BACKEND
      const orderUpdateData = {
        id_payment_method: editingOrder.id_payment_method,
        client_name: editingOrder.client_name || 'Cliente POS',
        updated_items: [
          ...existingItems,
          newProduct
        ]
      };

      console.log('📤 Enviando datos para agregar producto (formato correcto):', orderUpdateData);

      await updateOrder(editingOrder.id_order, orderUpdateData);

      // ✅ Recargar la orden actualizada
      await loadOrdersByPeriod();

      // ✅ Mostrar notificación de éxito
      await Swal.fire({
        title: '✅ Producto agregado',
        text: `El producto se agregó a la orden #${editingOrder.id_order}. Configura el siguiente producto.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });

      // ✅ El modal se reseteará automáticamente por el ProductModal
      return true;

    } catch (error) {
      debugLog('ERROR', 'Failed to add product to order:', error);
      handleApiError(error, setMessage);

      Swal.fire({
        title: 'Error',
        text: 'No se pudo agregar el producto a la orden. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });

      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA CALCULAR PRECIO TOTAL DE UN ITEM DE ORDEN
  const calculateOrderItemPrice = (item) => {
    try {
      // Precio base del producto/variante
      let totalPrice = parseFloat(item.product_price || 0);

      // Agregar precio de extras
      let extrasTotal = 0;
      if (item.extras && Array.isArray(item.extras)) {
        extrasTotal = item.extras.reduce((sum, extra) => {
          const extraPrice = parseFloat(extra.actual_price || extra.price || 0);
          const extraQuantity = parseInt(extra.quantity || 1);
          const extraSubtotal = extraPrice * extraQuantity;
          return sum + extraSubtotal;
        }, 0);
        totalPrice += extrasTotal;
      }

      // Multiplicar por cantidad del item
      const itemQuantity = parseInt(item.quantity || 1);
      totalPrice *= itemQuantity;

      return totalPrice;
    } catch (error) {
      console.error('Error calculating order item price:', error);
      return parseFloat(item.product_price || 0) * parseInt(item.quantity || 1);
    }
  };

  const handleCloseEditModal = () => {
    setEditingProduct(null);
    setEditingItem(null);
    setEditingOrder(null);
    setCurrentItemIndex(null);
    setIsEditingOrderMode(false); // ✅ Reset modo edición
    debugLog('ORDERS', 'Edit modal closed');
  };

  // ✅ CÁLCULOS PARA PAGINACIÓN
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // ✅ ESTADÍSTICAS MEJORADAS CON CÁLCULO CORRECTO
  const getFilterStats = () => {
    // Calcular total usando el cálculo correcto de items
    const total = filteredOrders.reduce((sum, order) => {
      // Priorizar total_amount del backend, pero si no existe, calcular desde items
      const orderTotal = order.total_amount || order.bill || order.calculated_total ||
        (order.items ? order.items.reduce((itemSum, item) => itemSum + calculateOrderItemPrice(item), 0) : 0);
      return sum + parseFloat(orderTotal);
    }, 0);

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

      {/* Header simplificado para cocina */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Información básica */}
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
                  <h1 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    📋 Órdenes de Cocina
                  </h1>
                  <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.count} órdenes activas • Actualizado: {lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Controles de cocina */}
            <div className="flex items-center gap-3">
              {/* Botón refrescar - OPTIMIZADO PARA TABLET */}
              <button
                onClick={handleRefreshToday}
                disabled={isRefreshing}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                  isRefreshing
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                }`}
                title="Actualizar órdenes del día"
              >
                <ArrowPathIcon className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>
                  {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </span>
              </button>

              {/* Botón filtros - OPTIMIZADO PARA TABLET */}
              <button
                onClick={() => handleFilterChange('showFilters', !filters.showFilters)}
                className={`flex items-center gap-3 px-5 py-4 rounded-xl transition-all ${
                  filters.showFilters
                    ? 'bg-blue-600 text-white shadow-lg'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-2 border-gray-300'
                }`}
                title="Filtros avanzados"
              >
                <AdjustmentsHorizontalIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* ✅ FILTROS SIMPLIFICADOS PARA COCINA */}
          {filters.showFilters && (
            <div className={`pb-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <select
                    value={filters.period}
                    onChange={(e) => handleFilterChange('period', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
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
                <div>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Buscar orden o cliente..."
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <button
                    onClick={clearFilters}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ CONTENIDO OPTIMIZADO PARA COCINA Y TABLET */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className={`ml-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Cargando órdenes...
            </span>
          </div>
        ) : paginatedOrders.length > 0 ? (
          <>
            {/* ✅ LISTA OPTIMIZADA PARA COCINA Y TABLET - INFORMACIÓN CLAVE VISIBLE */}
            <div className="grid gap-5 mb-8">
              {paginatedOrders.map((order) => {
                const urgency = getOrderUrgency(order.order_date);
                const orderTotal = order.total_amount || order.bill || order.calculated_total ||
                  (order.items ? order.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);

                return (
                  <div
                    key={order.id_order}
                    className={`rounded-xl shadow-lg border-l-6 transition-all duration-200 hover:shadow-xl ${
                      urgency === 'urgent'
                        ? 'border-l-red-600 bg-red-600 dark:bg-red-900/20'
                        : urgency === 'warning'
                        ? 'border-l-yellow-600 bg-green-600 dark:bg-yellow-900/10'
                        : 'border-l-yellow-400 bg-white dark:bg-600-800'
                    } ${
                      theme === 'dark'
                        ? 'border-600-700'
                        : 'border-600-200'
                    }`}
                  >
                    {/* ✅ HEADER COMPACTO CON INFO CLAVE - OPTIMIZADO TABLET */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-5">
                        {/* Info principal */}
                        <div className="flex items-center gap-4">
                          <div className={`text-3xl font-black px-4 py-2 rounded-xl ${
                            urgency === 'urgent'
                              ? 'bg-red-300 text-red-900 dark:bg-red-700 dark:text-red-100 shadow-lg border-2 border-red-500'
                              : urgency === 'warning'
                              ? 'bg-stone-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-200 shadow-lg border-2 border-yellow-400'
                              : 'bg-stone-100 text-yellow-700 dark:bg-yellow-500 dark:text-yellow-100 shadow-lg border-2 border-yellow-300'
                          }`}>
                            #{order.id_order}
                          </div>
                          <div>
                            <h3 className={`font-black text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} leading-tight`}>
                              {order.client_name || 'Sin nombre'}
                            </h3>
                            <div className="flex items-center gap-5 text-base mt-1">
                              <span className={`flex items-center gap-2 font-bold ${
                                urgency === 'urgent' ? 'text-red-700 dark:text-red-700' :
                                urgency === 'warning' ? 'text-yellow-700 dark:text-yellow-700' :
                                'text-gray-700 dark:text-gray-700'
                              }`}>
                                <ClockIcon className="w-5 h-5" />
                                {getTimeElapsed(order.order_date)}
                              </span>
                              <span className={`flex items-center gap-2 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {getPaymentMethodIcon(order.payment_name)} {order.payment_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Acciones y total */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-black text-green-600">
                              {formatPrice(parseFloat(orderTotal))}
                            </div>
                            <div className={`text-base font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {order.items?.length || 0} producto{order.items?.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Botones de acción compactos */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleAddProductToOrder(order)}
                              className="p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 transition-all hover:border-slate-400 dark:hover:border-slate-500"
                              title="Agregar producto"
                            >
                              <PlusIcon className="w-6 h-6" />
                            </button>
                            <button
                              onClick={() => handleEditOrderData(order)}
                              className="p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 transition-all hover:border-slate-400 dark:hover:border-slate-500"
                              title="Editar datos"
                            >
                              <Cog6ToothIcon className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ✅ PRODUCTOS VISIBLES INMEDIATAMENTE - INFORMACIÓN CLAVE PARA COCINA - OPTIMIZADO TABLET */}
                      <div className="space-y-4">
                        {order.items?.map((item, index) => (
                          <div key={index} className={`p-5 rounded-xl border-2 ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                          } shadow-md`}>
                            <div className="flex items-start justify-between">
                              {/* Info del producto */}
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-3">
                                  {/* Imagen del producto */}
                                  {item.product_image && (
                                    <img
                                      src={item.product_image}
                                      alt={item.product_name}
                                      className="w-20 h-20 rounded-xl object-cover border-3 border-gray-300 dark:border-gray-600 shadow-md"
                                      loading="lazy"
                                    />
                                  )}

                                  <div className="flex-1">
                                    {/* Nombre y cantidad destacados */}
                                    <h4 className={`font-black text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} leading-tight`}>
                                      {item.quantity > 1 && (
                                        <span className="bg-slate-600 text-white px-3 py-2 rounded-full text-lg mr-3 font-black">
                                          {item.quantity}x
                                        </span>
                                      )}
                                      {item.product_name}
                                      {item.variant_name && (
                                        <span className={`ml-3 text-lg font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                          • {item.variant_name}
                                        </span>
                                      )}
                                    </h4>

                                    {/* Sabor destacado */}
                                    {item.flavor && (
                                      <div className="mt-2">
                                        <span className="inline-flex items-center px-3 py-2 rounded-full text-base font-bold bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100 border border-slate-400">
                                           {item.flavor.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* ✅ EXTRAS Y SALSAS DESTACADOS PARA COCINA - COLORES SOBRIOS */}
                                {(item.extras?.length > 0 || item.sauces?.length > 0) && (
                                  <div className="space-y-3 ml-20">
                                    {/* Extras */}
                                    {item.extras && item.extras.length > 0 && (
                                      <div>
                                        <span className={`text-base font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                          ➕ EXTRAS:
                                        </span>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {item.extras.map((extra, extraIdx) => (
                                            <span
                                              key={extraIdx}
                                              className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 border-2 border-gray-400 dark:border-gray-500"
                                            >
                                              {extra.name}
                                              {extra.quantity > 1 && (
                                                <span className="ml-2 bg-slate-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                                                  ×{extra.quantity}
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Salsas */}
                                    {item.sauces && item.sauces.length > 0 && (
                                      <div>
                                        <span className={`text-base font-bold ${theme === 'dark' ? 'text-orange-200' : 'text-orange-800'}`}>
                                          🌶️ SALSAS:
                                        </span>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {item.sauces.map((sauce, sauceIdx) => (
                                            <span
                                              key={sauceIdx}
                                              className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100 border-2 border-orange-400 dark:border-orange-600"
                                            >
                                              {sauce.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ✅ COMENTARIOS DESTACADOS - COLORES SOBRIOS */}
                                {item.comment && (
                                  <div className={`mt-4 p-4 rounded-xl border-l-4 border-slate-500 ${
                                    theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
                                  }`}>
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1">
                                        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                          ⚠️ INSTRUCCIONES ESPECIALES:
                                        </span>
                                        <p className={`text-lg font-bold mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'} leading-relaxed`}>
                                          "{item.comment}"
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Precio y botón editar */}
                              <div className="flex items-start gap-4 ml-6">
                                <div className="text-right">
                                  <div className="font-black text-2xl text-green-600">
                                    {formatPrice(calculateOrderItemPrice(item))}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleEditOrderItem(order, index)}
                                  className={`p-4 rounded-xl transition-all border-2 ${
                                    theme === 'dark'
                                      ? 'text-slate-400 hover:bg-slate-800 border-slate-600 hover:border-slate-500'
                                      : 'text-slate-600 hover:bg-slate-50 border-slate-300 hover:border-slate-400'
                                  }`}
                                  title="Editar producto"
                                >
                                  <PencilIcon className="w-6 h-6" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación optimizada para tablet */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-6 py-3 rounded-xl text-lg font-bold transition-all disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-gray-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  Anterior
                </button>
                <span className={`px-6 py-3 text-lg font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-6 py-3 rounded-xl text-lg font-bold transition-all disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-gray-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  Siguiente
                </button>
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
              🍽️ No hay órdenes pendientes
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {filters.period === 'today'
                ? 'No hay órdenes para preparar en este momento.'
                : 'Ajusta los filtros para ver más órdenes.'
              }
            </p>
            <button
              onClick={handleRefreshToday}
              className="mt-6 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-lg font-bold shadow-lg"
            >
              🔄 Actualizar Órdenes
            </button>
          </div>
        )}
      </div>

      {/* ✅ MODALES (sin cambios) */}
      {editingProduct && editingOrder && (
        <ProductModal
          isOpen={true}
          onClose={handleCloseEditModal}
          product={editingProduct}
          initialQuantity={editingItem?.quantity || 1}
          initialOptions={editingProduct.reorderedOptions || editingProduct.options || []}
          initialFlavors={editingProduct.reorderedFlavors || editingProduct.flavors || []}
          initialExtras={editingItem?.extras ? editingItem.extras.map(extra => ({
            id_extra: extra.id_extra,
            name: extra.name,
            price: extra.actual_price,
            quantity: extra.quantity || 1
          })) : []}
          initialSauces={editingItem?.sauces ? editingItem.sauces.map(sauce => ({
            id_sauce: sauce.id_sauce,
            name: sauce.name,
            image: sauce.image
          })) : []}
          initialComment={editingItem?.comment || ''}
          onSave={isEditingOrderMode ? null : handleSaveItemChanges}
          onSaveToOrder={isEditingOrderMode ? handleAddAnotherToOrder : null}
          isEditing={!isEditingOrderMode}
          isEditingOrder={isEditingOrderMode}
        />
      )}

      <ClientPaymentModal
        isOpen={showClientPaymentModal}
        onClose={handleClientPaymentClose}
        onConfirm={handleClientPaymentConfirm}
        theme={theme}
        paymentMethods={paymentMethods}
        initialClientName={editingOrderData?.client_name || ''}
        initialPaymentMethod={editingOrderData?.id_payment_method || null}
        title={`🔄 Editar Orden #${editingOrderData?.id_order}`}
        confirmText="✅ Actualizar Datos"
        clientRequired={false}
      />
    </div>
  );
}

export default Orders;