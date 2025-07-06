import React, { useState, Suspense } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import { MessageProvider } from './context/MessageContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './Layouts/Layout';
import Home from './components/Home';
import ProductModal from './components/modals/ProductModal';
import Orders from './components/orders/Orders';
import DailyEarnings from './components/metrics/DailyEarnings';
import EarningsChart from './components/metrics/EarningsChart';
import SalesReport from './components/reports/SalesReport';
import ConnectivityIndicator from './components/common/ConnectivityIndicator';
import ConfigDebug from './components/debug/ConfigDebug';
import ConfigChecker from './components/debug/ConfigChecker';
import ErrorBoundary, { POSErrorFallback } from './components/errors/ErrorBoundary';
import { DEBUG_CONFIG, API_CONFIG } from './config/config.server';

// ✅ CONTENIDO PRINCIPAL DE LA APLICACIÓN
function AppContent() {
  const { editingProduct, saveEditProduct, cancelEditProduct } = useCart();
  const [view, setView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showConfigDebug, setShowConfigDebug] = useState(false);

  // ✅ LOG DE DEBUG
  console.log('🎯 AppContent rendering:', {
    view,
    selectedCategory,
    hasEditingProduct: !!editingProduct
  });

  return (
    <>
      <Layout
        view={view}
        setView={setView}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      >
        {/* ✅ Renderizar solo según la vista actual con Suspense individual */}
        <ErrorBoundary>
            {view === 'home' && <Home selectedCategory={selectedCategory} />}
            {view === 'orders' && <Orders onBack={() => setView('home')} />}
            {view === 'metrics' && <DailyEarnings onBack={() => setView('home')} />}
            {view === 'earnings-chart' && <EarningsChart onBack={() => setView('home')} />}
            {view === 'sales-report' && <SalesReport onBack={() => setView('home')} />}
        </ErrorBoundary>

        {/* ✅ Modal de edición de producto */}
        {editingProduct && (
          <ErrorBoundary>
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
          </ErrorBoundary>
        )}
      </Layout>

      {/* ✅ INDICADOR DE CONECTIVIDAD - Tu componente visual favorito mejorado */}
      <ConnectivityIndicator
        placement="bottom-left"
        compact={false}
        autoHide={false}
        showResponseTime={true}
      />

      {/* ✅ COMPONENTE DE DEBUG DE CONFIGURACIÓN (solo en desarrollo) */}
      {DEBUG_CONFIG.ENABLED && (
        <ConfigDebug
          isVisible={showConfigDebug}
          onToggle={() => setShowConfigDebug(!showConfigDebug)}
        />
      )}
    </>
  );
}

// ✅ COMPONENTE PRINCIPAL DE LA APLICACIÓN
function App() {
  console.log('🚀 App component mounting...');

  return (
    <div className="App">
      <ThemeProvider>
        <LoadingProvider>
          <MessageProvider>
            {/* ✅ ErrorBoundary para CartProvider y todo su contenido */}
            <ErrorBoundary fallback={POSErrorFallback} showDetails={DEBUG_CONFIG.ENABLED}>
              <CartProvider>
                <NotificationProvider>
                  <ConfigChecker>
                      <AppContent />
                  </ConfigChecker>
                </NotificationProvider>
              </CartProvider>
            </ErrorBoundary>
          </MessageProvider>
        </LoadingProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;