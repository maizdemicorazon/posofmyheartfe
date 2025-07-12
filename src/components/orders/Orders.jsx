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
import {
  FireIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/solid';
import BusinessHeader from '../menu/BusinessHeader';
import ProductModal from '../modals/ProductModal';
import ClientPaymentModal from '../modals/ClientPaymentModal';
import DeleteModal from '../modals/DeleteModal';
import { getOrders, getOrdersByPeriod, getOrdersGroupedByStatus, getOrderById, updateOrder, deleteOrder, nextStatus } from '../../utils/api';
import { handleApiError, formatPrice, debugLog, getPaymentMethodIcon } from '../../utils/helpers';
import { startOfToday, subDays, subMonths } from 'date-fns';
import { PAYMENT_METHODS } from '../../utils/constants';
import { useNotification } from '../../context/NotificationContext';
import StatusColumn from './StatusColumn';
import OrderCard from './OrderCard';

function Orders({ onBack }) {
  const { theme } = useTheme();
  const { setLoading } = useLoading();
  const { paymentMethods, products, extras, sauces } = useCart();

  // Estados principales
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({ received_orders: [], attending_orders: [], completed_orders: [] });
  const [filteredOrders, setFilteredOrders] = useState({ received_orders: [], attending_orders: [], completed_orders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Estados para columnas colapsables
  const [collapsedColumns, setCollapsedColumns] = useState({
    received_orders: false,
    attending_orders: false,
    completed_orders: false
  });

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

  // Estados unificados para el modal de eliminación
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

  const { showSuccess, showDeleteSuccess, showError, showWarning } = useNotification();

  const subtractDays = (dias) => {
    const resultado = new Date();
    resultado.setDate(resultado.getDate() - dias);
    return resultado;
  };

  // Función para togglear colapso de columnas
  const handleToggleColumnCollapse = (columnKey) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Función para refrescar órdenes del día
  const handleRefreshToday = async () => {
    setIsRefreshing(true);
    try {
      // Forzar período a 'today' y recargar
      setFilters(prev => ({ ...prev, period: 'today' }));
      await loadGroupedOrders();
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

  // Orders.jsx
  const handleNextStatus = async (order) => {
    try {
      setLoading(true);
      const nextStateMessage = order.status === 'RECEIVED' ? 'En Preparación' : 'Completada';
      debugLog('ORDERS', `Updating status for order #${order.id_order} to next state from ${order.status }.`);

      let status = order.status;

      switch(status){
          case 'RECEIVED': status = 'ATTENDING'; break;
          case 'ATTENDING': status = 'COMPLETED'; break;
          default:
              status = 'ATTENDING';
              break;
          }

      await nextStatus(order.id_order, status);

      showSuccess('✅ Estado Actualizado', `La orden #${order.id_order} ahora está: ${nextStateMessage}`);

      // Refrescar todo el tablero para mover la tarjeta de columna
      await handleRefresh();

    } catch (error) {
      console.log(handleApiError(error));
      showError('❌ No se pudo actualizar el estado de la orden.');
    } finally {
      setLoading(false);
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
    await handleRefresh();
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

  // Función para eliminar orden completa
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
    setIsDeletingFullOrder(true); // Marcar como eliminación completa
    setShowDeleteModal(true);
  };

  // Función para eliminar producto específico
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
    setIsDeletingFullOrder(false);
    setShowDeleteModal(true);
  };

  // Función unificada para confirmar eliminación
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
        // Eliminar orden completa directamente
        console.log('🗑️ Eliminando orden completa directamente:', deletingOrder.id_order);
        await deleteOrder(deletingOrder.id_order);

        // Actualizar estado local - remover la orden completa
        setOrders(prevOrders =>
          prevOrders.filter(ord => ord.id_order !== deletingOrder.id_order)
        );

        showDeleteSuccess(
          `La orden #${deletingOrder.id_order} ha sido eliminada completamente con todos sus productos`
        );
        await handleRefresh();
      } else {
        // Eliminar producto específico
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

          const productName = deletingItem?.product_name || 'producto';
          showDeleteSuccess(`La orden #${deletingOrder.id_order} y el producto "${productName}" han sido eliminados completamente`);
          handleRefreshToday();

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

  // Función para eliminar solo el producto
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

      const productName = deletingItem?.product_name || 'producto';
       showDeleteSuccess(
        `${productName} ha sido eliminado de la orden #${deletingOrder.id_order}`
      );
    await handleRefresh();
    } catch (error) {
      throw error; // Re-lanzar para que lo maneje handleDeleteConfirm
    }
  };

  // Función para cancelar eliminación
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingItem(null);
    setDeletingOrder(null);
    setDeletingItemIndex(null);
    setIsDeletingFullOrder(false);
  };

     const loadGroupedOrders = async () => {
        try {
          if (!isRefreshing) setIsLoading(true);
          setLoading(true);
          debugLog('ORDERS', 'Loading orders grouped by status...');

          const response = await getOrdersGroupedByStatus();
          const ordersData = {
              received_orders: response.received_orders || [],
              attending_orders: response.attending_orders || [],
              completed_orders: response.completed_orders || [],
          };
          setGroupedOrders(ordersData);
        } catch (error) {
          handleApiError(error);
          setGroupedOrders({ received_orders: [], attending_orders: [], completed_orders: [] });
        } finally {
          setIsLoading(false);
          setLoading(false);
          setIsRefreshing(false);
        }
      };

      const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadGroupedOrders();
        showSuccess('🔄 ¡Órdenes actualizadas!', 'Los estados se han sincronizado.', 2000);
      };

        useEffect(() => {
          loadGroupedOrders();
        }, []);

        useEffect(() => {
          applyFilters();
        }, [groupedOrders, filters]);

    // Función mejorada para aplicar filtros
// Orders.jsx
    const applyFilters = () => {
        const { received_orders, attending_orders, completed_orders } = groupedOrders;

        const filterAndSort = (orders) => {
        // Calcula la fecha de inicio una sola vez basado en el filtro de período
        const startDate = getStartDateForPeriod(filters.period);

        const filtered = orders.filter(order => {
            // --- Filtro por Período ---
            // Convierte la fecha de la orden y la compara con la fecha de inicio del período
            const orderDate = new Date(order.created_at);
            const matchesPeriod = orderDate >= startDate;

            // --- Filtros Existentes (sin cambios) ---
            const searchTerm = filters.search.toLowerCase();
            const orderTotal = order.total_amount || order.bill || (order.items ? order.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);

            const matchesSearch = !searchTerm ||
                order.client_name?.toLowerCase().includes(searchTerm) ||
                order.id_order.toString().includes(searchTerm) ||
                order.items?.some(item => item.product_name?.toLowerCase().includes(searchTerm));

            const matchesClient = !filters.clientName || order.client_name?.toLowerCase().includes(filters.clientName.toLowerCase());
            const matchesPayment = !filters.paymentMethod || order.id_payment_method?.toString() === filters.paymentMethod;
            const matchesMinAmount = !filters.minAmount || parseFloat(orderTotal) >= parseFloat(filters.minAmount);
            const matchesMaxAmount = !filters.maxAmount || parseFloat(orderTotal) <= parseFloat(filters.maxAmount);

            // --- Combinación de todos los filtros ---
            return matchesPeriod && matchesSearch && matchesClient && matchesPayment && matchesMinAmount && matchesMaxAmount;
        });

        // Ordenamiento (sin cambios)
        return filtered.sort((a, b) => {
            switch (filters.sortBy) {
                case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
                case 'highest':
                    const totalA_h = a.total_amount || a.bill || (a.items ? a.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
                    const totalB_h = b.total_amount || b.bill || (b.items ? b.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
                    return parseFloat(totalB_h) - parseFloat(totalA_h);
                case 'lowest':
                    const totalA_l = a.total_amount || a.bill || (a.items ? a.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
                    const totalB_l = b.total_amount || b.bill || (b.items ? b.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);
                    return parseFloat(totalA_l) - parseFloat(totalB_l);
                case 'client': return (a.client_name || '').localeCompare(b.client_name || '');
                default: return new Date(b.created_at) - new Date(a.created_at); // newest
            }
        });
    };

    setFilteredOrders({
      received_orders: filterAndSort(received_orders || []),
      attending_orders: filterAndSort(attending_orders || []),
      completed_orders: filterAndSort(completed_orders || [])
    });
};

  // Función para manejar cambios en filtros
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };


  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({
      search: '',
      clientName: '',
      paymentMethod: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'newest',
      showFilters: filters.showFilters
    });
  };

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
        await handleRefresh();
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
      await loadGroupedOrders();

      showSuccess(
        '✅ Producto agregado',
        `El producto se agregó a la orden #${editingOrder.id_order}. Configura el siguiente producto.`,
        2000
      );
      await handleRefresh();

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

  // Función para renderizar las tarjetas de orden usando el componente OrderCard
  const renderOrderCard = (order) => {
    const urgency = getOrderUrgency(order.created_at);
    const orderTotal = order.bill || order.total_amount || (order.items ? order.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);

    return (
      <OrderCard
        key={order.id_order}
        order={order}
        theme={theme}
        urgency={urgency}
        orderTotal={orderTotal}
        getTimeElapsed={getTimeElapsed}
        calculateOrderItemPrice={calculateOrderItemPrice}
        handleNextStatus={handleNextStatus}
        handleAddProductToOrder={handleAddProductToOrder}
        handleEditOrderData={handleEditOrderData}
        handleDeleteOrderFull={handleDeleteOrderFull}
        handleEditOrderItem={handleEditOrderItem}
        handleDeleteOrderItem={handleDeleteOrderItem}
      />
    );
  };

  // Estadísticas mejoradas
  const getFilterStats = () => {
    const allFilteredOrders = [
       ...(filteredOrders.received_orders || []),
       ...(filteredOrders.attending_orders || []),
       ...(filteredOrders.completed_orders || []),
    ];

    const total = allFilteredOrders.reduce((sum, order) => {
        const orderTotal = order.total_amount || order.bill || (order.items ? order.items.reduce((itemSum, item) => itemSum + calculateOrderItemPrice(item), 0) : 0);
        return sum + parseFloat(orderTotal);
    }, 0);

    const count = allFilteredOrders.length;

     return {
       count: count,
       total: total,
       averageTicket: count > 0 ? total / count : 0
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
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Información básica */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 shadow-lg border-2 ${theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white border-gray-600 hover:border-gray-500 hover:shadow-xl'
                  : 'bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:shadow-xl'
                } transform hover:-translate-y-0.5`}
                title="Volver al menú principal"
              >
                <ArrowLeftIcon className="w-7 h-7 font-bold" />
              </button>
              <div className="flex items-center gap-3">
                <ShoppingBagIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h1 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    📋 GESTIÓN DE PEDIDOS
                  </h1>
                  <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.count} órdenes • {formatPrice(stats.total)} total • Promedio: {formatPrice(stats.averageTicket)}
                  </p>
                </div>
              </div>
            </div>

            {/* Controles */}
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
                title="Actualizar órdenes"
              >
                <ArrowPathIcon className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
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
                title="Filtros"
              >
                <AdjustmentsHorizontalIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Filtros avanzados */}
          {filters.showFilters && (
            <div className={`pb-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Período */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Período
                  </label>
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

                {/* Búsqueda general */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Búsqueda general
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Buscar por orden, cliente, producto..."
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Cliente */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={filters.clientName}
                    onChange={(e) => handleFilterChange('clientName', e.target.value)}
                    placeholder="Nombre del cliente..."
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Método de pago */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Método de pago
                  </label>
                  <select
                    value={filters.paymentMethod}
                    onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Todos los métodos</option>
                    {paymentMethods.map(method => (
                      <option key={method.id_payment_method} value={method.id_payment_method}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monto mínimo */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Monto mínimo
                  </label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    placeholder="$0.00"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Monto máximo */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Monto máximo
                  </label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    placeholder="$999.99"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Ordenar por */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ordenar por
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
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

                {/* Botón limpiar */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

       {/* --- CUERPO CON EL TABLERO KANBAN --- */}
            <main className="flex-grow p-4 lg:p-6 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  <StatusColumn
                    title="🔵 RECIBIDAS"
                    count={filteredOrders.received_orders?.length || 0}
                    orders={filteredOrders.received_orders || []}
                    renderOrderCard={renderOrderCard}
                    theme={theme}
                    bgColor={theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#EBF8FF'}
                    textColor={theme === 'dark' ? '#93c5fd' : '#2563eb'}
                    borderColor="#3b82f6"
                    isCollapsed={collapsedColumns.received_orders}
                    onToggleCollapse={() => handleToggleColumnCollapse('received_orders')}
                  />
                  <StatusColumn
                    title="🟡 EN PREPARACIÓN"
                    count={filteredOrders.attending_orders?.length || 0}
                    orders={filteredOrders.attending_orders || []}
                    renderOrderCard={renderOrderCard}
                    theme={theme}
                    bgColor={theme === 'dark' ? 'rgba(234, 179, 8, 0.1)' : '#FFFBEB'}
                    textColor={theme === 'dark' ? '#fde047' : '#ca8a04'}
                    borderColor="#eab308"
                    isCollapsed={collapsedColumns.attending_orders}
                    onToggleCollapse={() => handleToggleColumnCollapse('attending_orders')}
                  />
                  <StatusColumn
                    title="🟢 COMPLETADAS"
                    count={filteredOrders.completed_orders?.length || 0}
                    orders={filteredOrders.completed_orders || []}
                    renderOrderCard={renderOrderCard}
                    theme={theme}
                    bgColor={theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : '#F0FFF4'}
                    textColor={theme === 'dark' ? '#86efac' : '#16a34a'}
                    borderColor="#22c55e"
                    isCollapsed={collapsedColumns.completed_orders}
                    onToggleCollapse={() => handleToggleColumnCollapse('completed_orders')}
                  />
                </div>
              )}
            </main>

      {/* Modales */}
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

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        theme={theme}
        order={deletingOrder}
        item={deletingItem}
        itemIndex={deletingItemIndex}
        calculateItemPrice={calculateOrderItemPrice}
        isDeletingFullOrder={isDeletingFullOrder}
      />
    </div>
  );
}

export default Orders;