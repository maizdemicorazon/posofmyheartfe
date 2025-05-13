import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SlideMenu from '../components/menu/SlideMenu';
import { Bars3Icon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';

function Layout({ children }) {
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { cart } = useCart();

  return (
    <div
      className={`min-h-screen ${theme === 'dark' ? 'theme-dark' : ''}`}
      style={{
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
      }}
    >
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
            onClick={() => navigate('/cart')}
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
      />

      <div className="min-h-screen">
        {children}
      </div>
    </div>
  );
}

export default Layout;
