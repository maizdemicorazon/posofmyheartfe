import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import {
  XMarkIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import ErrorBoundary, { MinimalErrorFallback } from '../errors/ErrorBoundary';
import {
  handleApiError,
  validateExtraQuantity,
  validateOrderData,
  validateCatalogData,
  optimizeGoogleDriveImageUrl,
  generatePlaceholderUrl,
  debugLog,
  debugDataStructure,
  APIError,
  ValidationError
} from '../../utils/helpers';

// ✅ IMPORTAR UTILIDADES DE API
import {
  updateOrder,
  getExtras,
  getSauces,
  getFlavors,
  getPaymentMethods,
  getProductById
} from '../../utils/api';

// ✅ Componente interno sin ErrorBoundary
function OrderEditModalContent({ isOpen, onClose, order, onOrderUpdated }) {
  const { theme } = useTheme();
  const { setLoading } = useLoading();
  const { setMessage } = useMessage();

  // Estados principales
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

  // ✅ NUEVOS ESTADOS PARA DATOS ESPECÍFICOS POR PRODUCTO
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

  // ✅ FUNCIÓN HELPER MEJORADA para obtener datos del item
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

    // Si no se encuentra, buscar por producto y variante
    if (!orderItem) {
      orderItem = order?.items?.find(oi =>
        oi.id_product === item.id_product && oi.id_variant === item.id_variant
      );
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

    // Determinar tamaño de variante
    const variantSize = item.variant?.size ||
                       item.variant_name ||
                       orderItem?.variant_name ||
                       'Tamaño N/A';

    return { image, productName, variantSize };
  }, [theme]);

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
    debugLog('CATALOG', 'Starting catalog loading...');

    setCatalogErrors({
      payments: null,
      extras: null,
      sauces: null
    });

    setCatalogLoading({
      payments: true,
      extras: true,
      sauces: true
    });

    try {
      // ✅ Cargar todos los catálogos usando las funciones de API
      const [paymentsResult, extrasResult, saucesResult] = await Promise.allSettled([
        getPaymentMethods(),
        getExtras(),
        getSauces()
      ]);

      // ✅ Configurar métodos de pago
      if (paymentsResult.status === 'fulfilled') {
        setPaymentMethods(paymentsResult.value || []);
      } else {
        setCatalogErrors(prev => ({ ...prev, payments: paymentsResult.reason }));
        // Fallback para métodos de pago
        setPaymentMethods([
          { id_payment_method: 1, name: 'Efectivo' },
          { id_payment_method: 2, name: 'Tarjeta' },
          { id_payment_method: 3, name: 'Transferencia' }
        ]);
      }

      // ✅ Configurar extras
      if (extrasResult.status === 'fulfilled') {
        setAvailableExtras(extrasResult.value || []);
      } else {
        setCatalogErrors(prev => ({ ...prev, extras: extrasResult.reason }));
        setAvailableExtras([]);
      }

      // ✅ Configurar salsas
      if (saucesResult.status === 'fulfilled') {
        setAvailableSauces(saucesResult.value || []);
      } else {
        setCatalogErrors(prev => ({ ...prev, sauces: saucesResult.reason }));
        setAvailableSauces([]);
      }

      debugLog('CATALOG', 'Catalogs loaded', {
        payments: paymentsResult.status,
        extras: extrasResult.status,
        sauces: saucesResult.status
      });

    } catch (error) {
      debugLog('ERROR', 'Failed to load catalogs', error);
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

            // ✅ SABOR: Manejar como campo único
            flavor: (() => {
              try {
                // Si viene como array (compatibilidad con estructura anterior)
                if (Array.isArray(item.flavors) && item.flavors.length > 0 && item.flavors[0]?.id_flavor) {
                  return {
                    id_flavor: Number(item.flavors[0].id_flavor),
                    name: item.flavors[0].name || 'Sin nombre'
                  };
                }
                // Si viene como objeto único (estructura del backend)
                if (item.flavor && item.flavor.id_flavor) {
                  return {
                    id_flavor: Number(item.flavor.id_flavor),
                    name: item.flavor.name || 'Sin nombre'
                  };
                }
                return null;
              } catch (error) {
                debugLog('WARNING', `Error processing flavor for item ${index}:`, error);
                return null;
              }
            })()
          };
        });

      if (validItems.length === 0) {
        debugLog('WARNING', 'No valid items found in order');
        setMessage({
          text: 'Esta orden no tiene productos válidos para editar',
          type: 'warning'
        });
        return;
      }

      // Inicializar datos principales con fallbacks seguros
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

  // ✅ FUNCIÓN PARA MANEJAR CAMBIOS EN EL COMENTARIO GENERAL
  const handleCommentChange = (comment) => {
    setEditData(prev => ({
      ...prev,
      comment: comment
    }));
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

  // ✅ NUEVA FUNCIÓN PARA CAMBIAR VARIANTE DE UN ITEM
  const handleVariantChangeForItem = (itemIndex, variant) => {
    try {
      if (!variant || !variant.id_variant || !variant.price) {
        debugLog('WARNING', 'Invalid variant data:', variant);
        return;
      }

      setEditData(prev => ({
        ...prev,
        updated_items: prev.updated_items.map((item, index) => {
          if (index === itemIndex) {
            return {
              ...item,
              id_variant: Number(variant.id_variant),
              unit_price: Number(variant.price),
              total_price: Number(variant.price) * (Number(item.quantity) || 1)
            };
          }
          return item;
        })
      }));
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
      inputLabel: extra.name,
      inputPlaceholder: 'Cantidad',
      inputValue: 1,
      inputAttributes: {
        min: 1,
        max: 10,
        step: 1
      },
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        const validation = validateExtraQuantity(value);
        if (!validation.isValid) {
          return validation.message;
        }
      }
    });

    if (result.isConfirmed) {
      const quantity = parseInt(result.value);

      setEditData(prev => ({
        ...prev,
        updated_items: prev.updated_items.map((item, index) => {
          if (index === itemIndex) {
            const existingExtraIndex = item.extras.findIndex(e => e.id_extra === extra.id_extra);

            if (existingExtraIndex >= 0) {
              // Actualizar cantidad si ya existe
              const updatedExtras = [...item.extras];
              updatedExtras[existingExtraIndex] = { ...extra, quantity };
              return { ...item, extras: updatedExtras };
            } else {
              // Agregar nuevo extra
              return {
                ...item,
                extras: [...item.extras, { ...extra, quantity }]
              };
            }
          }
          return item;
        })
      }));

      await Swal.fire({
        title: '¡Extra agregado!',
        text: `${quantity} ${extra.name} agregado al producto`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  // ✅ FUNCIÓN PARA REMOVER EXTRAS DE UN ITEM
  const handleRemoveExtraFromItem = async (itemIndex, extraId, extraName) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Quieres quitar ${extraName} del producto?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      setEditData(prev => ({
        ...prev,
        updated_items: prev.updated_items.map((item, index) => {
          if (index === itemIndex) {
            const currentExtras = Array.isArray(item.extras) ? item.extras : [];
            return {
              ...item,
              extras: currentExtras.filter(e =>
                e && e.id_extra && Number(e.id_extra) !== Number(extraId)
              )
            };
          }
          return item;
        })
      }));

      await Swal.fire({
        title: '¡Extra removido!',
        text: `${extraName} quitado del producto`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  // ✅ FUNCIÓN PARA AGREGAR/QUITAR SALSAS A UN ITEM
  const handleToggleSauceForItem = (itemIndex, sauce) => {
    setEditData(prev => ({
      ...prev,
      updated_items: prev.updated_items.map((item, index) => {
        if (index === itemIndex) {
          const currentSauces = Array.isArray(item.sauces) ? item.sauces : [];
          const existingSauceIndex = currentSauces.findIndex(s =>
            s && s.id_sauce && Number(s.id_sauce) === Number(sauce.id_sauce)
          );

          if (existingSauceIndex >= 0) {
            // Remover salsa si ya existe
            return {
              ...item,
              sauces: currentSauces.filter(s =>
                s && s.id_sauce && Number(s.id_sauce) !== Number(sauce.id_sauce)
              )
            };
          } else {
            // Agregar nueva salsa
            return {
              ...item,
              sauces: [...currentSauces, sauce]
            };
          }
        }
        return item;
      })
    }));
  };

  // ✅ FUNCIÓN PARA CAMBIAR SABOR DE UN ITEM (campo único)
  const handleFlavorChangeForItem = (itemIndex, flavor) => {
    try {
      setEditData(prev => ({
        ...prev,
        updated_items: prev.updated_items.map((item, index) => {
          if (index === itemIndex) {
            const newFlavor = flavor && flavor.id_flavor ? {
              id_flavor: Number(flavor.id_flavor),
              name: flavor.name || 'Sin nombre'
            } : null;

            return {
              ...item,
              flavor: newFlavor
            };
          }
          return item;
        })
      }));
    } catch (error) {
      debugLog('ERROR', 'Failed to change flavor:', error);
      setMessage({
        text: 'Error al cambiar el sabor',
        type: 'error'
      });
    }
  };

  // ✅ FUNCIÓN PARA GUARDAR CAMBIOS - ESTRUCTURA CORREGIDA DEL BACKEND
  const handleSaveChanges = async () => {
    try {
      debugLog('SAVE', 'Starting save process...');
      setLoading(true);

      // Validación de método de pago
      if (!editData.id_payment_method || editData.id_payment_method === null) {
        debugLog('VALIDATION', 'Payment method missing');
        await Swal.fire({
          title: 'Error de validación',
          text: 'Debes seleccionar un método de pago',
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        return;
      }

      // Validación de items
      if (!editData.updated_items || editData.updated_items.length === 0) {
        debugLog('VALIDATION', 'No items to update');
        await Swal.fire({
          title: 'Error de validación',
          text: 'No hay productos para actualizar',
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        return;
      }

      // ✅ PREPARAR DATOS SEGÚN LA ESTRUCTURA ESPERADA POR EL BACKEND
      const updateData = {
        comment: editData.comment || '',
        id_payment_method: Number(editData.id_payment_method),
        ...(editData.client_name && { client_name: editData.client_name }),
        updated_items: editData.updated_items
          .filter(item =>
            item.id_product &&
            item.id_variant &&
            item.id_product !== null &&
            item.id_variant !== null
          )
          .map(item => {
            const itemData = {
              id_product: Number(item.id_product),
              id_variant: Number(item.id_variant),

              // ✅ EXTRAS: Solo incluir si hay extras
              ...(item.extras && item.extras.length > 0 && {
                updated_extras: item.extras
                  .filter(extra => extra.id_extra && extra.id_extra !== null)
                  .map(extra => ({
                    id_extra: Number(extra.id_extra),
                    quantity: Number(extra.quantity) || 1
                  }))
              }),

              // ✅ SALSAS: Solo incluir si hay salsas
              ...(item.sauces && item.sauces.length > 0 && {
                updated_sauces: item.sauces
                  .filter(sauce => sauce.id_sauce && sauce.id_sauce !== null)
                  .map(sauce => ({
                    id_sauce: Number(sauce.id_sauce)
                  }))
              }),

              // ✅ SABOR: Solo incluir si hay sabor seleccionado
              ...(item.flavor &&
                  item.flavor.id_flavor &&
                  Number(item.flavor.id_flavor) > 0 && {
                flavor: Number(item.flavor.id_flavor)
              })
            };

            // ✅ ITEM EXISTENTE vs NUEVO
            if (item.id_order_detail) {
              itemData.id_order_detail = Number(item.id_order_detail);
            } else {
              itemData.id_order = Number(order.id_order);
            }

            return itemData;
          })
      };

      debugLog('SAVE', 'Sending update data', updateData);

      // ✅ USAR FUNCIÓN DE API EN LUGAR DE FETCH DIRECTO
      const response = await updateOrder(order.id_order, updateData);

      debugLog('SUCCESS', 'Order updated successfully', response);

      await Swal.fire({
        title: '¡Orden actualizada!',
        text: 'Los cambios se han guardado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      if (onOrderUpdated && typeof onOrderUpdated === 'function') {
        onOrderUpdated(response);
      }
      onClose();

    } catch (error) {
      debugLog('ERROR', 'Failed to save order changes', error);

      let errorMessage = 'Error desconocido al actualizar la orden';

      if (error?.message) {
        if (error.message.includes('must not be null')) {
          errorMessage = 'Algunos datos requeridos están vacíos. Intenta recargar la página.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Error de validación de datos. Verifica que todos los campos estén completos.';
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      await Swal.fire({
        title: 'Error al actualizar',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Entendido',
        footer: 'Si el problema persiste, intenta recargar la página'
      });

    } finally {
      setLoading(false);
      debugLog('SAVE', 'Save process completed');
    }
  };

  // No renderizar si no está abierto
  if (!isOpen) return null;

  // ✅ VALIDACIÓN DE SEGURIDAD
  if (!order || !order.id_order) {
    debugLog('ERROR', 'Invalid order data for modal:', order);
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>No se puede cargar la información de la orden.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full max-w-6xl rounded-lg shadow-xl ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b p-6 ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
              }`}>
                <CreditCardIcon className={`w-6 h-6 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h2
                  id="modal-title"
                  className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Editar Orden #{order?.id_order}
                </h2>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Modifica los detalles de la orden
                </p>
              </div>
            </div>
            <button
              id="close-modal-header"
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal de edición"
              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Contenido principal */}
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-6">

              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Método de pago */}
                <div>
                  <label
                    htmlFor="payment-method-select"
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Método de Pago
                  </label>
                  {catalogLoading.payments ? (
                    <div className={`flex items-center gap-2 p-3 border rounded-lg ${
                      theme === 'dark'
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-300 bg-gray-50'
                    }`}>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Cargando métodos...
                      </span>
                    </div>
                  ) : catalogErrors.payments ? (
                    <div className={`flex items-center gap-2 p-3 border rounded-lg ${
                      theme === 'dark'
                        ? 'border-red-600 bg-red-900/20'
                        : 'border-red-300 bg-red-50'
                    }`}>
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        Error cargando métodos
                      </span>
                    </div>
                  ) : (
                    <select
                      id="payment-method-select"
                      name="paymentMethod"
                      value={editData.id_payment_method || ''}
                      onChange={(e) => handlePaymentMethodChange(Number(e.target.value))}
                      aria-label="Seleccionar método de pago"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      <option value="">Selecciona un método de pago</option>
                      {paymentMethods.map(method => (
                        <option key={method.id_payment || method.id_payment_method} value={method.id_payment || method.id_payment_method}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Nombre del cliente */}
                <div>
                  <label
                    htmlFor="client-name-input"
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Nombre del Cliente
                  </label>
                  <input
                    id="client-name-input"
                    name="clientName"
                    type="text"
                    value={editData.client_name}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                    placeholder="Nombre del cliente"
                    aria-label="Nombre del cliente"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>

              {/* Comentario general */}
              <div>
                <label
                  htmlFor="general-comment-textarea"
                  className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Comentario General
                </label>
                <textarea
                  id="general-comment-textarea"
                  name="generalComment"
                  value={editData.comment}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  placeholder="Comentarios adicionales..."
                  rows="3"
                  aria-label="Comentario general de la orden"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  }`}
                />
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
                                        {variant.size} (${variant.price})
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </fieldset>
                          </div>
                        )}

                        {/* ✅ SECCIÓN DE EXTRAS ACTUAL */}
                        {item.extras && Array.isArray(item.extras) && item.extras.length > 0 && (
                          <div className="mb-4">
                            <p className={`text-sm font-medium mb-2 ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Extras actuales:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.extras.map((extra, extraIndex) => (
                                <span
                                  key={`extra-${extra.id_extra}-${extraIndex}`}
                                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                                    theme === 'dark'
                                      ? 'bg-orange-900/30 text-orange-300'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {extra.name} ({extra.quantity || 1})
                                  <button
                                    id={`remove-extra-${itemIndex}-${extra.id_extra}`}
                                    name={`remove-extra-${itemIndex}`}
                                    type="button"
                                    onClick={() => handleRemoveExtraFromItem(itemIndex, extra.id_extra, extra.name)}
                                    aria-label={`Quitar extra ${extra.name}`}
                                    className={`ml-1 hover:scale-110 transition-transform focus:outline-none focus:ring-1 focus:ring-orange-500 rounded ${
                                      theme === 'dark'
                                        ? 'text-orange-400 hover:text-orange-200'
                                        : 'text-orange-600 hover:text-orange-800'
                                    }`}
                                  >
                                    <XMarkIcon className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ✅ SECCIÓN DE SALSAS ACTUAL */}
                        {item.sauces && Array.isArray(item.sauces) && item.sauces.length > 0 && (
                          <div className="mb-4">
                            <p className={`text-sm font-medium mb-2 ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Salsas actuales:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.sauces.map((sauce, sauceIndex) => (
                                <span
                                  key={`sauce-${sauce.id_sauce}-${sauceIndex}`}
                                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                                    theme === 'dark'
                                      ? 'bg-red-900/30 text-red-300'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {sauce.name}
                                  <button
                                    id={`remove-sauce-${itemIndex}-${sauce.id_sauce}`}
                                    name={`remove-sauce-${itemIndex}`}
                                    type="button"
                                    onClick={() => handleToggleSauceForItem(itemIndex, sauce)}
                                    aria-label={`Quitar salsa ${sauce.name}`}
                                    className={`ml-1 hover:scale-110 transition-transform focus:outline-none focus:ring-1 focus:ring-red-500 rounded ${
                                      theme === 'dark'
                                        ? 'text-red-400 hover:text-red-200'
                                        : 'text-red-600 hover:text-red-800'
                                    }`}
                                  >
                                    <XMarkIcon className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ✅ SECCIÓN DE SABOR ACTUAL */}
                        {item.flavor && item.flavor.id_flavor && item.flavor.name && (
                          <div className="mb-4">
                            <p className={`text-sm font-medium mb-2 ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Sabor actual:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                                  theme === 'dark'
                                    ? 'bg-green-900/30 text-green-300'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {item.flavor.name}
                                <button
                                  id={`remove-flavor-${itemIndex}-${item.flavor.id_flavor}`}
                                  name={`remove-flavor-${itemIndex}`}
                                  type="button"
                                  onClick={() => handleFlavorChangeForItem(itemIndex, null)}
                                  aria-label={`Quitar sabor ${item.flavor.name}`}
                                  className={`ml-1 hover:scale-110 transition-transform focus:outline-none focus:ring-1 focus:ring-green-500 rounded ${
                                    theme === 'dark'
                                      ? 'text-green-400 hover:text-green-200'
                                      : 'text-green-600 hover:text-green-800'
                                  }`}
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* ✅ SECCIÓN PARA AGREGAR EXTRAS */}
                        {availableExtras && Array.isArray(availableExtras) && availableExtras.length > 0 && (
                          <div className="mb-4">
                            <p className={`text-sm font-medium mb-2 ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Agregar extras:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {availableExtras.map(extra => (
                                <button
                                  key={extra.id_extra}
                                  type="button"
                                  onClick={() => handleAddExtraToItem(itemIndex, extra)}
                                  aria-label={`Agregar extra ${extra.name} por ${extra.actual_price || extra.price || '0.00'}`}
                                  className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    theme === 'dark'
                                      ? 'border-gray-500 bg-gray-600 text-gray-300 hover:bg-gray-500'
                                      : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  <PlusIcon className="w-3 h-3" />
                                  {extra.name} (+${extra.actual_price || extra.price || '0.00'})
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ✅ SECCIÓN PARA CAMBIAR SALSAS */}
                        {availableSauces && Array.isArray(availableSauces) && availableSauces.length > 0 && (
                          <div className="mb-4">
                            <fieldset>
                              <legend className={`text-sm font-medium mb-2 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Salsas disponibles:
                              </legend>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" role="group" aria-label="Seleccionar salsas">
                                {availableSauces.map(sauce => {
                                  const isSelected = item.sauces.some(s => s.id_sauce === sauce.id_sauce);
                                  const sauceImage = optimizeGoogleDriveImageUrl(sauce.image, 60) ||
                                                    generatePlaceholderUrl(sauce.name, 60, theme === 'dark');

                                  return (
                                    <button
                                      key={sauce.id_sauce}
                                      type="button"
                                      aria-pressed={isSelected}
                                      aria-label={`${sauce.name}${isSelected ? ', seleccionada' : ', no seleccionada'}`}
                                      onClick={() => handleToggleSauceForItem(itemIndex, sauce)}
                                      className={`relative flex flex-col items-center p-3 rounded-lg border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        isSelected
                                          ? theme === 'dark'
                                            ? 'border-red-500 bg-red-900/30 shadow-red-500/25 shadow-lg focus:ring-red-500'
                                            : 'border-red-500 bg-red-100 shadow-red-500/25 shadow-lg focus:ring-red-500'
                                          : theme === 'dark'
                                            ? 'border-gray-500 bg-gray-600 hover:bg-gray-500 hover:border-gray-400 focus:ring-blue-500'
                                            : 'border-gray-300 bg-gray-100 hover:bg-gray-200 hover:border-gray-400 focus:ring-blue-500'
                                      }`}
                                    >
                                      {isSelected && (
                                        <div
                                          className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                                            theme === 'dark' ? 'bg-red-600' : 'bg-red-500'
                                          }`}
                                          aria-hidden="true"
                                        >
                                          <CheckIcon className="w-3 h-3 text-white" />
                                        </div>
                                      )}

                                      <img
                                        src={sauceImage}
                                        alt=""
                                        aria-hidden="true"
                                        className="w-12 h-12 object-cover rounded-lg mb-2 border"
                                        onError={(e) => {
                                          e.target.src = generatePlaceholderUrl(sauce.name, 60, theme === 'dark');
                                        }}
                                      />

                                      <span className={`text-xs font-medium text-center leading-tight ${
                                        isSelected
                                          ? theme === 'dark'
                                            ? 'text-red-300'
                                            : 'text-red-700'
                                          : theme === 'dark'
                                            ? 'text-gray-300'
                                            : 'text-gray-700'
                                      }`}>
                                        {sauce.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>
                          </div>
                        )}

                        {/* ✅ SECCIÓN PARA CAMBIAR SABOR */}
                        {productFlavorsData && Array.isArray(productFlavorsData) && productFlavorsData.length > 0 && (
                          <div>
                            <fieldset>
                              <legend className={`text-sm font-medium mb-2 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                Cambiar sabor:
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
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Seleccionar sabor del producto">
                                  {productFlavorsData.map(flavor => {
                                    if (!flavor || !flavor.id_flavor) {
                                      return null;
                                    }

                                    const isSelected = item.flavor &&
                                                      item.flavor.id_flavor &&
                                                      Number(item.flavor.id_flavor) === Number(flavor.id_flavor);
                                    return (
                                      <button
                                        key={flavor.id_flavor}
                                        id={`flavor-${itemIndex}-${flavor.id_flavor}`}
                                        name={`flavor-item-${itemIndex}`}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        aria-label={`Sabor ${flavor.name || 'Sin nombre'}`}
                                        onClick={() => handleFlavorChangeForItem(itemIndex, flavor)}
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