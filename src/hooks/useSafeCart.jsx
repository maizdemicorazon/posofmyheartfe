import { useContext, useEffect, useState } from 'react';
import { CartContext, useCart as useCartOriginal } from '../context/CartContext';

/**
 * Hook defensivo para usar el CartContext de forma segura
 * Este hook verifica que el contexto esté disponible antes de usarlo
 * y proporciona un estado de loading mientras se inicializa
 */
export function useSafeCart() {
  const [isContextReady, setIsContextReady] = useState(false);
  const [contextError, setContextError] = useState(null);

  let context = null;
  let hasError = false;

  try {
    // ✅ USAR EL CONTEXTO DIRECTAMENTE PARA VERIFICACIÓN
    context = useContext(CartContext);
  } catch (error) {
    console.error('❌ Error accessing CartContext:', error);
    hasError = true;
    setContextError(error);
  }

  // ✅ VERIFICAR SI EL CONTEXTO ESTÁ DISPONIBLE E INICIALIZADO
  useEffect(() => {
    if (hasError || !context) {
      setIsContextReady(false);
      return;
    }

    // ✅ Verificar si el contexto tiene la propiedad isInitialized
    if (context.isInitialized === true) {
      setIsContextReady(true);
      setContextError(null);
    } else {
      setIsContextReady(false);
    }
  }, [context, hasError]);

  // ✅ RETORNAR ESTADO DEL CONTEXTO
  return {
    // ✅ Datos del contexto (solo si está listo)
    cart: isContextReady ? context.cart : [],
    editingProduct: isContextReady ? context.editingProduct : null,
    orders: isContextReady ? context.orders : [],
    products: isContextReady ? context.products : [],
    extras: isContextReady ? context.extras : [],
    sauces: isContextReady ? context.sauces : [],
    paymentMethods: isContextReady ? context.paymentMethods : [],
    cartTotal: isContextReady ? context.cartTotal : 0,

    // ✅ Funciones del contexto (solo si está listo)
    addToCart: isContextReady ? context.addToCart : () => console.warn('Cart context not ready'),
    removeFromCart: isContextReady ? context.removeFromCart : () => console.warn('Cart context not ready'),
    startEditProduct: isContextReady ? context.startEditProduct : () => console.warn('Cart context not ready'),
    saveEditProduct: isContextReady ? context.saveEditProduct : () => console.warn('Cart context not ready'),
    cancelEditProduct: isContextReady ? context.cancelEditProduct : () => console.warn('Cart context not ready'),
    clearCart: isContextReady ? context.clearCart : () => console.warn('Cart context not ready'),
    saveOrder: isContextReady ? context.saveOrder : () => console.warn('Cart context not ready'),
    calculateProductPrice: isContextReady ? context.calculateProductPrice : () => 0,
    setProducts: isContextReady ? context.setProducts : () => console.warn('Cart context not ready'),
    setExtras: isContextReady ? context.setExtras : () => console.warn('Cart context not ready'),
    setSauces: isContextReady ? context.setSauces : () => console.warn('Cart context not ready'),
    setPaymentMethods: isContextReady ? context.setPaymentMethods : () => console.warn('Cart context not ready'),
    setOrders: isContextReady ? context.setOrders : () => console.warn('Cart context not ready'),
    updateOrder: isContextReady ? context.updateOrder : () => console.warn('Cart context not ready'),
    transformOrderData: isContextReady ? context.transformOrderData : (data) => data,

    // ✅ Estados de control
    isContextReady,
    isLoading: !isContextReady && !contextError,
    hasError: !!contextError,
    error: contextError
  };
}

/**
 * Hook más simple que lanza error si el contexto no está disponible
 * Usar este cuando estés seguro de que el componente está dentro del provider
 */
export function useCart() {
  return useCartOriginal();
}

/**
 * Hook que verifica si el CartProvider está disponible sin lanzar error
 * Útil para componentes opcionales que pueden funcionar sin el contexto
 */
export function useCartOptional() {
  try {
    const context = useContext(CartContext);
    return {
      isAvailable: !!context && context.isInitialized,
      context: context || null
    };
  } catch {
    return {
      isAvailable: false,
      context: null
    };
  }
}

export default useSafeCart;