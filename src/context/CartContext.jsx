import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLoading } from './LoadingContext';
import { useMessage } from './MessageContext';
import Swal from 'sweetalert2';

import {
  createOrder,
  getOrders,
  updateOrder
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
  const [paymentMethods, setPaymentMethods] = useState([]);

  const { setLoading } = useLoading();
  const { setMessage } = useMessage();

  // ✅ FUNCIÓN PARA CALCULAR PRECIO DE PRODUCTO - INCLUYE CLIENTE
const calculateProductPrice = useCallback((product) => {
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
    hasSauces: !!product.sauces,
    quantity: product.quantity,
    extrasWithQuantities: product.selectedExtras
  });

    // ✅ PRECIO BASE - Buscar en múltiples ubicaciones con prioridad correcta
      let basePrice = 0;

      if (product.selectedOption?.price) {
        basePrice = Number(product.selectedOption.price);
        console.log('💰 Using selectedOption price:', basePrice);
      } else if (product.options?.length > 0) {
        basePrice = Number(product.options[0]?.price || 0);
        console.log('💰 Using first option price:', basePrice);
      } else if (product.price) {
        basePrice = Number(product.price);
        console.log('💰 Using product price:', basePrice);
      } else if (product.product_price) {
        basePrice = Number(product.product_price);
        console.log('💰 Using product_price:', basePrice);
      } else {
        console.log('⚠️ No price found, using 0');
      }

    // ✅ PRECIO DE EXTRAS - Buscar en selectedExtras primero, luego extras
      let extrasPrice = 0;
      if (product.selectedExtras?.length > 0) {
        product.selectedExtras.forEach(extra => {
          const extraPrice = Number(extra.price || 0);
          const extraQuantity = Number(extra.quantity || 1); // ✅ USAR CANTIDAD DEL EXTRA
          const extraTotal = extraPrice * extraQuantity;
          extrasPrice += extraTotal;
          console.log(`💰 Extra: ${extra.name} - $${extraPrice} x ${extraQuantity} = $${extraTotal}`);
        });
        console.log('💰 Total extras price:', extrasPrice);
      } else if (product.extras?.length > 0) {
        // ✅ Compatibilidad con formato antiguo
        product.extras.forEach(extra => {
          const extraPrice = Number(extra.price || extra.actual_price || 0);
          const extraQuantity = Number(extra.quantity || 1);
          const extraTotal = extraPrice * extraQuantity;
          extrasPrice += extraTotal;
          console.log(`💰 Extra (legacy): ${extra.name} - $${extraPrice} x ${extraQuantity} = $${extraTotal}`);
        });
        console.log('💰 Total extras price (legacy):', extrasPrice);
      }

    // ✅ CÁLCULO FINAL
    const unitPrice = basePrice + extrasPrice;
    console.log('💰 Unit price (base + extras):', unitPrice);

    // ✅ PRECIO TOTAL FINAL
    const quantity = Number(product.quantity || 1);
    const totalPrice = unitPrice * quantity;

    console.log('💰 Final calculation:', {
        basePrice,
        extrasPrice,
        unitPrice,
        quantity,
        totalPrice
      });

    return totalPrice;
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

  // ✅ FUNCIÓN PARA AGREGAR AL CARRITO
  const addToCart = useCallback((item) => {
    console.log('🔄 Adding to cart - Input item:', item);

    // ✅ GENERAR ID ÚNICO MÁS ROBUSTO PARA EVITAR DUPLICADOS
    const uniqueId = `cart-${Date.now()}-${Math.floor(Math.random() * 10000)}-${Math.random().toString(36).substr(2, 9)}`;

    // ✅ MAPEAR ESTRUCTURA PARA COMPATIBILIDAD
    const newItem = {
      // ✅ ID único ROBUSTO para el carrito
      id: uniqueId,

      // ✅ MAPEAR DATOS DEL PRODUCTO AL NIVEL SUPERIOR (para compatibilidad con Cart.jsx)
      id_product: item.product?.id_product || item.id_product,
      product_name: item.product?.name || item.product_name || item.name,
      product_image: item.product?.image || item.product_image || item.image,

      // ✅ MANTENER EL PRODUCTO ANIDADO (para App.jsx y modal de edición)
      product: item.product,

      // ✅ DATOS DE LA SELECCIÓN
      quantity: item.quantity || 1,
      selectedOption: item.selectedOption,
      selectedFlavor: item.selectedFlavor,
      selectedExtras: item.selectedExtras || [],
      selectedSauces: item.selectedSauces || [],
      selectedPaymentMethod: item.selectedPaymentMethod || [],
      comment: item.comment || '',
      clientName: item.clientName || '',

      // ✅ MAPEAR VARIANTE AL NIVEL SUPERIOR (para compatibilidad)
      id_variant: item.selectedOption?.id_variant || item.id_variant,
      variant_name: item.selectedOption?.size || item.variant_name,

      // ✅ MAPEAR SABOR AL NIVEL SUPERIOR (para compatibilidad)
      flavor: item.selectedFlavor || item.flavor,

      // ✅ MAPEAR EXTRAS Y SALSAS AL NIVEL SUPERIOR (para compatibilidad)
      extras: item.selectedExtras || item.extras || [],
      sauces: item.selectedSauces || item.sauces || [],
      paymentMethods: item.selectedPaymentMethod || item.paymentMethods || [],

      // ✅ PRECIO TOTAL
      totalPrice: item.totalPrice || calculateProductPrice(item),

      // ✅ COPIAR CUALQUIER OTRO CAMPO QUE PUEDA VENIR
      ...item
    };

    console.log('✅ Adding to cart - Mapped item:', newItem);
    console.log('🔍 Key fields check:', {
      uniqueId: newItem.id,
      id_product: newItem.id_product,
      product_name: newItem.product_name,
      product_image: newItem.product_image,
      variant_name: newItem.variant_name,
      clientName: newItem.clientName,
      hasProduct: !!newItem.product
    });

    setCart(prev => [...prev, newItem]);
    console.log('✅ Item successfully added to cart with unique ID:', uniqueId);
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

  // ✅ FUNCIÓN PARA GUARDAR EDICIÓN DE PRODUCTO - INCLUYE CLIENTE
  const saveEditProduct = useCallback((updatedItem) => {
    if (!editingProduct) {
      console.error('❌ No editingProduct found in saveEditProduct');
      return;
    }

    setCart(prev => prev.map(item => {
      // ✅ COMPARAR POR ID ÚNICO DEL CARRITO
      if (item.id === editingProduct.id) {
        console.log('🎯 Found item to update by unique cart ID:', item.id);

        // ✅ CREAR ITEM ACTUALIZADO CON MAPEO COMPLETO
        const updatedCartItem = {
          // ✅ Mantener EL MISMO ID único del carrito
          id: editingProduct.id,

          // ✅ MAPEAR DATOS DEL PRODUCTO AL NIVEL SUPERIOR
          id_product: updatedItem.product?.id_product || editingProduct.id_product,
          product_name: updatedItem.product?.name || editingProduct.product_name,
          product_image: updatedItem.product?.image || editingProduct.product_image,

          // ✅ MANTENER EL PRODUCTO ANIDADO
          product: updatedItem.product || editingProduct.product,

          // ✅ DATOS DE LA SELECCIÓN ACTUALIZADA DESDE EL MODAL
          quantity: updatedItem.quantity || 1,
          selectedOption: updatedItem.selectedOption,
          selectedFlavor: updatedItem.selectedFlavor,
          selectedExtras: updatedItem.selectedExtras || [],
          selectedSauces: updatedItem.selectedSauces || [],
          comment: updatedItem.comment || '',
          clientName: updatedItem.clientName || '',

          // ✅ PRESERVAR MÉTODO DE PAGO
          selectedPaymentMethod: updatedItem.selectedPaymentMethod || editingProduct.selectedPaymentMethod,
          paymentMethods: updatedItem.selectedPaymentMethod || editingProduct.selectedPaymentMethod,

          // ✅ MAPEAR VARIANTE AL NIVEL SUPERIOR
          id_variant: updatedItem.selectedOption?.id_variant || editingProduct.id_variant,
          variant_name: updatedItem.selectedOption?.size || editingProduct.variant_name,

          // ✅ MAPEAR SABOR AL NIVEL SUPERIOR
          flavor: updatedItem.selectedFlavor || editingProduct.flavor,

          // ✅ MAPEAR EXTRAS Y SALSAS AL NIVEL SUPERIOR
          extras: updatedItem.selectedExtras || updatedItem.extras || [],
          sauces: updatedItem.selectedSauces || updatedItem.sauces || [],

          // ✅ Eliminar totalPrice para que se recalcule
          totalPrice: null, // Esto fuerza el recálculo en cada render

          // ✅ PRESERVAR CAMPOS ORIGINALES QUE NO SE ACTUALICEN
          ...editingProduct,

          // ✅ SOBRESCRIBIR CON NUEVOS DATOS
          ...updatedItem,

          // ✅ ASEGURAR QUE EL ID Y LOS MAPEOS CRÍTICOS NO SE SOBRESCRIBAN
          id: editingProduct.id,
          extras: updatedItem.selectedExtras || updatedItem.extras || [],
          sauces: updatedItem.selectedSauces || updatedItem.sauces || [],
          flavor: updatedItem.selectedFlavor || editingProduct.flavor,
          selectedFlavor: updatedItem.selectedFlavor,
          selectedPaymentMethod: updatedItem.selectedPaymentMethod,
          clientName: updatedItem.clientName || editingProduct.clientName || '',
          comment: updatedItem.comment || editingProduct.comment || ''
        };

        console.log('✅ Updated cart item FINAL:', {
          id: updatedCartItem.id,
          product_name: updatedCartItem.product_name,
          clientName: updatedCartItem.clientName,
          comment: updatedItem.comment,
          selectedPaymentMethod: updatedCartItem.selectedPaymentMethod,
          selectedFlavor: updatedItem.selectedFlavor,
          sauces: updatedItem.selectedSauces,
          extras: updatedItem.selectedExtras,
          totalPrice: updatedCartItem.totalPrice,
          quantity: updatedCartItem.quantity,
          comment: updatedCartItem.comment
        });

        return updatedCartItem;
      }
      return item;
    }));

    setEditingProduct(null);
    console.log('✅ Product successfully updated in cart with preserved ID:', editingProduct.id);
  }, [editingProduct, calculateProductPrice]);

  const cancelEditProduct = useCallback(() => {
    setEditingProduct(null);
    console.log('Product edit cancelled');
  }, []);

  // ✅ FUNCIÓN PARA TRANSFORMAR DATOS DE ORDEN DESDE EL BACKEND
  const transformOrderData = useCallback((orderData = null) => {
    // Si no se proporciona orderData, transformar desde el carrito
    if (!orderData) {
      return {
        items: cart.map(item => {
          const orderItem = {
            id_product: item.product?.id_product || item.id_product,
            quantity: item.quantity || 1,
            unit_price: item.selectedOption?.price || item.product?.price || item.price || 0,
            comment: item.comment || null,
            client_name: item.clientName || null
          };

          // Agregar opción seleccionada
          if (item.selectedOption) {
            orderItem.id_variant = item.selectedOption.id_variant;
          }

          // Agregar método de pago seleccionado
          if (item.selectedPaymentMethod) {
            orderItem.id_payment_method = item.selectedFlavor.id_payment_method;
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

    // ✅ TRANSFORMAR DATOS DE ORDEN DESDE EL BACKEND CON MAPEO CORRECTO - INCLUYE CLIENTE
    return {
      id_order: orderData.id_order,
      client_name: orderData.client_name || '',

      // ✅ MAPEO CORRECTO: bill → total_amount
      total_amount: Number(orderData.bill || orderData.total_amount || 0),

      // ✅ MAPEO CORRECTO: order_date → created_at
      created_at: orderData.order_date,
      updated_at: orderData.updated_at,

      // ✅ MAPEO CORRECTO
      payment_method: {
        id_payment_method: orderData.id_payment_method,
        name: orderData.id_payment_method || 'Desconocido'
      },

      items: (orderData.items || []).map((item, index) => ({
        id_order_detail: item.id_order_detail || `temp-${index}`,
        id_product: item.id_product,
        id_variant: item.id_variant,
        comment: item.comment || '',
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.product_price || item.unit_price || 0),
        total_price: Number(item.product_price || item.total_price || 0),

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

  // ✅ GUARDAR ORDEN - MODIFICADO PARA ACEPTAR PARÁMETROS
  const saveOrder = useCallback(async (clientNameParam = null, paymentMethodParam = null) => {
    if (cart.length === 0) {
      setMessage({ text: 'El carrito está vacío', type: 'error' });
      return;
    }

    console.log('💾 saveOrder called with params:', {
      clientNameParam,
      paymentMethodParam,
      cartLength: cart.length
    });

    // ✅ PRIORIZAR PARÁMETROS, LUEGO OBTENER DEL PRIMER ARTÍCULO DEL CARRITO
    let idPaymentMethod = paymentMethodParam;
    let clientName = clientNameParam;

    // Si no se proporcionan parámetros, usar el comportamiento anterior
    if (!idPaymentMethod || !clientName) {
      const firstItem = cart[0];
      idPaymentMethod = idPaymentMethod || firstItem?.selectedPaymentMethod;
      clientName = clientName || firstItem?.clientName || '';
    }

    console.log('💾 Final values for order:', {
      idPaymentMethod,
      clientName,
      source: paymentMethodParam ? 'modal' : 'cart'
    });

    // 🛡️ VALIDACIÓN: Verificar que el método de pago exista ANTES de enviar.
    if (!idPaymentMethod) {
      await Swal.fire({
        title: 'Falta método de pago',
        text: 'Parece que la orden no tiene un método de pago. Por favor, selecciona uno al agregar o editar un producto.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    setLoading(true);
    try {
      // ✅ CONSTRUIR EL CUERPO DE LA PETICIÓN CON CLIENTE
      const orderData = {
        id_payment_method: Number(idPaymentMethod),
        client_name: (clientName || '').trim() || "Cliente POS",
        items: cart.map(item => {
          const mappedItem = {
            id_product: item.id_product,
            id_variant: item.id_variant,
            comment: item.comment,
            sauces: (item.selectedSauces || []).map(s => ({ id_sauce: s.id_sauce })),
            extras: (item.selectedExtras || []).map(e => ({ id_extra: e.id_extra, quantity: e.quantity || 1 })),
          };

          // Añadir sabor solo si está seleccionado y tiene un ID
          if (item.selectedFlavor && item.selectedFlavor.id_flavor) {
            mappedItem.flavor = item.selectedFlavor.id_flavor;
          }

          return mappedItem;
        })
      };

      console.log('📤 Order data to send:', JSON.stringify(orderData, null, 2));

      const response = await createOrder(orderData);

      console.log('✅ Order saved successfully:', response);

      setCart([]);
      setEditingProduct(null);

      await Swal.fire({
        title: '¡Pedido guardado!',
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
  }, [cart, setLoading, setMessage]);

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
  }, [setLoading, setMessage, transformOrderData, setOrders]);

  // ✅ Valor del contexto OPTIMIZADO - INCLUYE CLIENTE
  const contextValue = useMemo(() => ({
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
    transformOrderData
  }), [
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

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}