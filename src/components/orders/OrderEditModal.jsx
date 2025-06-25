import React, { useState, useEffect, useCallback } from 'react';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext';
import { useLoading } from '../../context/LoadingContext';
import { useCart } from '../../context/CartContext'; // ✅ NUEVO: Import del contexto del carrito
import {
  XMarkIcon,
  ArrowPathIcon,
  CheckIcon,
  PlusIcon,
  MinusIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl, validateOrderData } from '../../utils/helpers';

// ✅ IMPORTAR APIS NECESARIAS
import {
  getPaymentMethods,
  getExtras,
  getSauces,
  getFlavors,
  getProductById,
  updateOrder
} from '../../utils/api';

import Swal from 'sweetalert2';

// ✅ COMPONENTES DE ERROR
function MinimalErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Error en el Modal</h3>
        <p className="text-gray-600 mb-4">Hubo un problema cargando el modal de edición.</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('OrderEditModal Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <MinimalErrorFallback resetErrorBoundary={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}

// ✅ UTILIDADES DE DEBUG
const debugLog = (section, message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [OrderEditModal:${section}]`, message, data || '');
  }
};

// ✅ COMPONENTE PRINCIPAL DEL MODAL
function OrderEditModalContent({ isOpen, onClose, order, onOrderUpdated }) {
  const { setMessage } = useMessage();
  const { theme } = useTheme();
  const { setLoading } = useLoading();
  const { updateCartFromOrder } = useCart(); // ✅ NUEVO: Acceso al contexto del carrito

  // Estados para los datos de edición
  const [editData, setEditData] = useState({
    id_payment_method: null,
    client_name: '',
    comment: '',
    updated_items: []
  });

  // Estados para catálogos generales
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [availableExtras, setAvailableExtras] = useState([]);
  const [availableSauces, setAvailableSauces] = useState([]);

  // Estados específicos por producto
  const [productVariants, setProductVariants] = useState({}); // {productId: [variants]}
  const [productFlavors, setProductFlavors] = useState({}); // {productId: [flavors]}
  const [productDataLoading, setProductDataLoading] = useState({}); // {productId: {variants: bool, flavors: bool}}
  const [productDataErrors, setProductDataErrors] = useState({}); // {productId: {variants: error, flavors: error}}

  // Estados de carga y error por catálogo general
  const [catalogLoading, setCatalogLoading] = useState({
    payments: false,
    extras: false,
    sauces: false
  });

  const [catalogErrors, setCatalogErrors] = useState({
    payments: null,
    extras: null,
    sauces: null
  });

  // ✅ FUNCIÓN HELPER CORREGIDA para obtener datos del item con búsqueda en variantes
  const getItemDisplayData = useCallback((item, order) => {
    if (!item || !order) {
      return {
        image: generatePlaceholderUrl('Producto', 100, theme === 'dark'),
        productName: 'Producto',
        variantSize: 'N/A'
      };
    }

    // Buscar el item original por id_order_detail principalmente
    let orderItem = order?.items?.find(oi => oi.id_order_detail === item.id_order_detail);

    // Si no se encuentra, buscar por producto únicamente (no por variante porque puede haber cambiado)
    if (!orderItem) {
      orderItem = order?.items?.find(oi => oi.id_product === item.id_product);
    }

    // ✅ USAR DATOS DIRECTOS DEL ITEM (estructura del backend)
    const rawImage = item.product?.image || item.product_image || orderItem?.product_image;
    const image = optimizeGoogleDriveImageUrl(rawImage, 100) ||
                  generatePlaceholderUrl('Producto', 100, theme === 'dark');

    // Determinar nombre del producto
    const productName = item.product?.name ||
                       item.product_name ||
                       orderItem?.product_name ||
                       'Producto Desconocido';

    // ✅ LÓGICA CORREGIDA: Determinar tamaño de variante
    let variantSize = 'Tamaño N/A';

    const productId = Number(item.id_product);
    const currentVariantId = Number(item.id_variant);

    // ✅ PRIMERO: Verificar si tenemos el variant_name actualizado en el item editado
    if (item.variant_name && item.variant_name !== 'Tamaño N/A') {
      variantSize = item.variant_name;
      debugLog('VARIANT_SIZE', 'Using updated variant_name from item', item.variant_name);
    }
    // ✅ SEGUNDO: Buscar en productVariants usando el ID actual
    else if (productVariants[productId] && currentVariantId) {
      const currentVariant = productVariants[productId].find(v => v.id_variant === currentVariantId);
      if (currentVariant && currentVariant.size) {
        variantSize = currentVariant.size;
        debugLog('VARIANT_SIZE', 'Found variant in productVariants', currentVariant.size);
      }
    }
    // ✅ TERCERO: Usar datos originales como fallback
    else if (item.variant?.size) {
      variantSize = item.variant.size;
    } else if (orderItem?.variant_name) {
      variantSize = orderItem.variant_name;
    }

    debugLog('DISPLAY_DATA', 'Final variant size', {
      variantSize,
      currentVariantId,
      hasProductVariants: !!productVariants[productId],
      itemVariantName: item.variant_name
    });

    return { image, productName, variantSize };
  }, [theme, productVariants]); // ✅ Agregar productVariants como dependencia

  // ✅ FUNCIÓN PARA VALIDAR DATOS DE LA ORDEN AL ABRIR EL MODAL - CORREGIDA
  const validateOrderForEditing = (order) => {
    if (!order) {
      debugLog('VALIDATION', 'Order is null or undefined');
      return { isValid: false, errors: ['Orden no encontrada'] };
    }

    const errors = [];

    // Validar ID de la orden
    if (!order.id_order) {
      errors.push('ID de orden faltante');
    }

    // Validar items
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      errors.push('La orden no tiene productos');
    } else {
      order.items.forEach((item, index) => {
        if (!item.id_product) {
          errors.push(`Producto ${index + 1}: ID de producto faltante`);
        }
        if (!item.id_variant) {
          errors.push(`Producto ${index + 1}: ID de variante faltante`);
        }
      });
    }

    const isValid = errors.length === 0;

    debugLog('VALIDATION', `Order validation ${isValid ? 'passed' : 'failed'}`, {
      isValid,
      errors,
      order: {
        id_order: order.id_order,
        items_count: order.items?.length || 0,
        payment_method: order.payment_method,
        items_with_product_id: order.items?.filter(item => item.id_product).length || 0
      }
    });

    return { isValid, errors };
  };

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && order) {
      debugLog('MODAL', 'Opening OrderEditModal', { orderId: order.id_order });

      // Validar orden antes de proceder
      const validation = validateOrderForEditing(order);
      if (!validation.isValid) {
        debugLog('ERROR', 'Order validation failed', validation.errors);
        setMessage({
          text: `No se puede editar esta orden: ${validation.errors.join(', ')}`,
          type: 'error'
        });
        onClose();
        return;
      }

      const initializeModal = async () => {
        try {
          await loadCatalogs();
          await loadProductSpecificData();
          initializeEditData();
        } catch (error) {
          debugLog('ERROR', 'Failed to initialize modal', error);
          setMessage({
            text: 'Error inicializando el modal de edición',
            type: 'error'
          });
        }
      };

      initializeModal();
    } else if (!isOpen) {
      // Limpiar estados cuando se cierra el modal
      setEditData({
        id_payment_method: null,
        client_name: '',
        comment: '',
        updated_items: []
      });
      setProductVariants({});
      setProductFlavors({});
      setProductDataLoading({});
      setProductDataErrors({});
    }
  }, [isOpen, order]);

  // ✅ FUNCIÓN DE CARGA DE CATÁLOGOS GENERALES - CORREGIDA
  const loadCatalogs = async () => {
    debugLog('CATALOGS', 'Loading catalogs...');
    setCatalogLoading({
      payments: true,
      extras: true,
      sauces: true
    });

    try {
      const [paymentsResponse, extrasResponse, saucesResponse] = await Promise.all([
        getPaymentMethods(),
        getExtras(),
        getSauces()
      ]);

      // Procesar métodos de pago
      const validPayments = Array.isArray(paymentsResponse) ?
        paymentsResponse.filter(pm => pm && pm.id_payment_method && pm.name) : [];
      setPaymentMethods(validPayments);

      // Procesar extras
      const validExtras = Array.isArray(extrasResponse) ?
        extrasResponse.filter(extra => extra && extra.id_extra && extra.name) : [];
      setAvailableExtras(validExtras);

      // Procesar salsas
      const validSauces = Array.isArray(saucesResponse) ?
        saucesResponse.filter(sauce => sauce && sauce.id_sauce && sauce.name) : [];
      setAvailableSauces(validSauces);

      debugLog('CATALOGS', 'Catalogs loaded successfully', {
        payments: validPayments.length,
        extras: validExtras.length,
        sauces: validSauces.length
      });

    } catch (error) {
      debugLog('ERROR', 'Failed to load catalogs', error);
      setCatalogErrors({
        payments: error,
        extras: error,
        sauces: error
      });

      setMessage({
        text: `Error cargando catálogos: ${error.message}`,
        type: 'error'
      });

      // Configurar arrays vacíos como fallback
      setPaymentMethods([
        { id_payment_method: 1, name: 'Efectivo' },
        { id_payment_method: 2, name: 'Tarjeta' },
        { id_payment_method: 3, name: 'Transferencia' }
      ]);
      setAvailableExtras([]);
      setAvailableSauces([]);
    } finally {
      setCatalogLoading({
        payments: false,
        extras: false,
        sauces: false
      });
    }
  };

  // ✅ NUEVA FUNCIÓN PARA CARGAR DATOS ESPECÍFICOS POR PRODUCTO
  const loadProductSpecificData = async () => {
    if (!order?.items || order.items.length === 0) return;

    try {
      debugLog('PRODUCT', 'Loading product-specific data...');

      // Obtener IDs únicos de productos
      const uniqueProductIds = [...new Set(order.items.map(item => item.id_product).filter(Boolean))];

      if (uniqueProductIds.length === 0) {
        debugLog('WARNING', 'No valid product IDs found');
        return;
      }

      // Inicializar estados de carga
      const loadingState = {};
      const errorState = {};
      uniqueProductIds.forEach(productId => {
        loadingState[productId] = { variants: true, flavors: true };
        errorState[productId] = { variants: null, flavors: null };
      });

      setProductDataLoading(loadingState);
      setProductDataErrors(errorState);

      // ✅ Cargar datos para cada producto
      const variantsPromises = uniqueProductIds.map(async (productId) => {
        try {
          debugLog('PRODUCT', `Loading variants for product ${productId}`);
          const response = await getProductById(productId);

          // ✅ Extraer variantes del producto
          const validVariants = Array.isArray(response.variants) ?
            response.variants.filter(variant =>
              variant &&
              variant.id_variant &&
              typeof variant.id_variant === 'number' &&
              variant.size &&
              typeof variant.size === 'string' &&
              variant.price &&
              typeof variant.price === 'number'
            ) : [];

          return { productId, variants: validVariants };
        } catch (error) {
          debugLog('ERROR', `Failed to load variants for product ${productId}`, error);
          setProductDataErrors(prev => ({
            ...prev,
            [productId]: { ...prev[productId], variants: error }
          }));
          return { productId, variants: [] };
        } finally {
          setProductDataLoading(prev => ({
            ...prev,
            [productId]: { ...prev[productId], variants: false }
          }));
        }
      });

      const flavorsPromises = uniqueProductIds.map(async (productId) => {
        try {
          debugLog('PRODUCT', `Loading flavors for product ${productId}`);
          // ✅ Obtener sabores desde el catálogo general
          const response = await getFlavors();

          // ✅ Filtrar sabores válidos
          const validFlavors = Array.isArray(response) ?
            response.filter(flavor =>
              flavor &&
              flavor.id_flavor &&
              typeof flavor.id_flavor === 'number' &&
              flavor.name &&
              typeof flavor.name === 'string'
            ) : [];

          return { productId, flavors: validFlavors };
        } catch (error) {
          debugLog('ERROR', `Failed to load flavors for product ${productId}`, error);
          setProductDataErrors(prev => ({
            ...prev,
            [productId]: { ...prev[productId], flavors: error }
          }));
          return { productId, flavors: [] };
        } finally {
          setProductDataLoading(prev => ({
            ...prev,
            [productId]: { ...prev[productId], flavors: false }
          }));
        }
      });

      // Ejecutar todas las promesas
      const [variantsResults, flavorsResults] = await Promise.allSettled([
        Promise.all(variantsPromises),
        Promise.all(flavorsPromises)
      ]);

      // Procesar resultados de variantes
      const variantsData = {};
      if (variantsResults.status === 'fulfilled') {
        variantsResults.value.forEach(({ productId, variants }) => {
          variantsData[productId] = variants;
        });
      }
      setProductVariants(variantsData);

      // Procesar resultados de sabores
      const flavorsData = {};
      if (flavorsResults.status === 'fulfilled') {
        flavorsResults.value.forEach(({ productId, flavors }) => {
          flavorsData[productId] = flavors;
        });
      }
      setProductFlavors(flavorsData);

      debugLog('PRODUCT', 'Product-specific data loaded', { variantsData, flavorsData });

    } catch (error) {
      debugLog('ERROR', 'Failed to load product-specific data', error);
      setMessage({
        text: 'Error cargando datos específicos de productos',
        type: 'warning'
      });
    }
  };

  // ✅ FUNCIÓN DE INICIALIZACIÓN DE DATOS DE EDICIÓN ROBUSTA
  const initializeEditData = () => {
    if (!order) return;

    try {
      debugLog('EDIT', 'Initializing edit data', order);

      // ✅ Preseleccionar método de pago - ESTRUCTURA CORREGIDA
      const paymentMethodId = order.payment_method?.id_payment_method ||
                             order.payment_method ||
                             null;

      // Validar que los items tengan datos válidos
      const validItems = (order.items || [])
        .filter(item =>
          item &&
          item.id_product &&
          item.id_variant &&
          item.id_product !== null &&
          item.id_variant !== null
        )
        .map((item, index) => {
          const orderDetailId = item.id_order_detail || item.id || (index + 1);

          debugLog('ITEM', `Processing item ${index}`, {
            id_order_detail: orderDetailId,
            id_product: item.id_product,
            id_variant: item.id_variant,
            originalItem: item
          });

          return {
            // Campos para referencia interna
            id_order_detail: Number(orderDetailId),
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price || item.product_price) || 0,
            total_price: Number(item.total_price || item.product_price) || 0,
            comment: item.comment || '',

            // ✅ CAMPOS CRÍTICOS que se envían al backend
            id_product: Number(item.id_product),
            id_variant: Number(item.id_variant),

            // Arrays de modificaciones con validación segura
            extras: Array.isArray(item.extras) ?
              item.extras.filter(extra => extra && extra.id_extra).map(extra => ({
                ...extra,
                id_extra: Number(extra.id_extra),
                quantity: Number(extra.quantity) || 1
              })) : [],
            sauces: Array.isArray(item.sauces) ?
              item.sauces.filter(sauce => sauce && sauce.id_sauce).map(sauce => ({
                ...sauce,
                id_sauce: Number(sauce.id_sauce)
              })) : [],
            flavors: Array.isArray(item.flavors) ?
              item.flavors.filter(flavor => flavor && flavor.id_flavor).map(flavor => ({
                ...flavor,
                id_flavor: Number(flavor.id_flavor)
              })) : [],

            // ✅ CAMPOS ADICIONALES para mostrar datos en la UI
            product_name: item.product?.name || item.product_name || 'Producto Desconocido',
            product_image: item.product?.image || item.product_image,
            variant_name: item.variant?.size || item.variant_name || 'Tamaño N/A'
          };
        });

      const initialData = {
        id_payment_method: paymentMethodId ? Number(paymentMethodId) : null,
        client_name: order.client_name || '',
        comment: order.comment || '',
        updated_items: validItems
      };

      setEditData(initialData);

      debugLog('SUCCESS', 'Edit data initialized', {
        paymentMethodId: initialData.id_payment_method,
        itemsCount: validItems.length,
        validItems: validItems.map(item => ({
          id_product: item.id_product,
          id_variant: item.id_variant,
          id_order_detail: item.id_order_detail
        }))
      });

    } catch (error) {
      debugLog('ERROR', 'Failed to initialize edit data', error);
      setMessage({
        text: 'Error inicializando datos de edición',
        type: 'error'
      });

      // Inicializar con datos mínimos para evitar crashes
      setEditData({
        id_payment_method: null,
        client_name: '',
        comment: '',
        updated_items: []
      });
    }
  };

  // ✅ FUNCIÓN PARA MANEJAR CAMBIOS EN EL MÉTODO DE PAGO
  const handlePaymentMethodChange = (paymentMethodId) => {
    setEditData(prev => ({
      ...prev,
      id_payment_method: paymentMethodId
    }));
  };

  // ✅ FUNCIÓN PARA MANEJAR CAMBIOS EN EL NOMBRE DEL CLIENTE
  const handleClientNameChange = (clientName) => {
    setEditData(prev => ({
      ...prev,
      client_name: clientName
    }));
  };

  // ✅ FUNCIÓN PARA MANEJAR CAMBIOS EN EL COMENTARIO GENERAL CON VALIDACIÓN
  const handleCommentChange = (comment) => {
    // Limitar a 500 caracteres
    if (comment.length <= 500) {
      setEditData(prev => ({
        ...prev,
        comment: comment
      }));
    }
  };

  // ✅ FUNCIÓN PARA MANEJAR CAMBIOS EN ITEMS
  const handleItemChange = (itemIndex, field, value) => {
    setEditData(prev => ({
      ...prev,
      updated_items: prev.updated_items.map((item, index) =>
        index === itemIndex ? { ...item, [field]: value } : item
      )
    }));
  };

  // ✅ FUNCIÓN CORREGIDA PARA CAMBIAR VARIANTE DE UN ITEM
  const handleVariantChangeForItem = (itemIndex, variant) => {
    try {
      if (!variant || !variant.id_variant || !variant.price) {
        debugLog('WARNING', 'Invalid variant data:', variant);
        return;
      }

      debugLog('VARIANT_CHANGE', 'Changing variant', {
        itemIndex,
        newVariantId: variant.id_variant,
        newSize: variant.size,
        newPrice: variant.price
      });

      setEditData(prev => {
        const updatedItems = prev.updated_items.map((item, index) => {
          if (index === itemIndex) {
            const updatedItem = {
              ...item,
              id_variant: Number(variant.id_variant),
              unit_price: Number(variant.price),
              total_price: Number(variant.price) * (Number(item.quantity) || 1),
              // ✅ CRÍTICO: Actualizar el nombre de la variante para la UI
              variant_name: variant.size || 'Tamaño N/A'
            };

            debugLog('VARIANT_CHANGE', 'Updated item', {
              id_variant: updatedItem.id_variant,
              variant_name: updatedItem.variant_name,
              oldVariant: item.id_variant
            });

            return updatedItem;
          }
          return item;
        });

        return {
          ...prev,
          updated_items: updatedItems
        };
      });

      debugLog('SUCCESS', 'Variant changed successfully', {
        itemIndex,
        newVariantId: variant.id_variant,
        newSize: variant.size,
        newPrice: variant.price
      });
    } catch (error) {
      debugLog('ERROR', 'Failed to change variant:', error);
      setMessage({
        text: 'Error al cambiar la variante',
        type: 'error'
      });
    }
  };

  // ✅ FUNCIÓN PARA AGREGAR EXTRAS A UN ITEM
  const handleAddExtraToItem = async (itemIndex, extra) => {
    const result = await Swal.fire({
      title: '¿Qué cantidad de extra quieres agregar?',
      input: 'number',
      inputAttributes: {
        min: 1,
        max: 10,
        step: 1
      },
      inputValue: 1,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        const num = parseInt(value);
        if (!value || isNaN(num) || num < 1) {
          return 'Ingresa una cantidad válida (mínimo 1)';
        }
        if (num > 10) {
          return 'Máximo 10 extras por producto';
        }
      }
    });

    if (result.isConfirmed) {
      const quantity = parseInt(result.value);
      setEditData(prev => ({
        ...prev,
        updated_items: prev.updated_items.map((item, index) => {
          if (index === itemIndex) {
            const existingExtra = item.extras.find(e => e.id_extra === extra.id_extra);
            let newExtras;

            if (existingExtra) {
              // Actualizar cantidad si ya existe
              newExtras = item.extras.map(e =>
                e.id_extra === extra.id_extra
                  ? { ...e, quantity: e.quantity + quantity }
                  : e
              );
            } else {
              // Agregar nuevo extra
              newExtras = [...item.extras, {
                id_extra: extra.id_extra,
                name: extra.name,
                price: extra.price,
                quantity: quantity
              }];
            }

            return { ...item, extras: newExtras };
          }
          return item;
        })
      }));

      setMessage({
        text: `${extra.name} agregado (${quantity})`,
        type: 'success'
      });
    }
  };

  // ✅ FUNCIÓN PARA GUARDAR CAMBIOS CON SINCRONIZACIÓN DEL CARRITO
  const handleSaveChanges = async () => {
    try {
      debugLog('SAVE', 'Starting save process', editData);

      // Validar datos antes del envío
      const validation = validateOrderData(editData);
      if (!validation.isValid) {
        debugLog('ERROR', 'Validation failed', validation.errors);
        setMessage({
          text: `Error de validación: ${Object.values(validation.errors).join(', ')}`,
          type: 'error'
        });
        return;
      }

      setLoading(true);

      // Preparar datos para el API
      const updateData = {
        id_payment_method: editData.id_payment_method,
        client_name: editData.client_name || '',
        comment: editData.comment || '',
        updated_items: editData.updated_items.map(item => ({
          id_order_detail: item.id_order_detail,
          id_product: item.id_product,
          id_variant: item.id_variant,
          quantity: item.quantity,
          comment: item.comment || '',
          extras: item.extras || [],
          sauces: item.sauces || [],
          flavors: item.flavors || []
        }))
      };

      debugLog('API', 'Sending update request', updateData);

      const response = await updateOrder(order.id_order, updateData);

      debugLog('SUCCESS', 'Order updated successfully', response);

      setMessage({
        text: 'Orden actualizada exitosamente',
        type: 'success'
      });

      // ✅ SINCRONIZACIÓN: Notificar al contexto del carrito sobre la actualización
      if (updateCartFromOrder && response) {
        updateCartFromOrder(response);
        debugLog('CART_SYNC', 'Cart synchronized with updated order');
      }

      // Notificar al componente padre y cerrar modal
      if (onOrderUpdated) {
        onOrderUpdated(response);
      }
      onClose();

    } catch (error) {
      debugLog('ERROR', 'Failed to save changes', error);
      setMessage({
        text: `Error actualizando la orden: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header del modal */}
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Editar Orden #{order?.id_order}
            </h2>
            <button
              id="close-order-edit"
              onClick={onClose}
              aria-label="Cerrar modal"
              className={`p-2 rounded-lg transition-colors hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">

              {/* ✅ NUEVA SECCIÓN: Resumen visual de la orden */}
              <div className={`p-4 rounded-lg border-l-4 border-blue-500 ${
                theme === 'dark'
                  ? 'bg-blue-900/20 border-blue-400'
                  : 'bg-blue-50 border-blue-500'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      #{order?.id_order}
                    </div>
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Número de Orden
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`text-2xl font-bold text-green-600`}>
                      ${order?.total_amount?.toFixed(2) || '0.00'}
                    </div>
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Total de la Orden
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      {order?.items?.length || 0}
                    </div>
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Productos
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className={`mt-3 pt-3 border-t ${
                  theme === 'dark' ? 'border-blue-700' : 'border-blue-200'
                }`}>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className={`flex items-center gap-2 ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      <CalendarIcon className="w-4 h-4" />
                      <span>
                        {order?.created_at ? new Date(order.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Fecha no disponible'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      <CreditCardIcon className="w-4 h-4" />
                      <span>{order?.payment_method?.name || 'Método no especificado'}</span>
                    </div>

                    {order?.client_name && (
                      <div className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                      }`}>
                        <UserIcon className="w-4 h-4" />
                        <span>{order.client_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Información general */}
              <div className="space-y-6">
                {/* ✅ NUEVA SECCIÓN: Métodos de pago como lista visual */}
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Método de Pago
                  </h3>

                  {catalogLoading.payments ? (
                    <div className={`flex items-center gap-2 p-4 border rounded-lg ${
                      theme === 'dark'
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-300 bg-gray-100'
                    }`}>
                      <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Cargando métodos de pago...
                      </span>
                    </div>
                  ) : catalogErrors.payments ? (
                    <div className={`p-4 border rounded-lg border-red-300 ${
                      theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
                    }`}>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        Error cargando métodos de pago: {catalogErrors.payments.message}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {paymentMethods && paymentMethods.length > 0 ? (
                        paymentMethods.map(method => {
                          const isSelected = editData.id_payment_method === method.id_payment_method;
                          return (
                            <button
                              key={method.id_payment_method}
                              type="button"
                              onClick={() => handlePaymentMethodChange(method.id_payment_method)}
                              className={`
                                relative flex items-center gap-3 p-4 border-2 rounded-lg transition-all
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                ${isSelected
                                  ? theme === 'dark'
                                    ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                    : 'border-blue-500 bg-blue-50 text-blue-700'
                                  : theme === 'dark'
                                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                }
                              `}
                            >
                              {/* Ícono del método de pago */}
                              <div className={`
                                flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                                ${isSelected
                                  ? theme === 'dark'
                                    ? 'bg-blue-800 text-blue-300'
                                    : 'bg-blue-500 text-white'
                                  : theme === 'dark'
                                    ? 'bg-gray-600 text-gray-400'
                                    : 'bg-gray-200 text-gray-500'
                                }
                              `}>
                                {/* Ícono basado en el nombre del método de pago */}
                                {method.name.toLowerCase().includes('efectivo') ? (
                                  <CurrencyDollarIcon className="w-5 h-5" />
                                ) : method.name.toLowerCase().includes('tarjeta') ? (
                                  <CreditCardIcon className="w-5 h-5" />
                                ) : method.name.toLowerCase().includes('transferencia') ? (
                                  <BanknotesIcon className="w-5 h-5" />
                                ) : (
                                  <CurrencyDollarIcon className="w-5 h-5" />
                                )}
                              </div>

                              {/* Información del método */}
                              <div className="flex-1 text-left">
                                <div className={`font-medium text-sm ${
                                  isSelected
                                    ? theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                                    : theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {method.name}
                                </div>
                                <div className={`text-xs ${
                                  isSelected
                                    ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                    : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  ID: {method.id_payment_method}
                                </div>
                              </div>

                              {/* Checkmark si está seleccionado */}
                              {isSelected && (
                                <div className="flex-shrink-0">
                                  <CheckIcon className={`w-5 h-5 ${
                                    theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                                  }`} />
                                </div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className={`col-span-full p-4 text-center border rounded-lg ${
                          theme === 'dark'
                            ? 'border-gray-600 bg-gray-700 text-gray-400'
                            : 'border-gray-300 bg-gray-100 text-gray-600'
                        }`}>
                          <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No hay métodos de pago disponibles</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Información adicional de la orden */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nombre del cliente */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Nombre del cliente
                    </label>
                    <input
                      type="text"
                      value={editData.client_name || ''}
                      onChange={(e) => handleClientNameChange(e.target.value)}
                      placeholder="Ingresa el nombre del cliente"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  {/* Información de la orden (solo lectura) */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Información de la orden
                    </label>
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-300 bg-gray-100'
                    }`}>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div className="flex justify-between">
                          <span>Orden:</span>
                          <span className="font-medium">#{order?.id_order}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Total:</span>
                          <span className="font-medium text-green-600">
                            ${order?.total_amount?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Productos:</span>
                          <span className="font-medium">
                            {editData.updated_items?.length || 0} items
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comentario general */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Comentarios de la Orden
                </h3>
                <div className={`border rounded-lg p-1 ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <textarea
                    value={editData.comment || ''}
                    onChange={(e) => handleCommentChange(e.target.value)}
                    placeholder="Agregar comentarios adicionales sobre la orden..."
                    rows={4}
                    className={`w-full px-3 py-2 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      theme === 'dark'
                        ? 'bg-gray-700 text-white placeholder-gray-400'
                        : 'bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <div className={`flex items-center justify-between px-3 py-2 text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <span>💬 Comentarios visibles para el cliente</span>
                    <span>{(editData.comment || '').length}/500</span>
                  </div>
                </div>
              </div>

              {/* Items de la orden */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Productos en la Orden
                </h3>
                <div className="space-y-6">
                  {editData.updated_items && Array.isArray(editData.updated_items) &&
                   editData.updated_items.map((item, itemIndex) => {
                    if (!item || !item.id_product || !item.id_variant) {
                      debugLog('WARNING', `Skipping invalid item at index ${itemIndex}:`, item);
                      return null;
                    }

                    const { image, productName, variantSize } = getItemDisplayData(item, order);
                    const productId = Number(item.id_product);
                    const productVariantsData = productVariants[productId] || [];
                    const productFlavorsData = productFlavors[productId] || [];
                    const isVariantsLoading = productDataLoading[productId]?.variants || false;
                    const isFlavorsLoading = productDataLoading[productId]?.flavors || false;

                    return (
                      <div
                        key={`item-${item.id_order_detail}-${itemIndex}`}
                        className={`p-6 border rounded-lg ${
                          theme === 'dark'
                            ? 'border-gray-600 bg-gray-700'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          {/* Imagen del producto */}
                          <img
                            src={image}
                            alt={productName}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border"
                            onError={(e) => {
                              e.target.src = generatePlaceholderUrl(productName, 100, theme === 'dark');
                            }}
                          />

                          {/* Información del producto */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-lg ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {productName}
                            </h4>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {variantSize} • Cantidad: {item.quantity} • ${item.total_price?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>

                        {/* ✅ SECCIÓN PARA CAMBIAR VARIANTE */}
                        {productVariantsData && Array.isArray(productVariantsData) && productVariantsData.length > 0 && (
                          <div className="mb-4">
                            <fieldset>
                              <legend className={`text-sm font-medium mb-2 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Cambiar tamaño:
                              </legend>
                              {isVariantsLoading ? (
                                <div className={`flex items-center gap-2 p-2 border rounded-lg ${
                                  theme === 'dark'
                                    ? 'border-gray-600 bg-gray-600'
                                    : 'border-gray-300 bg-gray-100'
                                }`}>
                                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                  <span className={`text-sm ${
                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Cargando variantes...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Seleccionar tamaño del producto">
                                  {productVariantsData.map(variant => {
                                    const isSelected = item.id_variant === variant.id_variant;
                                    return (
                                      <button
                                        key={variant.id_variant}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        aria-label={`Tamaño ${variant.size}, precio ${variant.price}`}
                                        onClick={() => handleVariantChangeForItem(itemIndex, variant)}
                                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                          isSelected
                                            ? theme === 'dark'
                                              ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                              : 'border-blue-500 bg-blue-100 text-blue-700'
                                            : theme === 'dark'
                                              ? 'border-gray-500 bg-gray-600 text-gray-300 hover:bg-gray-500'
                                              : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                      >
                                        {isSelected && <CheckIcon className="w-3 h-3" />}
                                        {variant.size} - ${variant.price}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </fieldset>
                          </div>
                        )}

                        {/* Sección de extras disponibles */}
                        {availableExtras && availableExtras.length > 0 && (
                          <div className="mb-4">
                            <fieldset>
                              <legend className={`text-sm font-medium mb-2 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Agregar extras:
                              </legend>
                              <div className="flex flex-wrap gap-2">
                                {availableExtras.map(extra => (
                                  <button
                                    key={extra.id_extra}
                                    type="button"
                                    onClick={() => handleAddExtraToItem(itemIndex, extra)}
                                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                      theme === 'dark'
                                        ? 'border-gray-500 bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    <PlusIcon className="w-3 h-3" />
                                    {extra.name} (+${extra.price})
                                  </button>
                                ))}
                              </div>
                            </fieldset>
                          </div>
                        )}

                        {/* Mostrar extras actuales del item */}
                        {item.extras && item.extras.length > 0 && (
                          <div className="mb-4">
                            <fieldset>
                              <legend className={`text-sm font-medium mb-2 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Extras actuales:
                              </legend>
                              <div className="flex flex-wrap gap-2">
                                {item.extras.map((extra, extraIndex) => (
                                  <div
                                    key={`${extra.id_extra}-${extraIndex}`}
                                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border ${
                                      theme === 'dark'
                                        ? 'border-green-500 bg-green-900/30 text-green-300'
                                        : 'border-green-500 bg-green-100 text-green-700'
                                    }`}
                                  >
                                    <CheckIcon className="w-3 h-3" />
                                    {extra.name} x{extra.quantity}
                                  </div>
                                ))}
                              </div>
                            </fieldset>
                          </div>
                        )}

                        {/* Sección de sabores disponibles */}
                        {productFlavorsData && Array.isArray(productFlavorsData) && productFlavorsData.length > 0 && (
                          <div className="mb-4">
                            <fieldset>
                              <legend className={`text-sm font-medium mb-2 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Sabores disponibles:
                              </legend>
                              {isFlavorsLoading ? (
                                <div className={`flex items-center gap-2 p-2 border rounded-lg ${
                                  theme === 'dark'
                                    ? 'border-gray-600 bg-gray-600'
                                    : 'border-gray-300 bg-gray-100'
                                }`}>
                                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                  <span className={`text-sm ${
                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Cargando sabores...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {productFlavorsData.map(flavor => {
                                    const isSelected = item.flavors?.some(f => f.id_flavor === flavor.id_flavor);
                                    return (
                                      <button
                                        key={flavor.id_flavor}
                                        type="button"
                                        onClick={() => {
                                          // Toggle flavor selection
                                          const newFlavors = isSelected
                                            ? item.flavors.filter(f => f.id_flavor !== flavor.id_flavor)
                                            : [...(item.flavors || []), { id_flavor: flavor.id_flavor, name: flavor.name }];
                                          handleItemChange(itemIndex, 'flavors', newFlavors);
                                        }}
                                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                          isSelected
                                            ? theme === 'dark'
                                              ? 'border-green-500 bg-green-900/30 text-green-300'
                                              : 'border-green-500 bg-green-100 text-green-700'
                                            : theme === 'dark'
                                              ? 'border-gray-500 bg-gray-600 text-gray-300 hover:bg-gray-500'
                                              : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                      >
                                        {isSelected && <CheckIcon className="w-3 h-3" />}
                                        {flavor.name || 'Sin nombre'}
                                      </button>
                                    );
                                  }).filter(Boolean)}
                                </div>
                              )}
                            </fieldset>
                          </div>
                        )}
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>

            </div>
          </div>

          {/* Footer con botones */}
          <div className={`flex items-center justify-end gap-3 border-t p-6 ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              id="cancel-order-edit"
              type="button"
              onClick={onClose}
              aria-label="Cancelar edición de orden"
              className={`px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                theme === 'dark'
                  ? 'text-gray-300 border-gray-600 hover:bg-gray-700'
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Cancelar
            </button>
            <button
              id="save-order-changes"
              type="button"
              onClick={handleSaveChanges}
              aria-label="Guardar cambios en la orden"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Componente principal con ErrorBoundary
function OrderEditModal({ isOpen, onClose, order, onOrderUpdated }) {
  return (
    <ErrorBoundary fallback={MinimalErrorFallback}>
      <OrderEditModalContent
        isOpen={isOpen}
        onClose={onClose}
        order={order}
        onOrderUpdated={onOrderUpdated}
      />
    </ErrorBoundary>
  );
}

export default OrderEditModal;