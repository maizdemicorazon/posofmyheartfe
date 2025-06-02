import { useState } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import Layout from './Layouts/Layout';
import Home from './components/Home';
import Cart from './components/cart/Cart';
import ProductOptionsModal from './components/grid/ProductOptionsModal';
import Orders from './components/orders/Orders';

function AppContent() {
  const { editingProduct, saveEditProduct, cancelEditProduct } = useCart();
  const [view, setView] = useState('home');

  return (
    <Layout view={view} setView={setView}>
      {view === 'home' && <Home />}
      {view === 'cart' && <Cart onCloseCart={() => setView('home')} />}
      {view === 'orders' && <Orders />}
      {/* Modal para editar producto */}
      {editingProduct && (
        <ProductOptionsModal
          isOpen={true}
          onClose={cancelEditProduct}
          product={editingProduct}
          initialQuantity={editingProduct.quantity}
          initialOptions={editingProduct.options}
          initialFlavors={editingProduct.flavors}
          initialExtras={editingProduct.extras}
          initialSauces={editingProduct.sauces}
          initialComment={editingProduct.comment}
          onSave={saveEditProduct}
          isEditing={true}
        />
      )}
    </Layout>
  );
}

// Aquí solo pones el provider
function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;
