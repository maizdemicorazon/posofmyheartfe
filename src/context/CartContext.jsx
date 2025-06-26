// src/context/CartContext.jsx

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

// ... (calculateProductPrice y otras funciones se mantienen igual)
// ✅ FUNCIÓN PARA CALCULAR PRECIO DE PRODUCTO - VERSIÓN FINAL MEJORADA
  const calculateProductPrice = useCallback((product) => {
    console.log('💰 Calculating price for product:', {
      productId: product.id,
      productName: product.product_name || product.name,
      hasSelectedPaymentMethod: !!product.selectedPaymentMethod,
      hasSelectedOption: !!product.selectedOption,
      hasOptions: !!product.options,
      hasSelectedExtras: !!product.selectedExtras,
      hasExtras: !!product.extras,
      hasSelectedSauces: !!product.selectedSauces,
      hasSauces: !!product.sauces,
      quantity: product.quantity
    });

    // ✅ PRECIO BASE - Buscar en múltiples ubicaciones con prioridad correcta
    let basePrice = 0;

    if (product.selectedOption?.price) {
      basePrice = Number(product.selectedOption.price);
      console.log('💰 Using selectedOption price:', basePrice);
    } else if (product.options?.[0]?.price) {
      basePrice = Number(product.options[0].price);
      console.log('💰 Using first option price:', basePrice);
    } else if (product.product?.price) {
      basePrice = Number(product.product.price);
      console.log('💰 Using nested product price:', basePrice);
    } else if (product.price) {
      basePrice = Number(product.price);
      console.log('💰 Using direct price:', basePrice);
    } else {
      console.warn('⚠️ No base price found, using 0');
    }

    // ✅ PRECIO DE EXTRAS - Buscar en selectedExtras primero, luego extras
    let extrasPrice = 0;
    const extrasToUse = product.selectedExtras || product.extras || [];

    if (Array.isArray(extrasToUse) && extrasToUse.length > 0) {
      extrasPrice = extrasToUse.reduce((sum, extra) => {
        const extraPrice = Number(extra?.price || extra?.actual_price || 0);
        const extraQuantity = Number(extra?.quantity || 1);
        const extraTotal = extraPrice * extraQuantity;
        console.log(`💰 Extra "${extra.name}": ${extraPrice} x ${extraQuantity} = ${extraTotal}`);
        return sum + extraTotal;
      }, 0);
      console.log('💰 Total extras price:', extrasPrice);
    }

    // ✅ PRECIO DE SALSAS - Buscar en selectedSauces primero, luego sauces
    let saucesPrice = 0;
    const saucesToUse = product.selectedSauces || product.sauces || [];

    if (Array.isArray(saucesToUse) && saucesToUse.length > 0) {
      saucesPrice = saucesToUse.reduce((sum, sauce) => {
        const saucePrice = Number(sauce?.price || sauce?.actual_price || 0);
        console.log(`💰 Sauce "${sauce.name}": ${saucePrice}`);
        return sum + saucePrice;
      }, 0);
      console.log('💰 Total sauces price:', saucesPrice);
    }

    // ✅ PRECIO DE SABORES - Buscar en selectedFlavor primero, luego flavor/flavors
    let flavorsPrice = 0;

    if (product.selectedFlavor?.price) {
      flavorsPrice = Number(product.selectedFlavor.price);
      console.log(`💰 Selected flavor "${product.selectedFlavor.name}": ${flavorsPrice}`);
    } else if (product.flavor?.price) {
      flavorsPrice = Number(product.flavor.price);
      console.log(`💰 Flavor "${product.flavor.name}": ${flavorsPrice}`);
    } else if (Array.isArray(product.flavors)) {
      flavorsPrice = product.flavors.reduce((sum, flavor) => {
        const flavorPrice = Number(flavor?.price || 0);
        console.log(`💰 Flavor "${flavor.name}": ${flavorPrice}`);
        return sum + flavorPrice;
      }, 0);
    }

    // ✅ CANTIDAD
    const quantity = Number(product.quantity || 1);

    // ✅ CÁLCULO FINAL
    const unitPrice = basePrice + extrasPrice + saucesPrice + flavorsPrice;
    const totalItemPrice = unitPrice * quantity;

    console.log('💰 FINAL PRICE CALCULATION:', {
      basePrice,
      extrasPrice,
      saucesPrice,
      flavorsPrice,
      unitPrice,
      quantity,
      totalItemPrice,
      productId: product.id
    });

    return totalItemPrice;
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

// ✅ FUNCIÓN PARA AGREGAR AL CARRITO - CORREGIDA CON MAPEO DE ESTRUCTURA
// ✅ FUNCIÓN PARA AGREGAR AL CARRITO - CORREGIDA CON MAPEO DE ESTRUCTURA
  const addToCart = useCallback((item) => {
    console.log('🔄 Adding to cart - Input item:', item);

    // ✅ GENERAR ID ÚNICO MÁS ROBUSTO PARA EVITAR DUPLICADOS
    const uniqueId = `cart-${Date.now()}-${Math.floor(Math.random() * 10000)}-${Math.random().toString(36).substr(2, 9)}`;

    // ✅ MAPEAR ESTRUCTURA PARA COMPATIBILIDAD CON Cart.jsx
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
      comment: item.comment || '',

      // ✅ MAPEAR VARIANTE AL NIVEL SUPERIOR (para compatibilidad)
      id_variant: item.selectedOption?.id_variant || item.id_variant,
      variant_name: item.selectedOption?.size || item.variant_name,

      // ✅ MAPEAR SABOR AL NIVEL SUPERIOR (para compatibilidad)
      flavor: item.selectedFlavor || item.flavor,

      // ✅ MAPEAR EXTRAS Y SALSAS AL NIVEL SUPERIOR (para compatibilidad)
      extras: item.selectedExtras || item.extras || [],
      sauces: item.selectedSauces || item.sauces || [],

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

    // ✅ FUNCIÓN PARA GUARDAR EDICIÓN DE PRODUCTO
    const saveEditProduct = useCallback((updatedItem) => {
      if (!editingProduct) {
        console.error('❌ No editingProduct found in saveEditProduct');
        return;
      }

      console.log('🔄 Guardando producto editado. Datos del modal:', {
        editingProductId: editingProduct.id,
        updatedPaymentMethod: updatedItem.selectedPaymentMethod,
        originalPaymentMethod: editingProduct.selectedPaymentMethod
      });


     setCart(prevCart => prevCart.map(item => {
         // Comparar por el ID único del item en el carrito
         if (item.id === editingProduct.id) {
           console.log('🎯 Encontrado item a actualizar:', editingProduct.id);

           // ✅ CONSTRUIR EL ITEM ACTUALIZADO DE FORMA EXPLÍCITA
           const updatedCartItem = {
             ...item, // Empezamos con los datos originales del item del carrito
             ...updatedItem, // Sobrescribimos con los datos del modal

             // Re-calculamos el precio total
             totalPrice: calculateProductPrice({ ...item, ...updatedItem }),

             // Aseguramos que el ID único se mantenga
             id: editingProduct.id,
           };

           console.log('✅ Item final actualizado:', updatedCartItem);
           return updatedCartItem;
         }
         return item;
       }));

       // Limpiar el estado de edición
       setEditingProduct(null);
     }, [editingProduct, calculateProductPrice, setCart]);


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

  // ✅ CARGAR TODAS LAS ÓRDENES
  const loadAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📡 Cargando órdenes desde CartContext...');

      const ordersData = await getOrders();
      console.log('📋 Raw orders data:', ordersData);

      const transformedOrders = ordersData.map(order => transformOrderData(order));

      console.log('✅ Transformed orders:', transformedOrders);
      setOrders(transformedOrders);
      setMessage(null);
      return transformedOrders;

    } catch (error) {
      console.error('❌ Error al cargar órdenes:', error);
      let errorMessage = 'Error al cargar las órdenes';
      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado al cargar órdenes';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor para cargar órdenes';
      }
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

  // ✅ GUARDAR ORDEN - MIGRADO A NUEVAS UTILIDADES
    const saveOrder = useCallback(async () => {
    if (cart.length === 0) {
      setMessage({ text: 'El carrito está vacío', type: 'error' });
      return;
    }

    // Usar el método de pago del primer artículo como el método para toda la orden.
    const paymentMethodId = cart[0]?.selectedPaymentMethod;

    // 🛡️ VALIDACIÓN: Verificar que el método de pago exista ANTES de enviar.
    if (!paymentMethodId) {
      await Swal.fire({
        title: 'Falta un dato',
        text: 'Parece que la orden no tiene un método de pago. Por favor, selecciona uno al agregar o editar un producto.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b'
      });
      return; // Detener la ejecución si no hay método de pago
    }

    setLoading(true);
    try {
      // Construir el cuerpo de la petición exactamente como lo espera la API
      const orderData = {
        id_payment_method: Number(paymentMethodId),
        client_name: "Cliente POS",
        comment: cart.map(item => item.comment).filter(c => c).join('; '),
        items: cart.map(item => {
          const mappedItem = {
            id_product: item.id_product,
            id_variant: item.id_variant,
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
      await loadAllOrders();

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
  }, [cart, setLoading, setMessage, loadAllOrders, transformOrderData]);


  // ✅ CARGAR ORDEN PARA EDICIÓN
  const loadOrderForEdit = useCallback(async (orderId) => {
    setLoading(true);
    try {
      const orderData = await getOrderById(orderId);
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

  // ✅ ACTUALIZAR ORDEN 
  const updateOrderContext = useCallback(async (orderId, updateData) => {
    setLoading(true);
    try {
      console.log('📤 Enviando datos de actualización a la API:', { orderId, payload: updateData });
      
      // La data ya viene perfectamente formateada desde el componente (Orders.jsx).
      // El contexto solo se encarga de enviarla.
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

// ... (resto del código del contexto)

  // ✅ Valor del contexto OPTIMIZADO
  const contextValue = useMemo(() => ({
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
    setProducts,
    setExtras,
    setSauces,
    setOrders,
    loadOrderForEdit,
    updateOrder: updateOrderContext,
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