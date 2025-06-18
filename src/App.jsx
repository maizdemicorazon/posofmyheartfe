import { useState } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import { MessageProvider } from './context/MessageContext';
import Layout from './Layouts/Layout';
import Home from './components/Home';
import CartPage from './components/cart/CartPage';
import ProductOptionsModal from './components/grid/ProductOptionsModal';
import Orders from './components/orders/Orders';
import DailyEarnings from './components/metrics/DailyEarnings';
import EarningsChart from './components/metrics/EarningsChart';
import SalesReport from './components/reports/SalesReport'; // NUEVO IMPORT

function AppContent() {
  const { editingProduct, saveEditProduct, cancelEditProduct } = useCart();
  const [view, setView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <Layout
      view={view}
      setView={setView}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
    >
      {/* Renderizar solo según la vista actual */}
      {view === 'home' && <Home selectedCategory={selectedCategory} />}
      {view === 'cart' && <CartPage onBack={() => setView('home')} />}
      {view === 'orders' && <Orders onBack={() => setView('home')} />}
      {view === 'metrics' && <DailyEarnings onBack={() => setView('home')} />}
      {view === 'earnings-chart' && <EarningsChart onBack={() => setView('home')} />}
      {view === 'sales-report' && <SalesReport onBack={() => setView('home')} />} {/* NUEVA VISTA */}

      {/* Modal de edición de producto */}
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

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <LoadingProvider>
          <MessageProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </MessageProvider>
        </LoadingProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;