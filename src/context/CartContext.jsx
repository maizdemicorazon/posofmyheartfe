import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLoading } from './LoadingContext';
import { useMessage } from './MessageContext';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

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

  // Guardar orden
  const saveOrder = useCallback(async () => {
    if (cart.length === 0) {
      setMessage({ text: 'El carrito está vacío', type: 'error' });
      return;
    }

    const clientName = prompt("¿A nombre de quien quieres la orden?");

    if (!clientName) {
      setMessage({ text: 'Nombre de cliente requerido', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const order = {
        id_payment_method: 1,
        client_name: clientName,
        comment: "Pedido realizado desde el carrito",
        order_date: new Date().toISOString(),
        total: cartTotal,
        items: cart.map(item => ({
          id_product: item.id_product,
          quantity: item.quantity || 1,
          id_variant: item.options?.[0]?.id_variant || 0,
          id_flavor: item.flavors?.[0]?.id_flavor || 0,
          price: calculateProductPrice(item),
          extras: item.extras?.map(extra => ({
            id_extra: extra.id_extra,
            quantity: extra.quantity || 1,
          })) || [],
          sauces: item.sauces?.map(sauce => ({
            id_sauce: sauce.id_sauce,
          })) || [],
        }))
      };

      // Simular llamada a API
      const response = await mockApiCall(order);

      if (response.success) {
        const newOrder = { ...order, id_order: response.id_order };
        setOrders(prev => [newOrder, ...prev]);
        setCart([]);
        setMessage({ text: 'Orden guardada con éxito', type: 'success' });
      } else {
        throw new Error(response.message || 'Error al guardar la orden');
      }
    } catch (error) {
      console.error('Error al guardar la orden:', error);
      setMessage({ text: 'Error al guardar la orden', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [cart, cartTotal, calculateProductPrice, setLoading, setMessage]);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      editingProduct,
      startEditProduct,
      saveEditProduct,
      cancelEditProduct,
      orders,
      saveOrder,
      clearCart,
      cartTotal,
      calculateProductPrice,
      products,
      setProducts,
      extras,
      setExtras,
      sauces,
      setSauces
    }}>
      {children}
    </CartContext.Provider>
  );
}

// Mock API function
const mockApiCall = (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        id_order: Date.now(),
        message: 'Orden guardada exitosamente'
      });
    }, 1000);
  });
};