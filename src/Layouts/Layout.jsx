import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import SlideMenu from '../components/menu/SlideMenu';
import { Bars3Icon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import { useLoading } from '../context/LoadingContext';
import { useMessage } from '../context/MessageContext';

function Layout({ children, view, setView }) {
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cart } = useCart();
  const { loading } = useLoading();
  const { message, setMessage } = useMessage();
  
  const getAlertClasses = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border border-green-400 text-green-700';
      case 'info':
        return 'bg-blue-100 border border-blue-400 text-blue-700';
      case 'error':
      default:
        return 'bg-red-100 border border-red-400 text-red-700';
    }
  };

  return (
    <div
      className={`min-h-screen ${theme === 'dark' ? 'theme-dark' : ''}`}
      style={{
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
      }}
    >
      {/* Loader Overlay */}
      {loading && (
        <div className="overlay_loader fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-white border-solid"></div>
        </div>
      )}
      
      {/* Barra superior con botones */}
      <div className="flex justify-between items-center px-4 py-2">
        {/* Botón hamburguesa */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="text-2xl"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        {/* Botón carrito */}
        <div className="relative">
          <button
            onClick={() => setView(view === 'cart' ? 'home' : 'cart')}
            className="text-2xl"
          >
            <ShoppingBagIcon className="w-6 h-6" />
          </button>
          {cart.length > 0 && (
            <span className="absolute bottom-0 right-3 bg-red-500 text-white rounded-full px-2 text-xs">
              {cart.length}
            </span>
          )}
        </div>
      </div>

      {/* Menú lateral */}
      <SlideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        view={view}
        setView={setView}
      />

      <div className="min-h-screen">
        {message && (
          <div
            className={`${getAlertClasses(message.type)} px-4 py-3 rounded relative mb-2`}
            role="alert"
          >
            <strong className="font-bold">
              {message.type === 'success'
                ? '¡Éxito! '
                : message.type === 'info'
                ? 'Info: '
                : 'Upss! '}
            </strong>
            <span className="block sm:inline">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3 focus:outline-none"
              aria-label="Cerrar"
            >
              <svg className="fill-current h-6 w-6 text-black" role="button" viewBox="0 0 20 20">
                <title>Cerrar</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default Layout;
