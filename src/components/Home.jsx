import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import ProductGrid from './grid/ProductGrid';
import ProductModal from './grid/ProductModal';
import Cart from './cart/Cart';
import CartBadge from './cart/CartBadge';

function Home({ selectedCategory }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { cart } = useCart();
  const [showAddedNotification, setShowAddedNotification] = useState(false);

  // Responsivo: detecta móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // FUNCIONES CORREGIDAS
  const handleProductClick = (product) => {
    console.log('Product clicked:', product); // Debug
    setSelectedProduct(product);
  };

  const handleClosePanel = () => {
    console.log('Closing modal'); // Debug
    setSelectedProduct(null);
  };

  const handleAddedToCart = () => {
    console.log('Product added to cart'); // Debug
    if (isMobile) {
      setShowAddedNotification(true);
      setTimeout(() => setShowAddedNotification(false), 2000);
    }
  };

  // Debug: Log cuando cambia selectedProduct
  useEffect(() => {
    console.log('Selected product changed:', selectedProduct);
  }, [selectedProduct]);

  if (isMobile) {
    // Layout móvil - productos full width + carrito modal
    return (
      <>
        <div className="w-full min-h-screen bg-gray-50 relative">
          {/* Área de productos - full width */}
          <div className="pb-20">
            <ProductGrid
              selectedCategory={selectedCategory}
              onProductClick={handleProductClick}
              isMobile={isMobile}
            />
          </div>

          {/* Notificación de producto agregado */}
          {showAddedNotification && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce z-50">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              ¡Producto agregado!
            </div>
          )}

          {/* Cart Drawer para móvil */}
          {cartDrawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setCartDrawerOpen(false)}></div>
              <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h2 className="text-lg font-medium">Carrito</h2>
                    <button
                      onClick={() => setCartDrawerOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <Cart isMobile={true} onCloseCart={() => setCartDrawerOpen(false)} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de opciones - ACTUALIZADO */}
        {selectedProduct && (
          <ProductModal
            isOpen={!!selectedProduct}
            onClose={handleClosePanel}
            product={selectedProduct}
            onAddedToCart={handleAddedToCart}
            initialQuantity={1}
            initialOptions={[]}
            initialFlavors={[]}
            initialExtras={[]}
            initialSauces={[]}
            initialComment=""
            isEditing={false}
          />
        )}
      </>
    );
  }

  // Layout desktop - columnas lado a lado con carrito responsivo
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Área de productos - lado izquierdo */}
      <div className="flex-1 min-w-0">
        <div className="h-full overflow-y-auto">
          <ProductGrid
            selectedCategory={selectedCategory}
            onProductClick={handleProductClick}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Área del carrito - lado derecho, ancho responsivo */}
      <div className="w-[min(420px,40vw)] min-w-[320px] max-w-[480px] bg-white border-l border-gray-300 flex flex-col shadow-lg">
        {/* Header del carrito desktop responsivo */}
        <div className="bg-red-600 text-white p-3 lg:p-4 text-center shadow-md">
          <div className="flex items-center justify-center gap-2 lg:gap-3 relative">
            <ShoppingCartIcon className="w-5 h-5 lg:w-6 lg:h-6" />
            <h2 className="text-lg lg:text-xl font-bold uppercase tracking-wide">Carrito</h2>
            <div className="relative">
              <CartBadge count={cart.length} variant="yellow" size="sm" className="relative top-0 right-0" />
            </div>
          </div>
          <div className="text-xs lg:text-sm opacity-90 mt-1">Tu selección actual</div>
        </div>

        {/* Contenido del carrito desktop */}
        <div className="flex-1 overflow-y-auto relative">
          <Cart isMobile={false} onCloseCart={() => {}} />
        </div>
      </div>

      {/* Modal de opciones - ACTUALIZADO */}
      {selectedProduct && (
        <ProductModal
          isOpen={!!selectedProduct}
          onClose={handleClosePanel}
          product={selectedProduct}
          onAddedToCart={handleAddedToCart}
          initialQuantity={1}
          initialOptions={[]}
          initialFlavors={[]}
          initialExtras={[]}
          initialSauces={[]}
          initialComment=""
          isEditing={false}
          showPaymentMethod={true}
        />
      )}
    </div>
  );
}

export default Home;