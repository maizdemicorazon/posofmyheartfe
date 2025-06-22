import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLoading } from './LoadingContext';
import { useMessage } from './MessageContext';
import Swal from 'sweetalert2';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import {
  createOrder,
  getOrders,
  updateOrder,
  getOrderById
} from '../utils/api';

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

    const flavorsPrice = Array.isArray(product.flavors)
      ? product.flavors.reduce((sum, flavor) => sum + Number(flavor?.price || 0), 0)
      : 0;

    const basePrice = Number(product.price || 0);
    const quantity = Number(product.quantity || 1);

    return (basePrice + optionsPrice + extrasPrice + saucesPrice + flavorsPrice) * quantity;
  }, []);

  // Calcular total del carrito
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      if (item.totalPrice) {
        return total + item.totalPrice;
      }
      return total + calculateProductPrice(item);
    }, 0);
  }, [cart, calculateProductPrice]);

  // Función para agregar al carrito
  const addToCart = useCallback((item) => {
    const newItem = {
      id: Date.now() + Math.random(),
      ...item,
      totalPrice: item.totalPrice || calculateProductPrice(item)
    };

    setCart(prev => [...prev, newItem]);
    console.log('Item added to cart:', newItem);
  }, [calculateProductPrice]);

  // Función para remover del carrito
  const removeFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    console.log('Item removed from cart:', itemId);
  }, []);

  // Función para limpiar carrito
  const clearCart = useCallback(() => {
    setCart([]);
    setEditingProduct(null);
    console.log('Cart cleared');
  }, []);

  // Funciones para edición de productos
  const startEditProduct = useCallback((cartItem) => {
    setEditingProduct(cartItem);
    console.log('Started editing product:', cartItem);
  }, []);

  const saveEditProduct = useCallback((updatedItem) => {
    if (!editingProduct) return;

    setCart(prev => prev.map(item =>
      item.id === editingProduct.id
        ? { ...updatedItem, id: editingProduct.id, totalPrice: updatedItem.totalPrice || calculateProductPrice(updatedItem) }
        : item
    ));

    setEditingProduct(null);
    console.log('Product updated:', updatedItem);
  }, [editingProduct, calculateProductPrice]);

  const cancelEditProduct = useCallback(() => {
    setEditingProduct(null);
    console.log('Product edit cancelled');
  }, []);

  // ✅ FUNCIÓN PARA TRANSFORMAR DATOS DE ORDEN DESDE EL BACKEND - CORREGIDA
  const transformOrderData = useCallback((orderData = null) => {
    // Si no se proporciona orderData, transformar desde el carrito
    if (!orderData) {
      return {
        order_items: cart.map(item => {
          const orderItem = {
            id_product: item.product?.id_product || item.id_product,
            quantity: item.quantity || 1,
            unit_price: item.selectedOption?.price || item.product?.price || item.price || 0,
            comment: item.comment || null
          };

          // Agregar opción seleccionada
          if (item.selectedOption) {
            orderItem.id_variant = item.selectedOption.id_variant;
          }

          // Agregar sabor seleccionado
          if (item.selectedFlavor) {
            orderItem.id_flavor = item.selectedFlavor.id_flavor;
          }

          // Agregar extras seleccionados
          if (item.selectedExtras && item.selectedExtras.length > 0) {
            orderItem.extras = item.selectedExtras.map(extra => ({
              id_extra: extra.id_extra,
              quantity: 1
            }));
          }

          // Agregar salsas seleccionadas
          if (item.selectedSauces && item.selectedSauces.length > 0) {
            orderItem.sauces = item.selectedSauces.map(sauce => ({
              id_sauce: sauce.id_sauce
            }));
          }

          return orderItem;
        })
      };
    }

    // ✅ TRANSFORMAR DATOS DE ORDEN DESDE EL BACKEND CON MAPEO CORRECTO
    return {
      id_order: orderData.id_order,
      client_name: orderData.client_name || '',
      comment: orderData.comment || '',

      // ✅ MAPEO CORRECTO: bill → total_amount
      total_amount: Number(orderData.bill || orderData.total_amount || 0),

      // ✅ MAPEO CORRECTO: order_date → created_at
      created_at: orderData.order_date || orderData.created_at,
      updated_at: orderData.updated_at,

      // ✅ MAPEO CORRECTO: payment_method del backend
      payment_method: {
        id_payment_method: orderData.payment_method,
        name: orderData.payment_name || 'Desconocido'
      },

      // ✅ MAPEO CORRECTO: items → items (no order_items)
      items: (orderData.items || []).map((item, index) => ({
        id_order_detail: item.id_order_detail || `temp-${index}`,
        id_product: item.id_product,
        id_variant: item.id_variant,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.product_price || item.unit_price || 0),
        total_price: Number(item.product_price || item.total_price || 0),
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

        // ✅ Campos directos para compatibilidad
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
  }, [cart]);

  // ✅ GUARDAR ORDEN - MIGRADO A NUEVAS UTILIDADES
  const saveOrder = useCallback(async () => {
    if (cart.length === 0) {
      setMessage({ text: 'El carrito está vacío', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      console.log('💾 Saving order with cart:', cart);

      const orderData = transformOrderData();
      console.log('📤 Order data to send:', JSON.stringify(orderData, null, 2));

      // ✅ USAR NUEVA FUNCIÓN DE API EN LUGAR DE FETCH DIRECTO
      const response = await createOrder(orderData);

      console.log('✅ Order saved successfully:', response);

      // Limpiar carrito
      setCart([]);
      setEditingProduct(null);

      // Actualizar lista de órdenes
      await loadAllOrders();

      // ✅ SweetAlert2 success
      await Swal.fire({
        title: '¡Pedido guardado!',
        text: `Orden #${response.id_order || 'Nueva'} creada exitosamente`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      setMessage({ text: 'Orden guardada exitosamente', type: 'success' });

    } catch (error) {
      console.error('❌ Error saving order:', error);

      let errorMessage = 'Error al guardar la orden.';
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

  // ✅ CARGAR TODAS LAS ÓRDENES - MIGRADO CON TRANSFORMACIÓN CORRECTA
  const loadAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📡 Cargando órdenes desde CartContext...');

      // ✅ USAR NUEVA FUNCIÓN DE API
      const ordersData = await getOrders();
      console.log('📋 Raw orders data:', ordersData);

      // ✅ Usar la función de transformación corregida
      const transformedOrders = ordersData.map(order => transformOrderData(order));

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

  // ✅ CARGAR ORDEN PARA EDICIÓN - MIGRADO CON TRANSFORMACIÓN CORRECTA
  const loadOrderForEdit = useCallback(async (orderId) => {
    setLoading(true);
    try {
      // ✅ USAR NUEVA FUNCIÓN DE API
      const orderData = await getOrderById(orderId);

      // ✅ USAR TRANSFORMACIÓN CORRECTA
      return transformOrderData(orderData);

    } catch (error) {
      console.error('❌ Error al cargar orden para edición:', error);
      setMessage({
        text: `Error al cargar la orden: ${error.message}`,
        type: 'error'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMessage, transformOrderData]);

  // ✅ ACTUALIZAR ORDEN - MIGRADO CON ESTRUCTURA CORRECTA
  const updateOrderContext = useCallback(async (orderId, updateData) => {
    setLoading(true);
    try {
      console.log('🔄 Actualizando orden:', orderId, updateData);

      // ✅ PREPARAR DATOS SEGÚN LA ESTRUCTURA ESPERADA POR EL BACKEND
      const requestData = {
        comment: updateData.comment || '',
        id_payment_method: Number(updateData.id_payment_method),
        ...(updateData.client_name && { client_name: updateData.client_name }),
        updated_items: updateData.updated_items.map(item => {
          const cleanItem = {
            id_product: Number(item.id_product),
            id_variant: Number(item.id_variant)
          };

          // ✅ ITEM EXISTENTE vs NUEVO
          if (item.id_order_detail) {
            cleanItem.id_order_detail = Number(item.id_order_detail);
          } else {
            cleanItem.id_order = Number(orderId);
          }

          // ✅ EXTRAS: Solo incluir si hay extras
          if (item.updated_extras && item.updated_extras.length > 0) {
            cleanItem.updated_extras = item.updated_extras.map(extra => ({
              id_extra: Number(extra.id_extra),
              quantity: Number(extra.quantity) || 1
            }));
          }

          // ✅ SALSAS: Solo incluir si hay salsas
          if (item.updated_sauces && item.updated_sauces.length > 0) {
            cleanItem.updated_sauces = item.updated_sauces.map(sauce => ({
              id_sauce: Number(sauce.id_sauce)
            }));
          }

          // ✅ SABOR: Solo incluir si hay sabor (como número, no objeto)
          if (item.flavor && item.flavor.id_flavor) {
            cleanItem.flavor = Number(item.flavor.id_flavor);
          }

          return cleanItem;
        })
      };

      console.log('📤 Enviando datos de actualización:', JSON.stringify(requestData, null, 2));

      // ✅ USAR NUEVA FUNCIÓN DE API
      const updatedOrder = await updateOrder(orderId, requestData);
      const transformedOrder = transformOrderData(updatedOrder);

      // Actualizar la lista local de órdenes
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
    updateOrder: updateOrderContext, // Renombrado para evitar conflictos
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
    updateOrderContext,
    loadAllOrders,
    transformOrderData
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}