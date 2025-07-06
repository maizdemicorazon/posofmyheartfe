import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useLoading } from './LoadingContext';
import { useMessage } from './MessageContext';
import Swal from 'sweetalert2';

import {
  createOrder,
  getOrders,
  updateOrder
} from '../utils/api';

// Crear el contexto con un valor inicial definido
const CartContext = createContext(null);

// ✅ EXPORTAR EL CONTEXTO PARA USO EXTERNO SI ES NECESARIO
export { CartContext };

// Hook personalizado para usar el contexto con verificación mejorada
export function useCart() {
  const context = useContext(CartContext);

  // ✅ VERIFICACIÓN MEJORADA: Incluir más información de debug
  if (context === undefined || context === null) {
    console.error('❌ useCart called outside CartProvider context');
    console.error('❌ Stack trace:', new Error().stack);
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}

// Proveedor del contexto con inicialización defensiva
export function CartProvider({ children }) {
  // ✅ ESTADO DE INICIALIZACIÓN para prevenir renders prematuros
  const [isInitialized, setIsInitialized] = useState(false);

  // Estados principales
  const [cart, setCart] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [extras, setExtras] = useState([]);
  const [sauces, setSauces] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const { setLoading } = useLoading();
  const { setMessage } = useMessage();

  // ✅ EFECTO DE INICIALIZACIÓN
  useEffect(() => {
    console.log('🚀 CartProvider initializing...');
    setIsInitialized(true);
    return () => {
      console.log('🔄 CartProvider cleanup');
      setIsInitialized(false);
    };
  }, []);

  // ✅ FUNCIÓN PARA CALCULAR PRECIO DE PRODUCTO - INCLUYE CLIENTE
  const calculateProductPrice = useCallback((product) => {
    if (!product) {
      console.warn('⚠️ calculateProductPrice: product is null or undefined');
      return 0;
    }

    console.log('💰 Calculating price for product:', {
      productId: product.id,
      productName: product.product_name || product.name,
      clientName: product.clientName,
      hasSelectedPaymentMethod: !!product.selectedPaymentMethod,
      hasSelectedOption: !!product.selectedOption,
      hasOptions: !!product.options,
      hasSelectedExtras: !!product.selectedExtras,
      hasExtras: !!product.extras,
      hasSelectedSauces: !!product.selectedSauces,
      hasSauces: !!product.sauces
    });

    try {
      let basePrice = 0;

      // ✅ PRECIO BASE DEL PRODUCTO
      if (product.selectedOption?.price) {
        basePrice = parseFloat(product.selectedOption.price);
      } else if (product.price) {
        basePrice = parseFloat(product.price);
      } else if (product.options && product.options.length > 0) {
        basePrice = parseFloat(product.options[0].price || 0);
      }

      console.log('💰 Base price calculated:', basePrice);

      // ✅ PRECIO DE EXTRAS
      let extrasPrice = 0;
      if (product.selectedExtras && Array.isArray(product.selectedExtras)) {
        extrasPrice = product.selectedExtras.reduce((sum, extra) => {
          const price = parseFloat(extra.price || 0);
          return sum + price;
        }, 0);
      }

      console.log('💰 Extras price calculated:', extrasPrice);

      // ✅ PRECIO TOTAL POR UNIDAD
      const unitPrice = basePrice + extrasPrice;
      const quantity = parseInt(product.quantity || 1);
      const totalPrice = unitPrice * quantity;

      console.log('💰 Final calculation:', {
        unitPrice,
        quantity,
        totalPrice
      });

      return totalPrice;

    } catch (error) {
      console.error('❌ Error calculating product price:', error, product);
      return 0;
    }
  }, []);

  // ✅ CALCULAR TOTAL DEL CARRITO
  const cartTotal = useMemo(() => {
    if (!cart || cart.length === 0) return 0;

    const total = cart.reduce((sum, item) => {
      const itemTotal = calculateProductPrice(item);
      return sum + itemTotal;
    }, 0);

    console.log('🧮 Cart total calculated:', total);
    return total;
  }, [cart, calculateProductPrice]);

  // ✅ AGREGAR AL CARRITO
  const addToCart = useCallback((product) => {
    if (!product) {
      console.error('❌ Cannot add null/undefined product to cart');
      return;
    }

    console.log('➕ Adding product to cart:', product);

    const cartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      id_product: product.id,
      product_name: product.product_name || product.name,
      quantity: product.quantity || 1,
      selectedOption: product.selectedOption,
      selectedFlavor: product.selectedFlavor,
      selectedExtras: product.selectedExtras || [],
      selectedSauces: product.selectedSauces || [],
      selectedPaymentMethod: product.selectedPaymentMethod,
      comment: product.comment || '',
      clientName: product.clientName || '',
      image: product.image,
      options: product.options || [],
      flavors: product.flavors || [],
      extras: product.extras || [],
      sauces: product.sauces || [],
      payment_methods: product.payment_methods || []
    };

    setCart(prevCart => {
      const newCart = [...prevCart, cartItem];
      console.log('✅ Product added to cart. New cart:', newCart);
      return newCart;
    });

    setMessage({ text: 'Producto agregado al carrito', type: 'success' });
  }, [setMessage]);

  // ✅ REMOVER DEL CARRITO
  const removeFromCart = useCallback((itemId) => {
    console.log('🗑️ Removing item from cart:', itemId);

    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== itemId);
      console.log('✅ Item removed. New cart:', newCart);
      return newCart;
    });

    setMessage({ text: 'Producto eliminado del carrito', type: 'info' });
  }, [setMessage]);

  // ✅ INICIAR EDICIÓN DE PRODUCTO
  const startEditProduct = useCallback((product) => {
    console.log('✏️ Starting edit for product:', product);
    setEditingProduct(product);
  }, []);

  // ✅ GUARDAR EDICIÓN DE PRODUCTO
  const saveEditProduct = useCallback((updatedProduct) => {
    if (!editingProduct) {
      console.error('❌ No product being edited');
      return;
    }

    console.log('💾 Saving edited product:', updatedProduct);

    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === editingProduct.id) {
          const updatedItem = {
            ...item,
            ...updatedProduct,
            id: item.id // Mantener el ID original
          };
          console.log('✅ Product updated in cart:', updatedItem);
          return updatedItem;
        }
        return item;
      });
    });

    setEditingProduct(null);
    setMessage({ text: 'Producto actualizado', type: 'success' });
  }, [editingProduct, setMessage]);

  // ✅ CANCELAR EDICIÓN
  const cancelEditProduct = useCallback(() => {
    console.log('❌ Cancelling product edit');
    setEditingProduct(null);
  }, []);

  // ✅ LIMPIAR CARRITO
  const clearCart = useCallback(() => {
    console.log('🧹 Clearing cart');
    setCart([]);
    setEditingProduct(null);
  }, []);

  // ✅ TRANSFORMAR DATOS DE ORDEN PARA UI
  const transformOrderData = useCallback((orderData) => {
    console.log('🔄 Transforming order data:', orderData);

    try {
      return {
        id_order: orderData.id_order,
        client_name: orderData.client_name || 'Cliente',
        order_date: orderData.order_date,
        total_amount: parseFloat(orderData.total_amount || 0),
        status: orderData.status || 'pending',
        id_payment_method: orderData.id_payment_method,
        payment_method_name: orderData.payment_method_name,
        items: (orderData.order_details || []).map(detail => ({
          id_order_detail: detail.id_order_detail,
          id_product: detail.id_product,
          product_name: detail.product_name,
          quantity: parseInt(detail.quantity || 1),
          unit_price: parseFloat(detail.unit_price || 0),
          total_price: parseFloat(detail.total_price || 0),
          id_variant: detail.id_variant,
          variant_name: detail.variant_name,
          comment: detail.comment || '',
          extras: detail.extras || [],
          sauces: detail.sauces || []
        }))
      };
    } catch (error) {
      console.error('❌ Error transforming order data:', error);
      return orderData;
    }
  }, []);

  // ✅ GUARDAR ORDEN
  const saveOrder = useCallback(async () => {
    if (!cart || cart.length === 0) {
      await Swal.fire({
        title: 'Carrito vacío',
        text: 'Agrega productos antes de crear la orden',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    setLoading(true);

    try {
      console.log('💾 Saving order with cart:', cart);

      // Usar el primer producto para obtener datos del cliente y pago
      const firstProduct = cart[0];
      const clientName = firstProduct?.clientName || '';
      const paymentMethodId = firstProduct?.selectedPaymentMethod?.id;

      if (!paymentMethodId) {
        throw new Error('Método de pago requerido');
      }

      // Construir estructura de orden
      const orderData = {
        client_name: clientName,
        id_payment_method: paymentMethodId,
        order_details: cart.map(item => {
          const unitPrice = calculateProductPrice({ ...item, quantity: 1 });

          return {
            id_product: item.id_product,
            id_variant: item.selectedOption?.id || item.selectedFlavor?.id,
            quantity: parseInt(item.quantity || 1),
            unit_price: unitPrice,
            total_price: unitPrice * parseInt(item.quantity || 1),
            comment: item.comment || '',
            extras: (item.selectedExtras || []).map(extra => ({
              id_extra: extra.id,
              extra_name: extra.extra_name
            })),
            sauces: (item.selectedSauces || []).map(sauce => ({
              id_sauce: sauce.id,
              sauce_name: sauce.sauce_name
            }))
          };
        })
      };

      console.log('📤 Sending order data:', orderData);

      const response = await createOrder(orderData);
      console.log('✅ Order created successfully:', response);

      clearCart();

      await Swal.fire({
        title: '¡Orden creada!',
        text: `Orden #${response.id_order || 'Nueva'} creada exitosamente${clientName ? ` para ${clientName}` : ''}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      setMessage({ text: 'Orden guardada exitosamente', type: 'success' });

    } catch (error) {
      console.error('❌ Error saving order:', error);

      let errorMessage = 'Error al guardar la orden.';
      if (error.message.includes('400')) {
        errorMessage = 'Hubo un error con los datos enviados. Revisa los productos.';
      }

      await Swal.fire({
        title: 'Error al guardar',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: '#ef4444'
      });

      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [cart, setLoading, setMessage, calculateProductPrice, clearCart]);

  // ✅ ACTUALIZAR ORDEN
  const updateOrderContext = useCallback(async (orderId, updateData) => {
    setLoading(true);
    try {
      console.log('📤 Enviando datos de actualización a la API:', { orderId, payload: updateData });

      const updatedOrder = await updateOrder(orderId, updateData);
      const transformedOrder = transformOrderData(updatedOrder);

      // Actualizar la lista local de órdenes para reflejar los cambios en la UI
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

  // ✅ Valor del contexto OPTIMIZADO - INCLUYE CLIENTE
  const contextValue = useMemo(() => {
    if (!isInitialized) {
      console.log('⏳ CartContext not yet initialized');
      return null;
    }

    return {
      cart,
      editingProduct,
      orders,
      products,
      extras,
      sauces,
      paymentMethods,
      cartTotal,
      addToCart,
      removeFromCart,
      startEditProduct,
      saveEditProduct,
      cancelEditProduct,
      clearCart,
      saveOrder,
      calculateProductPrice,
      setProducts,
      setExtras,
      setSauces,
      setPaymentMethods,
      setOrders,
      updateOrder: updateOrderContext,
      transformOrderData,
      isInitialized
    };
  }, [
    isInitialized,
    cart,
    editingProduct,
    orders,
    products,
    extras,
    sauces,
    paymentMethods,
    cartTotal,
    addToCart,
    removeFromCart,
    startEditProduct,
    saveEditProduct,
    cancelEditProduct,
    clearCart,
    saveOrder,
    calculateProductPrice,
    updateOrderContext,
    transformOrderData
  ]);

  // ✅ RENDERIZADO CONDICIONAL: Solo renderizar children cuando esté inicializado
  if (!isInitialized || contextValue === null) {
    console.log('⏳ CartProvider not ready, showing loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('✅ CartProvider rendering with context value');

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}