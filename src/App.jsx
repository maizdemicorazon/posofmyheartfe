import { useState } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import { MessageProvider } from './context/MessageContext';
import Layout from './Layouts/Layout';
import Home from './components/Home';
import ProductModal from './components/modals/ProductModal';
import Orders from './components/orders/Orders';
import DailyEarnings from './components/metrics/DailyEarnings';
import EarningsChart from './components/metrics/EarningsChart';
import SalesReport from './components/reports/SalesReport';

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
      {view === 'orders' && <Orders onBack={() => setView('home')} />}
      {view === 'metrics' && <DailyEarnings onBack={() => setView('home')} />}
      {view === 'earnings-chart' && <EarningsChart onBack={() => setView('home')} />}
      {view === 'sales-report' && <SalesReport onBack={() => setView('home')} />}

      {/* ✅ Modal de edición de producto */}
      {editingProduct && (
        <ProductModal
          isOpen={true}
          onClose={cancelEditProduct}
          product={editingProduct.product || editingProduct}
          initialQuantity={editingProduct.quantity || 1}
          initialOptions={editingProduct.options || (editingProduct.selectedOption ? [editingProduct.selectedOption] : [])}
          initialFlavors={editingProduct.flavors || (editingProduct.selectedFlavor ? [editingProduct.selectedFlavor] : [])}
          initialExtras={editingProduct.extras || editingProduct.selectedExtras || []}
          initialSauces={editingProduct.sauces || editingProduct.selectedSauces || []}
          initialPaymentMethod={editingProduct.payment_methods || editingProduct.selectedPaymentMethod || []}
          initialComment={editingProduct.comment || ''}
          initialClientName={editingProduct.clientName || ''}
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