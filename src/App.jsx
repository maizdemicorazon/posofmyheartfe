import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import Layout from './Layouts/Layout';
import Home from './components/Home';
import Cart from './components/cart/Cart';
import ProductOptionsModal from './components/grid/ProductOptionsModal';
import Orders from './components/orders/Orders';

function AppContent() {
  const { editingProduct, saveEditProduct, cancelEditProduct } = useCart();

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
        {/* Modal para editar producto */}
        {editingProduct && (
          <ProductOptionsModal
            isOpen={true}
            onClose={cancelEditProduct}
            product={editingProduct}
            extras={editingProduct.extras || []}
            sauces={editingProduct.sauces || []}
            initialQuantity={editingProduct.quantity}
            initialOptions={editingProduct.options}
            initialExtras={editingProduct.extras}
            initialSauces={editingProduct.sauces}
            initialComment={editingProduct.comment}
            onSave={saveEditProduct}
            isEditing={true}
          />
        )}
      </Layout>
    </Router>
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
