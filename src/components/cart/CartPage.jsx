import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { ArrowLeftIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Cart from '../cart/Cart';
import BusinessHeader from '../menu/BusinessHeader';
import CartBadge from '../cart/CartBadge';

function CartPage({ onBack }) {
  const { theme } = useTheme();
  const { cart } = useCart();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* ✅ Header del Carrito Mejorado */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Título y navegación */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Volver a productos"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCartIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div className="absolute -top-1 -right-1">
                    <CartBadge count={cart.length} variant="green" size="sm" />
                  </div>
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Mi Carrito
                  </h1>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {cart.length === 0
                      ? 'Tu carrito está vacío'
                      : `${cart.length} producto${cart.length !== 1 ? 's' : ''} seleccionado${cart.length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="hidden sm:flex items-center gap-4">
              {cart.length > 0 && (
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Productos en carrito
                  </div>
                  <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Contenido Principal Mejorado */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <button
                onClick={onBack}
                className={`inline-flex items-center text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Productos
              </button>
            </li>
            <li>
              <div className="flex items-center">
                <svg className={`w-3 h-3 mx-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                     aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className={`ml-1 text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                } md:ml-2`}>
                  Carrito
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Estado vacío mejorado */}
        {cart.length === 0 ? (
          <div className={`rounded-xl shadow-sm border p-12 text-center ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="mb-6">
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <ShoppingCartIcon className={`w-12 h-12 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
            </div>

            <h2 className={`text-2xl font-bold mb-3 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Tu carrito está vacío
            </h2>

            <p className={`text-lg mb-6 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              ¡Agrega algunos deliciosos productos para comenzar!
            </p>

            <button
              onClick={onBack}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500'
              } shadow-lg hover:shadow-xl`}
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Ver Productos
            </button>

            {/* Características destacadas */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className="text-2xl mb-2">🌽</div>
                <h3 className={`font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Productos Frescos
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Ingredientes de la mejor calidad
                </p>
              </div>

              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className="text-2xl mb-2">⚡</div>
                <h3 className={`font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Servicio Rápido
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Preparamos tu orden al momento
                </p>
              </div>

              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className="text-2xl mb-2">🧼</div>
                <h3 className={`font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Máxima Higiene
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Preparación segura y limpia
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Carrito con productos */
          <div className={`rounded-xl shadow-sm border overflow-hidden ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <Cart
              onCloseCart={onBack}
              isMobile={false}
              showBackButton={false}
            />
          </div>
        )}

        {/* ✅ Información adicional en la parte inferior */}
        {cart.length === 0 && (
          <div className="mt-8 text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
              theme === 'dark'
                ? 'bg-gray-800 text-gray-400 border border-gray-700'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Listos para preparar tu orden
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartPage;