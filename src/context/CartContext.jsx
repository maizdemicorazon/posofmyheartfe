import { createContext, useContext, useState, useEffect } from 'react';
import { useMessage } from './MessageContext';
import { useLoading } from './LoadingContext';
import Swal from 'sweetalert2';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = sessionStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [orders, setOrders] = useState(() => {
    const saved = sessionStorage.getItem('orders');
    return saved ? JSON.parse(saved) : [];
  });
  const { loading, setLoading } = useLoading();
  const { message, setMessage } = useMessage();

  useEffect(() => {
    sessionStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (productData) => {
    try {
      setLoading(true);
      setCart((prev) => [...prev, productData]);
      setLoading(false);
      setMessage({ text: 'Producto agregado al carrito', type: 'success' });
      console.log('Producto agregado al carrito:', productData);
    } catch (error) {
      setLoading(false);
      setMessage({ text: 'Error al agregar producto al carrito', type: 'error' });
      console.error('Error al agregar producto al carrito:', error);
    }
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const startEditProduct = (index) => {
    setEditingProduct({ ...cart[index], index });
  };

  const saveEditProduct = (productData) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === editingProduct.index ? productData : item
      )
    );
    setEditingProduct(null);
  };

  const cancelEditProduct = () => setEditingProduct(null);

  const itemsDto = (cart) => {
    return cart.map((item) => {
      
      const options = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
      const flavors = Array.isArray(item.flavors) ? item.flavors.filter(Boolean) : [];

      return {
        idProduct: item.idProduct,
        quantity: item.quantity || 1,
        idVariant: options.length > 0 ? options[0].idVariant : 0,
        idFlavor: flavors.length > 0 ? flavors[0].idFlavor : 0,
        extras: item.extras ? item.extras.map(extra => ({
          idExtra: extra.idExtra,
          quantity: extra.quantity || 1,
        })) : [],
        sauces: item.sauces ? item.sauces.map(sauce => ({
          idSauce: sauce.idSauce,
        })) : [],
      };
    });
  };

  const saveOrderApi = async (order) => {
    let urlBase = "https://posofmyheart-develop.up.railway.app/"
    let endponitApiOrders = "api/orders";
    let urlPostApiOrders = urlBase + endponitApiOrders;
    
    return await fetch(urlPostApiOrders, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    })
    .then(response => {
      if (response.errorCode) {
        throw new Error(response.message);
      }
      if (response.code) {
        throw new Error(response.message);
      }
      
      return response.json();
    })
    .catch(error => {
      console.error('Error al guardar la orden:', error);
      throw new Error(error);
    })
  };

  const saveOrder = async (onCloseCart) => {
    setLoading(true);
    if (cart.length === 0) return;

    const result = await Swal.fire({
        title: "¿A nombre de quien quieres la orden?",
        input: "text",
        inputPlaceholder: "Ingresa el nombre del cliente",
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
              return '¡Debes agregar el nombre del cliente!';
          }
        }
    });

    if (result.isConfirmed) {
      try {
        const order = {
          idPaymentMethod: 1,
          clientName: result.value,
          comment: "Pedido realizado desde el carrito",
          items: itemsDto(cart),
        };

        const response = await saveOrderApi(order);
        if (response.idOrder) {
          const updatedOrders = [order, ...orders];

          sessionStorage.setItem('orders', JSON.stringify(updatedOrders));
          setOrders(updatedOrders);
          setCart([]);
          setMessage({ text: 'Orden guardada con exito', type: 'success' });
          setLoading(false);
          setTimeout(() => {
            if (onCloseCart) onCloseCart()
          }, 1000);
        } else {
          console.error('Error al guardar la orden: No se recibió un ID de orden válido.');
          setMessage({ text: 'Error al guardar la orden: No se recibió un ID de orden válido.', type: 'error' });
          setLoading(false);
          return;
        }
      }catch (error) {
        console.error('Error al guardar la orden:', error);
        setMessage({ text: 'Error al guardar la orden.', type: 'error' });
        setLoading(false);
        return;
      }
    } else if (result.isDismissed) {
      setLoading(false);
      return;
    }
  };

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
      loading,
      message
    }}>
      {children}
    </CartContext.Provider>
  );
}