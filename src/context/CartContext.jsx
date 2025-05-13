import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [orders, setOrders] = useState(() => {
    const saved = sessionStorage.getItem('orders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const addToCart = (productData) => {
    setCart((prev) => [...prev, productData]);
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

  const saveOrder = () => {
    if (cart.length === 0) return;
    const date = new Date();
    const order = {
      id: Date.now(),
      date: date.toISOString(),
      items: cart,
    };
    const updatedOrders = [order, ...orders];
    setOrders(updatedOrders);
    sessionStorage.setItem('orders', JSON.stringify(updatedOrders));
    setCart([]); // Vacía el carrito después de guardar
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
      saveOrder
    }}>
      {children}
    </CartContext.Provider>
  );
}