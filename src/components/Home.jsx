import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import ProductGrid from './grid/ProductGrid';
import ProductModal from './grid/ProductModal';
import Cart from './cart/Cart';
import CartBadge from './cart/CartBadge';
import { BREAKPOINTS } from '../utils/constants';

function Home({ selectedCategory }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { cart } = useCart();
  const [showAddedNotification, setShowAddedNotification] = useState(false);

  // Responsivo: detecta móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINTS.SM);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < BREAKPOINTS.SM);
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

          {/* Botón flotante del carrito */}
          <div className="fixed bottom-0 right-0 p-4 z-40">
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="w-14 h-14 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center border-2 border-white relative"
            >
              <ShoppingCartIcon className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-300 text-gray-800 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                  {cart.length > 99 ? '99+' : cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal del carrito móvil */}
        {cartDrawerOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40"
              onClick={() => setCartDrawerOpen(false)}
            />

            {/* Panel del carrito */}
            <div className="fixed inset-y-0 right-0 w-full max-w-sm sm:max-w-md bg-white shadow-xl transform transition-transform duration-300 flex flex-col z-50">
              {/* Header del carrito móvil */}
              <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCartIcon className="w-6 h-6" />
                  <h2 className="text-lg font-bold">Carrito</h2>
                  <div className="relative">
                    <CartBadge count={cart.length} variant="yellow" size="sm" className="relative top-0 right-0" />
                  </div>
                </div>
                <button
                  onClick={() => setCartDrawerOpen(false)}
                  className="p-1 hover:bg-red-700 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Contenido del carrito móvil */}
              <div className="flex-1 overflow-y-auto">
                <Cart
                  isMobile={true}
                  onCloseCart={() => setCartDrawerOpen(false)}
                />
              </div>
            </div>
          </>
        )}

        {/* Modal de opciones */}
        {selectedProduct && (
          <ProductModal
            isOpen={!!selectedProduct}
            onClose={handleClosePanel}
            product={selectedProduct}
            onAddedToCart={handleAddedToCart}
            // Props requeridas
            initialQuantity={1}
            initialOptions={[]}
            initialFlavors={[]}
            initialExtras={[]}
            initialSauces={[]}
            initialPaymentMethod={null}
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

      {/* ✅ CARRITO ÚNICO - Sin duplicados */}
      <div className="
        /* Responsivo por breakpoints */
        w-full
        sm:w-[min(350px,45vw)]
        md:w-[min(380px,42vw)]
        lg:w-[min(420px,40vw)]
        xl:w-[min(450px,38vw)]

        /* Límites de ancho */
        min-w-[280px]
        sm:min-w-[320px]
        max-w-[280px]
        sm:max-w-[350px]
        md:max-w-[420px]
        lg:max-w-[480px]

        /* Styling base */
        bg-white
        border-l-0
        sm:border-l
        border-gray-300
        flex
        flex-col
        shadow-none
        sm:shadow-lg

        /* Mobile: pantalla completa, Desktop: panel lateral */
        h-screen
        sm:h-auto
        sm:max-h-screen
      ">
        {/* Header del carrito responsivo */}
        <div className="
          bg-red-600
          text-white
          p-2
          sm:p-3
          md:p-4
          text-center
          shadow-md
          /* Mobile: header más compacto */
          sticky
          top-0
          z-10
        ">
          <div className="
            flex
            items-center
            justify-center
            gap-1
            sm:gap-2
            lg:gap-3
            relative
          ">
            <ShoppingCartIcon className="
              w-4 h-4
              sm:w-5 sm:h-5
              lg:w-6 lg:h-6
            " />
            <h2 className="
              text-base
              sm:text-lg
              lg:text-xl
              font-bold
              uppercase
              tracking-wide
              /* Ajuste de texto para pantallas pequeñas */
              leading-tight
            ">
              Carrito
            </h2>
            <div className="relative">
              <CartBadge
                count={cart.length}
                variant="yellow"
                size="sm"
                className="relative top-0 right-0"
              />
            </div>
          </div>
          <div className="
            text-xs
            sm:text-sm
            opacity-90
            mt-0.5
            sm:mt-1
            /* Ocultar en móviles muy pequeños si es necesario */
            hidden
            xs:block
          ">
            Tu selección actual
          </div>
        </div>

        {/* Contenido del carrito responsivo */}
        <div className="
          flex-1
          overflow-y-auto
          relative
          /* Padding interno adaptativo */
          bg-white
          /* Mobile: sin scroll visible, Desktop: scroll personalizado */
          scrollbar-thin
          scrollbar-thumb-gray-300
          scrollbar-track-gray-100
          /* Altura dinámica */
          max-h-[calc(100vh-80px)]
          sm:max-h-[calc(100vh-120px)]
        ">
          <Cart
            isMobile={false}
            onCloseCart={() => {}}
          />
        </div>

        {/* Footer opcional para mobile */}
        <div className="
          sm:hidden
          bg-gray-50
          border-t
          border-gray-200
          p-3
          /* Solo visible en mobile para acciones rápidas */
          flex
          justify-center
        ">
          <button
            onClick={() => {}}
            className="
              text-sm
              text-gray-600
              hover:text-gray-800
              transition-colors
            "
          >
            Cerrar Carrito
          </button>
        </div>
      </div>

      {/* ❌ CARRITO DUPLICADO ELIMINADO */}
      {/* Ya no hay segundo contenedor de carrito aquí */}

      {/* Modal de opciones - CORREGIDO */}
      {selectedProduct && (
        <ProductModal
          isOpen={!!selectedProduct}
          onClose={handleClosePanel}
          product={selectedProduct}
          onAddedToCart={handleAddedToCart}
          // Props requeridas
          initialQuantity={1}
          initialOptions={[]}
          initialFlavors={[]}
          initialExtras={[]}
          initialSauces={[]}
          initialPaymentMethod={null}
          initialComment=""
          isEditing={false}
        />
      )}
    </div>
  );
}

export default Home;