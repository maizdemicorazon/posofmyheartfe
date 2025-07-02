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
  PlusIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
import ProductModal from '../modals/ProductModal';
import ClientPaymentModal from '../modals/ClientPaymentModal';
import Swal from 'sweetalert2';
import { getOrders, getOrdersByPeriod, updateOrder, getOrderById } from '../../utils/api';
import { handleApiError, formatPrice, debugLog } from '../../utils/helpers';
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

      console.log(`💰 Order item price calculation:`, {
        productName: item.product_name,
        basePrice: parseFloat(item.product_price || 0),
        extrasTotal,
        extrasCount: item.extras?.length || 0,
        quantity: itemQuantity,
        subtotalBeforeQuantity: parseFloat(item.product_price || 0) + extrasTotal,
        finalPrice: totalPrice
      });

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

                // ✅ CALCULAR TOTAL CORRECTO INCLUYENDO EXTRAS
                const orderTotal = order.total_amount || order.bill || order.calculated_total ||
                  (order.items ? order.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0);

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
                            {formatPrice(parseFloat(orderTotal))}
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {order.items?.length || 0} producto{order.items?.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                          {/* ✅ BOTÓN: Agregar producto a orden */}
                          <button
                            onClick={() => handleAddProductToOrder(order)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'text-green-400 hover:bg-green-900/20 hover:text-green-300'
                                : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                            }`}
                            title="Agregar producto a la orden"
                          >
                            <PlusIcon className="w-5 h-5" />
                          </button>

                          {/* ✅ BOTÓN: Editar datos de la orden - SOLO ESTE MUESTRA EL MODAL */}
                          <button
                            onClick={() => handleEditOrderData(order)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'text-blue-400 hover:bg-blue-900/20 hover:text-blue-300'
                                : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                            title="Editar cliente y método de pago"
                          >
                            <Cog6ToothIcon className="w-5 h-5" />
                          </button>

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
                        {/* Lista detallada de productos mejorada */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Productos de la orden:
                            </h4>
                            {/* ✅ VERIFICACIÓN DE TOTAL CALCULADO */}
                            {(() => {
                              const calculatedTotal = order.items ? order.items.reduce((sum, item) => sum + calculateOrderItemPrice(item), 0) : 0;
                              const backendTotal = parseFloat(order.bill);
                              const difference = Math.abs(calculatedTotal - backendTotal);

                              if (difference > 0.01 && backendTotal > 0) { // Si hay diferencia mayor a 1 centavo y hay total del backend
                                return (
                                  <div className={`text-xs px-2 py-1 rounded ${
                                    theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    ⚠️ Calculado: {formatPrice(calculatedTotal)} | Backend: {formatPrice(backendTotal)}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
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
                                        {/* Desglose de precio */}
                                        <div className="flex items-center gap-2">
                                          <span>Precio base:</span>
                                          <span className="font-medium">{formatPrice(parseFloat(item.product_price || 0))}</span>
                                          {item.quantity > 1 && <span>× {item.quantity}</span>}
                                        </div>

                                        {/* Extras y salsas */}
                                        {item.extras && item.extras.length > 0 && (
                                          <div>
                                            <div>Extras: {item.extras.map(e => {
                                              const extraPrice = parseFloat(e.actual_price || e.price || 0);
                                              const extraQty = parseInt(e.quantity || 1);
                                              return `${e.name} (${formatPrice(extraPrice)}${extraQty > 1 ? ` ×${extraQty}` : ''})`;
                                            }).join(', ')}</div>
                                          </div>
                                        )}
                                        {item.sauces && item.sauces.length > 0 && (
                                          <div>Salsas: {item.sauces.map(s => s.name).join(', ')}</div>
                                        )}
                                      </div>
                                      {/* Comentarios de la orden */}
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
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="font-semibold text-green-600">
                                      {formatPrice(calculateOrderItemPrice(item))}
                                    </div>
                                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {item.quantity > 1 && `${item.quantity}x ${formatPrice(parseFloat(item.product_price || 0))}`}
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

      {/* ✅ MODAL DE EDICIÓN CON MANEJO DUAL: EDITAR PRODUCTO vs AGREGAR A ORDEN */}
      {editingProduct && editingOrder && (
        <ProductModal
          isOpen={true}
          onClose={handleCloseEditModal}
          product={editingProduct}
          initialQuantity={editingItem?.quantity || 1}
          // ✅ USAR OPCIONES REORDENADAS (SELECCIONADA PRIMERO)
          initialOptions={editingProduct.reorderedOptions || editingProduct.options || []}
          // ✅ USAR SABORES REORDENADOS (SELECCIONADO PRIMERO)
          initialFlavors={editingProduct.reorderedFlavors || editingProduct.flavors || []}
          // ✅ EXTRAS SELECCIONADOS EN LA ORDEN (solo si está editando item específico)
          initialExtras={editingItem?.extras ? editingItem.extras.map(extra => ({
            id_extra: extra.id_extra,
            name: extra.name,
            price: extra.actual_price,
            quantity: extra.quantity || 1
          })) : []}
          // ✅ SALSAS SELECCIONADAS EN LA ORDEN (solo si está editando item específico)
          initialSauces={editingItem?.sauces ? editingItem.sauces.map(sauce => ({
            id_sauce: sauce.id_sauce,
            name: sauce.name,
            image: sauce.image
          })) : []}
          // ✅ COMENTARIO INICIAL
          initialComment={editingItem?.comment || ''}
          // ✅ PROPS PARA MANEJO DUAL DE EDICIÓN - SIN MODAL
          onSave={isEditingOrderMode ? null : handleSaveItemChanges} // Solo para editar producto individual
          onSaveToOrder={isEditingOrderMode ? handleAddAnotherToOrder : null} // Solo para agregar a orden
          isEditing={!isEditingOrderMode} // True si está editando, False si está agregando
          isEditingOrder={isEditingOrderMode} // ✅ Nueva prop para distinguir modo
        />
      )}

      {/* ✅ MODAL DE CLIENTE Y PAGO - SOLO PARA EDITAR DATOS DE ORDEN */}
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