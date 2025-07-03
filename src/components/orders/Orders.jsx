import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLoading } from '../../context/LoadingContext';
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
import DeleteModal from '../modals/DeleteModal';
import { getOrders, getOrdersByPeriod, updateOrder, getOrderById, deleteOrder } from '../../utils/api';
import { handleApiError, formatPrice, debugLog, getPaymentMethodIcon } from '../../utils/helpers';
import { startOfToday, subDays, subMonths } from 'date-fns';
import { PAYMENT_METHODS } from '../../utils/constants';
import { useNotification } from '../../context/NotificationContext';

function Orders({ onBack }) {
  const { theme } = useTheme();
  const { setLoading } = useLoading();
  const { paymentMethods, products, extras, sauces } = useCart();

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

  // Estados para el modal de cliente y pago
  const [showClientPaymentModal, setShowClientPaymentModal] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState(null);

  // Estado para distinguir entre editar producto vs agregar a orden
  const [isEditingOrderMode, setIsEditingOrderMode] = useState(false);

  // Estado para el auto-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ✅ ESTADOS UNIFICADOS PARA EL MODAL DE ELIMINACIÓN
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deletingItemIndex, setDeletingItemIndex] = useState(null);
  const [isDeletingFullOrder, setIsDeletingFullOrder] = useState(false);

  // Estados para edición completa de orden
  const [isEditingFullOrder, setIsEditingFullOrder] = useState(false);
  const [fullOrderEdit, setFullOrderEdit] = useState({
    id_order: null,
    client_name: '',
    comment: '',
    id_payment_method: null,
    items: []
  });

  const { showSuccess, showError, showWarning } = useNotification();

  const subtractDays = (dias) => {
    const resultado = new Date();
    resultado.setDate(resultado.getDate() - dias);
    return resultado;
  };

  // Función para refrescar órdenes del día
  const handleRefreshToday = async () => {
    setIsRefreshing(true);
    try {
      // Forzar período a 'today' y recargar
      setFilters(prev => ({ ...prev, period: 'today' }));
      await loadOrdersByPeriod();
      setLastRefresh(new Date());

      showSuccess(
         '🔄 ¡Órdenes actualizadas!',
         'Las órdenes se han actualizado correctamente',
         2000
       );

    } catch (error) {
     showError(
        'No se pudieron actualizar las órdenes. Inténtalo de nuevo.'
      );

      handleApiError(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Función para obtener tiempo transcurrido desde la orden
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

  // Función para determinar urgencia de la orden
  const getOrderUrgency = (orderDate) => {
    try {
      const now = new Date();
      const orderTime = new Date(orderDate);
      const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));

      if (diffInMinutes > 30) return 'urgent';
      if (diffInMinutes > 15) return 'warning';
      return 'normal';
    } catch (error) {
      return 'normal';
    }
  };

  // Función para editar datos de la orden (cliente y método de pago)
  const handleEditOrderData = async (order) => {
    setEditingOrderData(order);
    setShowClientPaymentModal(true);
  };

  // Función para manejar confirmación del modal de cliente y pago
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

      // Construir payload para actualizar solo datos de la orden
      const currentItems = editingOrderData.items || [];

      // Mapear productos existentes sin cambios
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
          updated_flavor: item.flavor
        })
      }));

      const orderUpdateData = {
        id_payment_method: modalData.selectedPaymentMethod,
        client_name: modalData.clientName || 'Cliente POS',
        updated_items: existingItems
      };

      console.log('📤 Enviando actualización de datos de orden:', orderUpdateData);

      await updateOrder(editingOrderData.id_order, orderUpdateData);

      // Actualizar el estado local
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

      showSuccess(
        '✅ ¡Datos actualizados!',
        'Los datos de la orden se han actualizado correctamente',
        2000
      );

    } catch (error) {
      debugLog('ERROR', 'Failed to update order data:', error);
      handleApiError(error);

      showError(
        'No se pudo actualizar los datos de la orden. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
      setEditingOrderData(null);
    }
  };

  // Función para cerrar modal de datos de orden
  const handleClientPaymentClose = () => {
    setShowClientPaymentModal(false);
    setEditingOrderData(null);
  };

    // ✅ FUNCIÓN SIMPLIFICADA PARA ELIMINAR PRODUCTO
    const handleDeleteOrderFull = async (order) => {
      if (!order || !order.id_order) {
        showError(
            'No se puede eliminar esta orden'
        );
        return;
      }

      // Configurar datos para el modal unificado
      setDeletingOrder(order);
      setDeletingItem(null); // No hay item específico
      setDeletingItemIndex(null); // No hay index específico
      setIsDeletingFullOrder(true); // ✅ Marcar como eliminación completa
      setShowDeleteModal(true);
    };

  // ✅ FUNCIÓN SIMPLIFICADA PARA ELIMINAR PRODUCTO
  const handleDeleteOrderItem = async (order, itemIndex) => {
    const item = order.items[itemIndex];
    if (!item) {
      showError(
          'No se puede eliminar este item'
      );
      return;
    }

    // Configurar datos para el modal unificado
    setDeletingOrder(order);
    setDeletingItem(item);
    setDeletingItemIndex(itemIndex);
    setShowDeleteModal(true);
  };

    // ✅ FUNCIÓN UNIFICADA PARA CONFIRMAR ELIMINACIÓN - CON NOTIFICACIONES PERSONALIZADAS
    const handleDeleteConfirm = async () => {
      try {
        setShowDeleteModal(false);
        setLoading(true);

        debugLog('ORDERS', 'Delete confirmation:', {
          orderId: deletingOrder.id_order,
          isDeletingFullOrder,
          itemIndex: deletingItemIndex,
          productName: deletingItem?.product_name,
          hasItem: !!deletingItem
        });

        if (isDeletingFullOrder) {
          // ✅ CASO 1: ELIMINAR ORDEN COMPLETA DIRECTAMENTE
          console.log('🗑️ Eliminando orden completa directamente:', deletingOrder.id_order);
          await deleteOrder(deletingOrder.id_order);

          // Actualizar estado local - remover la orden completa
          setOrders(prevOrders =>
            prevOrders.filter(ord => ord.id_order !== deletingOrder.id_order)
          );

          // ✅ NUEVA NOTIFICACIÓN PERSONALIZADA - ORDEN COMPLETA
          showSuccess(
            '🗑️ ¡Orden eliminada!',
            `La orden #${deletingOrder.id_order} ha sido eliminada completamente con todos sus productos`,
            3000
          );

        } else {
          // ✅ CASO 2: ELIMINAR PRODUCTO ESPECÍFICO
          const currentItems = deletingOrder.items || [];
          const isLastProduct = currentItems.length === 1;

          if (isLastProduct) {
            // Es el último producto, eliminar orden completa
            console.log('🗑️ Eliminando orden completa (último producto):', deletingOrder.id_order);
            await deleteOrder(deletingOrder.id_order);

            // Actualizar estado local - remover la orden completa
            setOrders(prevOrders =>
              prevOrders.filter(ord => ord.id_order !== deletingOrder.id_order)
            );

            // ✅ NUEVA NOTIFICACIÓN PERSONALIZADA - ÚLTIMO PRODUCTO
            const productName = deletingItem?.product_name || 'producto';
            showSuccess(
              '🗑️ ¡Orden eliminada!',
              `La orden #${deletingOrder.id_order} y el producto "${productName}" han sido eliminados completamente`,
              3000
            );

          } else {
            // Hay más productos, eliminar solo el producto específico
            await handleDeleteSingleProduct();
          }
        }

      } catch (error) {
        debugLog('ERROR', 'Failed to delete order/item:', error);
        handleApiError(error);

        const errorAction = isDeletingFullOrder ? 'eliminar la orden completa' :
                            (deletingOrder.items?.length === 1 ? 'eliminar la orden' : 'eliminar el producto');

        // ✅ NOTIFICACIÓN DE ERROR PERSONALIZADA
        showError(
          `No se pudo ${errorAction}. Inténtalo de nuevo.`
        );

      } finally {
        setLoading(false);
        // Limpiar estados
        setDeletingItem(null);
        setDeletingOrder(null);
        setDeletingItemIndex(null);
        setIsDeletingFullOrder(false);
      }
    };


  // ✅ FUNCIÓN PARA ELIMINAR SOLO EL PRODUCTO - CON NOTIFICACIONES PERSONALIZADAS
    const handleDeleteSingleProduct = async () => {
      try {
        const currentItems = deletingOrder.items || [];

        console.log('📝 Eliminando producto - quedarán', currentItems.length - 1, 'productos');

        // Filtrar todos los productos excepto el que se va a eliminar
        const remainingItems = currentItems
          .filter((_, index) => index !== deletingItemIndex)
          .map(item => ({
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
              updated_flavor: item.flavor
            })
          }));

        // Payload final - mantener datos actuales de cliente y pago
        const orderUpdateData = {
          id_payment_method: deletingOrder.id_payment_method,
          client_name: deletingOrder.client_name || 'Cliente POS',
          updated_items: remainingItems
        };

        console.log('📤 Enviando datos para eliminar producto:', {
          orderId: deletingOrder.id_order,
          itemsRemaining: remainingItems.length,
          payload: orderUpdateData
        });

        await updateOrder(deletingOrder.id_order, orderUpdateData);

        // Actualizar el estado local - solo filtrar el producto
        setOrders(prevOrders =>
          prevOrders.map(ord =>
            ord.id_order === deletingOrder.id_order
              ? {
                  ...ord,
                  items: ord.items.filter((_, index) => index !== deletingItemIndex),
                  // Recalcular total si no viene del backend
                  ...((!ord.total_amount && !ord.bill) && {
                    calculated_total: ord.items
                      .filter((_, index) => index !== deletingItemIndex)
                      .reduce((sum, item) => sum + calculateOrderItemPrice(item), 0)
                  })
                }
              : ord
          )
        );

        // ✅ NUEVA NOTIFICACIÓN PERSONALIZADA - PRODUCTO INDIVIDUAL
        const productName = deletingItem?.product_name || 'producto';
        showSuccess(
          '🗑️ ¡Producto eliminado!',
          `${productName} ha sido eliminado de la orden #${deletingOrder.id_order}`,
          2500
        );

      } catch (error) {
        throw error; // Re-lanzar para que lo maneje handleDeleteConfirm
      }
    };

  // ✅ FUNCIÓN PARA CANCELAR ELIMINACIÓN DESDE MODAL UNIFICADO
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingItem(null);
    setDeletingOrder(null);
    setDeletingItemIndex(null);
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
          all: () => new Date("2025-05-01"), // fecha de inauguración
      };

      const getStartDate = periodMap[period] || periodMap.today;
      return getStartDate();
  }

  const loadOrdersByPeriod = async () => {
    try {
      setLoading(true);
      setIsLoading(true);
      debugLog('ORDERS', 'Loading orders with period:', filters.period);

      const start = queryFormatDate(getStartDateForPeriod(filters.period));
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
      handleApiError(error);
      setOrders([]);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  // Función mejorada para aplicar filtros
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
    setCurrentPage(1);
  };

  // Función para limpiar filtros
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

  // Función para manejar cambios en filtros
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

  // Función para editar producto individual
  const handleEditOrderItem = async (order, itemIndex) => {
    try {
      const item = order.items[itemIndex];
      if (!item || !item.id_product) {
        showError(
            'No se puede editar este producto'
        );
        return;
      }

      setLoading(true);
      debugLog('ORDERS', 'Editing order item:', {
        orderId: order.id_order,
        itemIndex,
        item
      });

      // Cargar información completa del producto desde el contexto
      let completeProductInfo = null;

      if (products && products.length > 0) {
        completeProductInfo = products.find(p => p.id_product === item.id_product);
        console.log('🔍 Found product in context:', completeProductInfo);
      }

      // Construir estructura completa para el modal
      const completeProduct = {
        id_product: item.id_product,
        name: item.product_name,
        image: item.product_image,
        price: item.product_price,
        product_price: item.product_price,
        options: completeProductInfo?.options || completeProductInfo?.variants || [
          {
            id_variant: item.id_variant,
            size: item.variant_name,
            price: item.product_price
          }
        ],
        flavors: completeProductInfo?.flavors || (item.flavor ? [
          {
            id_flavor: item.flavor.id_flavor,
            name: item.flavor.name
          }
        ] : []),
        ...(completeProductInfo || {})
      };

      // Reorganizar opciones para que la seleccionada esté primera
      let initialOptions = [...(completeProduct.options || [])];
      if (item.id_variant && initialOptions.length > 1) {
        const selectedIndex = initialOptions.findIndex(opt => opt.id_variant === item.id_variant);
        if (selectedIndex > 0) {
          const selectedOption = initialOptions.splice(selectedIndex, 1)[0];
          initialOptions.unshift(selectedOption);
        }
      }

      // Reorganizar sabores para que el seleccionado esté primero
      let initialFlavors = [...(completeProduct.flavors || [])];
      if (item.flavor?.id_flavor && initialFlavors.length > 1) {
        const selectedIndex = initialFlavors.findIndex(flavor => flavor.id_flavor === item.flavor.id_flavor);
        if (selectedIndex > 0) {
          const selectedFlavor = initialFlavors.splice(selectedIndex, 1)[0];
          initialFlavors.unshift(selectedFlavor);
        }
      }

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

      // Crear objeto final con toda la información
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
      setIsEditingOrderMode(false);

    } catch (error) {
      debugLog('ERROR', 'Failed to load product for editing:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar producto a orden existente
  const handleAddProductToOrder = async (order) => {
    try {
      setLoading(true);
      debugLog('ORDERS', 'Adding product to existing order:', {
        orderId: order.id_order,
        availableProductsCount: products?.length || 0
      });

      if (!products || products.length === 0) {
          showWarning(
              'No hay productos disponibles',
              'No se encontraron productos en el sistema. Verifica que los productos estén cargados.',
              4000
              );
        return;
      }

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

      // Crear un producto genérico para seleccionar
      const genericProduct = {
        id_product: null,
        name: 'Seleccionar Producto',
        image: null,
        price: 0,
        options: [],
        flavors: []
      };

      setEditingOrder(order);
      setCurrentItemIndex(null);
      setEditingItem(null);
      setEditingProduct(genericProduct);
      setIsEditingOrderMode(true);

    } catch (error) {
      debugLog('ERROR', 'Failed to prepare add product to order:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Función para guardar cambios de producto individual
  const handleSaveItemChanges = async (itemData) => {
    try {
      setLoading(true);

      debugLog('ORDERS', 'Saving item changes directly:', {
        orderId: editingOrder.id_order,
        itemIndex: currentItemIndex,
        itemData
      });

      // Construir el payload según el formato correcto del backend
      const currentItems = editingOrder.items || [];

      // Mapear todos los productos de la orden
      const updatedItems = currentItems.map((item, index) => {
        if (index === currentItemIndex) {
          // Producto que se está editando
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
              updated_flavor: itemData.selectedFlavor
            })
          };
        } else {
          // Productos sin cambios
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
              updated_flavor: item.flavor
            })
          };
        }
      });

      // Payload final
      const orderUpdateData = {
        id_payment_method: editingOrder.id_payment_method,
        client_name: editingOrder.client_name || 'Cliente POS',
        updated_items: updatedItems
      };

      console.log('📤 Enviando datos de actualización de producto:', orderUpdateData);

      await updateOrder(editingOrder.id_order, orderUpdateData);

      // Actualizar el estado local
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
                        updated_flavor: itemData.selectedFlavor || item.flavor,
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
                ...((!order.total_amount && !order.bill) && {
                  calculated_total: order.items.reduce((sum, item, index) => {
                    if (index === currentItemIndex) {
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

     showSuccess(
        '✅ ¡Producto actualizado!',
        'Los cambios se han guardado correctamente',
        2000
      );

    } catch (error) {
      debugLog('ERROR', 'Failed to update order item:', error);
      handleApiError(error);

     showError(
         'No se pudo actualizar el producto. Inténtalo de nuevo.'
       );
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar producto adicional a la orden
  const handleAddAnotherToOrder = async (itemData) => {
    try {
      setLoading(true);

      debugLog('ORDERS', 'Adding another product to order:', {
        orderId: editingOrder.id_order,
        itemData
      });

      // Construir payload según el formato correcto del backend
      const currentItems = editingOrder.items || [];

      // Mapear productos existentes (sin cambios)
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
          updated_flavor: item.flavor
        })
      }));

      // Agregar el nuevo producto
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
          updated_flavor: itemData.selectedFlavor
        })
      };

      // Payload final según el formato del backend
      const orderUpdateData = {
        id_payment_method: editingOrder.id_payment_method,
        client_name: editingOrder.client_name || 'Cliente POS',
        updated_items: [
          ...existingItems,
          newProduct
        ]
      };

      console.log('📤 Enviando datos para agregar producto:', orderUpdateData);

      await updateOrder(editingOrder.id_order, orderUpdateData);

      // Recargar la orden actualizada
      await loadOrdersByPeriod();

      showSuccess(
        '✅ Producto agregado',
        `El producto se agregó a la orden #${editingOrder.id_order}. Configura el siguiente producto.`,
        2000
      );

      return true;

    } catch (error) {
      debugLog('ERROR', 'Failed to add product to order:', error);
      handleApiError(error);

    showError(
        'No se pudo agregar el producto a la orden. Inténtalo de nuevo.'
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular precio total de un item de orden
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
    setIsEditingOrderMode(false);
    debugLog('ORDERS', 'Edit modal closed');
  };

  // Cálculos para paginación
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Estadísticas mejoradas
  const getFilterStats = () => {
    const total = filteredOrders.reduce((sum, order) => {
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
                    📋 LISTADO DE PEDIDOS
                  </h1>
                  <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.count} órdenes activas • Actualizado: {lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Controles de cocina */}
            <div className="flex items-center gap-3">
              {/* Botón refrescar */}
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

              {/* Botón filtros */}
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

          {/* Filtros simplificados para cocina */}
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

      {/* Contenido optimizado para cocina y tablet */}
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
            {/* Lista optimizada para cocina y tablet */}
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
                    {/* Header compacto con info clave */}
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
                            <button
                                  onClick={() => handleDeleteOrderFull(order)}
                                  className="p-3 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg border-2 border-red-300 dark:border-red-600 transition-all hover:border-red-400 dark:hover:border-red-500"
                                  title="Eliminar orden completa"
                                >
                                  <TrashIcon className="w-6 h-6" />
                                </button>
                          </div>
                        </div>
                      </div>

                      {/* Productos visibles inmediatamente */}
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

                                {/* Extras y salsas destacados para cocina */}
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

                                {/* Comentarios destacados */}
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

                              {/* Precio y botones de acción */}
                              <div className="flex items-start gap-4 ml-6">
                                <div className="text-right">
                                  <div className="font-black text-2xl text-green-600">
                                    {formatPrice(calculateOrderItemPrice(item))}
                                  </div>
                                </div>

                                {/* Botones de acción: Editar y Eliminar */}
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => handleEditOrderItem(order, index)}
                                    className={`p-4 rounded-xl transition-all border-2 ${
                                      theme === 'dark'
                                        ? 'text-blue-400 hover:bg-blue-900/20 border-blue-600 hover:border-blue-500'
                                        : 'text-blue-600 hover:bg-blue-50 border-blue-300 hover:border-blue-400'
                                    }`}
                                    title="Editar producto"
                                  >
                                    <PencilIcon className="w-6 h-6" />
                                  </button>

                                  {/* Botón eliminar */}
                                  <button
                                    onClick={() => handleDeleteOrderItem(order, index)}
                                    className={`p-4 rounded-xl transition-all border-2 ${
                                      theme === 'dark'
                                        ? 'text-red-400 hover:bg-red-900/20 border-red-600 hover:border-red-500'
                                        : 'text-red-600 hover:bg-red-50 border-red-300 hover:border-red-400'
                                    }`}
                                    title="Eliminar producto"
                                  >
                                    <TrashIcon className="w-6 h-6" />
                                  </button>
                                </div>
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

      {/* ✅ MODALES */}
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

      {/* ✅ MODAL UNIFICADO DE ELIMINACIÓN */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        theme={theme}
        order={deletingOrder}
        item={deletingItem}
        itemIndex={deletingItemIndex}
        calculateItemPrice={calculateOrderItemPrice}
      />
    </div>
  );
}

export default Orders;