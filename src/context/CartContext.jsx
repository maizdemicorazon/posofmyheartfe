import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLoading } from './LoadingContext';
import { useMessage } from './MessageContext';
import Swal from 'sweetalert2';

// Crear el contexto
const CartContext = createContext(undefined);

// Hook personalizado para usar el contexto
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Proveedor del contexto
export function CartProvider({ children }) {
  // Estados principales
  const [cart, setCart] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [extras, setExtras] = useState([]);
  const [sauces, setSauces] = useState([]);

  const { setLoading } = useLoading();
  const { setMessage } = useMessage();

  // Función para calcular precio de un producto
  const calculateProductPrice = useCallback((product) => {
    const optionsPrice = Array.isArray(product.options)
      ? product.options.reduce((sum, option) => sum + Number(option?.price || 0), 0)
      : 0;

    const extrasPrice = Array.isArray(product.extras)
      ? product.extras.reduce(
          (sum, extra) => sum + Number(extra?.price || 0) * Number(extra?.quantity || 1),
          0
        )
      : 0;

    const saucesPrice = Array.isArray(product.sauces)
      ? product.sauces.reduce((sum, sauce) => sum + Number(sauce?.price || 0), 0)
      : 0;

    return (optionsPrice + extrasPrice + saucesPrice) * Number(product.quantity || 1);
  }, []);

  // Total del carrito calculado
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, product) => sum + calculateProductPrice(product), 0);
  }, [cart, calculateProductPrice]);

  // ✅ NUEVA FUNCIÓN: Transformar datos de orden mejorada
  const transformOrderData = useCallback((orderData) => {
    return {
      id_order: orderData.id_order,
      client_name: orderData.client_name || 'Cliente',
      order_date: orderData.order_date,
      total: orderData.bill || orderData.total || 0,
      payment_method: {
        id_payment_method: orderData.payment_method,
        name: orderData.payment_name || 'Desconocido'
      },
      comment: orderData.comment,
      items: (orderData.items || []).map(item => ({
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
    };
  }, []);

  // Funciones del carrito
  const addToCart = useCallback((productData) => {
    try {
      setLoading(true);
      setCart(prev => [...prev, { ...productData, id: Date.now() + Math.random() }]);
      setMessage({ text: 'Producto agregado al carrito', type: 'success' });
    } catch (error) {
      setMessage({ text: 'Error al agregar producto al carrito', type: 'error' });
      console.error('Error al agregar producto:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMessage]);

  const removeFromCart = useCallback((index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    setMessage({ text: 'Producto removido del carrito', type: 'info' });
  }, [setMessage]);

  const startEditProduct = useCallback((index) => {
    const product = cart[index];
    if (product) {
      setEditingProduct({ ...product, index });
    }
  }, [cart]);

  const saveEditProduct = useCallback((productData) => {
    if (editingProduct?.index !== undefined) {
      setCart(prev =>
        prev.map((item, i) =>
          i === editingProduct.index ? { ...productData, id: item.id } : item
        )
      );
      setEditingProduct(null);
      setMessage({ text: 'Producto actualizado', type: 'success' });
    }
  }, [editingProduct, setMessage]);

  const cancelEditProduct = useCallback(() => {
    setEditingProduct(null);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setMessage({ text: 'Carrito limpiado', type: 'info' });
  }, [setMessage]);

  // ✅ Guardar orden con API real (MEJORADO con SweetAlert2)
  const saveOrder = useCallback(async () => {
    if (cart.length === 0) {
      await Swal.fire({
        title: 'Carrito vacío',
        text: 'Agrega productos antes de realizar un pedido',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    // ✅ SweetAlert2 para capturar nombre del cliente
    const { value: clientName } = await Swal.fire({
      title: '¿A nombre de quién es la orden?',
      input: 'text',
      inputLabel: 'Nombre del cliente',
      inputPlaceholder: 'Escribe el nombre...',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (!value || value.trim().length < 2) {
          return 'El nombre debe tener al menos 2 caracteres';
        }
      }
    });

    if (!clientName) return;

    setLoading(true);

    try {
      // Estructura según los ejemplos de Postman
      const order = {
        id_payment_method: 1,
        client_name: clientName.trim(),
        comment: "Pedido realizado desde el carrito",
        items: cart.map(item => {
          const orderItem = {
            id_product: item.id_product,
            quantity: item.quantity || 1,
            id_variant: item.options?.[0]?.id_variant || item.id_variant || 0
          };

          // Agregar extras si existen
          if (item.extras && item.extras.length > 0) {
            orderItem.extras = item.extras.map(extra => ({
              id_extra: extra.id_extra,
              quantity: extra.quantity || 1
            }));
          }

          // Agregar salsas si existen
          if (item.sauces && item.sauces.length > 0) {
            orderItem.sauces = item.sauces.map(sauce => ({
              id_sauce: sauce.id_sauce
            }));
          }

          // Agregar sabor si existe (nota: es "flavor" singular, no "flavors")
          if (item.flavors && item.flavors.length > 0) {
            orderItem.flavor = item.flavors[0].id_flavor;
          }

          return orderItem;
        })
      };

      console.log('📤 Enviando orden:', JSON.stringify(order, null, 2));

      const response = await fetch('http://localhost:8081/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
        signal: AbortSignal.timeout(15000) // ✅ 15 segundos timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const savedOrder = await response.json();
      console.log('✅ Orden guardada:', savedOrder);

      // Actualizar la lista local de órdenes
      setOrders(prev => [transformOrderData(savedOrder), ...prev]);
      setCart([]);

      // ✅ SweetAlert2 success
      await Swal.fire({
        title: '¡Orden guardada!',
        text: `Orden #${savedOrder.id_order || 'N/A'} creada exitosamente`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      setMessage({ text: 'Orden guardada con éxito', type: 'success' });
      return savedOrder;

    } catch (error) {
      console.error('❌ Error al guardar la orden:', error);

      let errorMessage = 'Error al guardar la orden';
      let errorIcon = 'error';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado. Verifica tu conexión.';
        errorIcon = 'warning';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor. Verifica que esté corriendo.';
        errorIcon = 'warning';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Error del servidor: ${error.message}`;
      }

      // ✅ SweetAlert2 error
      await Swal.fire({
        title: 'Error al guardar',
        text: errorMessage,
        icon: errorIcon,
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: '#ef4444'
      });

      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [cart, transformOrderData, setLoading, setMessage]);

  // ✅ Cargar todas las órdenes (MEJORADO)
  const loadAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📡 Cargando órdenes desde CartContext...');

      const response = await fetch('http://localhost:8081/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15 segundos
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const ordersData = await response.json();
      console.log('📋 Raw orders data:', ordersData);

      // ✅ Usar la función de transformación mejorada
      const transformedOrders = ordersData.map(transformOrderData);

      console.log('✅ Transformed orders:', transformedOrders);
      setOrders(transformedOrders);
      setMessage(null); // Limpiar mensajes de error previos
      return transformedOrders;

    } catch (error) {
      console.error('❌ Error al cargar órdenes:', error);

      let errorMessage = 'Error al cargar las órdenes';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado al cargar órdenes';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor para cargar órdenes';
      }

      // ✅ SweetAlert2 para errores críticos
      await Swal.fire({
        title: 'Error de conexión',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444'
      });

      setMessage({ text: errorMessage, type: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMessage, transformOrderData]);

  // Funciones para edición de órdenes
  const loadOrderForEdit = useCallback(async (orderId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const orderData = await response.json();
      return transformOrderData(orderData); // ✅ Usar función de transformación

    } catch (error) {
      console.error('Error al cargar la orden:', error);

      let errorMessage = 'Error al cargar la orden para edición';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado al cargar la orden';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor para cargar la orden';
      }

      setMessage({ text: errorMessage, type: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMessage, transformOrderData]);

  const updateOrder = useCallback(async (orderId, updateData) => {
    setLoading(true);
    try {
      // Preparar datos en formato snake_case según ejemplos de Postman
      const requestData = {
        id_payment_method: updateData.id_payment_method,
        updated_items: updateData.updated_items.map(item => {
          const cleanItem = {
            id_order_detail: item.id_order_detail,
            id_product: item.id_product,
            id_variant: item.id_variant
          };

          // Solo agregar campos si tienen contenido
          if (item.updated_extras && item.updated_extras.length > 0) {
            cleanItem.updated_extras = item.updated_extras.map(extra => ({
              id_extra: extra.id_extra,
              quantity: extra.quantity
            }));
          }

          if (item.updated_sauces && item.updated_sauces.length > 0) {
            cleanItem.updated_sauces = item.updated_sauces.map(sauce => ({
              id_sauce: sauce.id_sauce
            }));
          }

          if (item.updated_flavors && item.updated_flavors.length > 0) {
            cleanItem.updated_flavors = item.updated_flavors.map(flavor => ({
              id_flavor: flavor.id_flavor
            }));
          }

          return cleanItem;
        })
      };

      // Agregar campos opcionales solo si están presentes
      if (updateData.client_name && updateData.client_name.trim()) {
        requestData.client_name = updateData.client_name.trim();
      }

      if (updateData.comment && updateData.comment.trim()) {
        requestData.comment = updateData.comment.trim();
      }

      console.log('📤 Enviando datos de actualización:', JSON.stringify(requestData, null, 2));

      const response = await fetch(`http://localhost:8081/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const updatedOrder = await response.json();
      const transformedOrder = transformOrderData(updatedOrder);

      // Actualizar la lista local de órdenes si existe
      setOrders(prev => prev.map(order =>
        order.id_order === orderId ? transformedOrder : order
      ));

      setMessage({ text: 'Orden actualizada exitosamente', type: 'success' });
      return transformedOrder;

    } catch (error) {
      console.error('❌ Error al actualizar la orden:', error);
      setMessage({
        text: `Error al actualizar la orden: ${error.message}`,
        type: 'error'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMessage, transformOrderData]);

  const loadCatalogsForEdit = useCallback(async () => {
    try {
      const [extrasRes, saucesRes, flavorsRes, paymentsRes] = await Promise.allSettled([
        fetch('http://localhost:8081/api/extras'),
        fetch('http://localhost:8081/api/sauces'),
        fetch('http://localhost:8081/api/flavors'),
        fetch('http://localhost:8081/api/payments')
      ]);

      const catalogs = {};

      if (extrasRes.status === 'fulfilled' && extrasRes.value.ok) {
        catalogs.extras = await extrasRes.value.json();
      } else {
        catalogs.extras = [];
      }

      if (saucesRes.status === 'fulfilled' && saucesRes.value.ok) {
        catalogs.sauces = await saucesRes.value.json();
      } else {
        catalogs.sauces = [];
      }

      if (flavorsRes.status === 'fulfilled' && flavorsRes.value.ok) {
        catalogs.flavors = await flavorsRes.value.json();
      } else {
        catalogs.flavors = [];
      }

      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
        catalogs.paymentMethods = await paymentsRes.value.json();
      } else {
        catalogs.paymentMethods = [
          { id_payment_method: 1, name: 'Efectivo' },
          { id_payment_method: 2, name: 'Tarjeta' },
          { id_payment_method: 3, name: 'Transferencia' }
        ];
      }

      return catalogs;

    } catch (error) {
      console.error('Error al cargar catálogos:', error);
      setMessage({ text: 'Error al cargar catálogos para edición', type: 'error' });

      return {
        extras: [],
        sauces: [],
        flavors: [],
        paymentMethods: [
          { id_payment_method: 1, name: 'Efectivo' },
          { id_payment_method: 2, name: 'Tarjeta' },
          { id_payment_method: 3, name: 'Transferencia' }
        ]
      };
    }
  }, [setMessage]);

  // ✅ Valor del contexto OPTIMIZADO
  const contextValue = useMemo(() => ({
    // Estados
    cart,
    editingProduct,
    orders,
    products,
    extras,
    sauces,
    cartTotal,

    // Funciones del carrito
    addToCart,
    removeFromCart,
    startEditProduct,
    saveEditProduct,
    cancelEditProduct,
    clearCart,
    saveOrder,
    calculateProductPrice,

    // Setters
    setProducts,
    setExtras,
    setSauces,
    setOrders,

    // Funciones de edición de órdenes
    loadOrderForEdit,
    updateOrder,
    loadCatalogsForEdit,
    loadAllOrders,
    transformOrderData
  }), [
    cart,
    editingProduct,
    orders,
    products,
    extras,
    sauces,
    cartTotal,
    addToCart,
    removeFromCart,
    startEditProduct,
    saveEditProduct,
    cancelEditProduct,
    clearCart,
    saveOrder,
    calculateProductPrice,
    loadOrderForEdit,
    updateOrder,
    loadCatalogsForEdit,
    loadAllOrders,
    transformOrderData
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}