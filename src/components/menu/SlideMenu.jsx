import { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import CartBadge from '../cart/CartBadge';
import {
  MoonIcon,
  SunIcon,
  RocketLaunchIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

function SlideMenu({ isOpen, onClose, view, setView }) {
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.slide-menu') && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-300 ${
        isOpen ? 'bg-black/40' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`slide-menu fixed top-0 left-0 h-full w-64 shadow-lg transform transition-transform duration-300
            ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Maíz de mi corazón</h2>
          <button onClick={onClose} className="text-xl font-bold">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <ol>
            <li className="w-full flex justify-end mb-2">
              <button
                onClick={() => {
                  toggleTheme();
                  onClose();
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
              </button>
            </li>

            <li className="w-full flex flex-row flex-nowrap items-center mb-2">
              <button
                onClick={() => {
                  setView('home');
                  onClose();
                }}
                className="w-full px-4 py-2 border rounded flex justify-start items-center flex-row hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <RocketLaunchIcon className="w-5 h-5" />
                <span className='ml-2'>Productos</span>
              </button>
            </li>

            <li className="w-full flex flex-row flex-nowrap items-center mb-2">
              <button
                onClick={() => {
                  setView('orders');
                  onClose();
                }}
                className="w-full px-4 py-2 border rounded flex justify-start items-center flex-row hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ShoppingBagIcon className="w-5 h-5" />
                <span className='ml-2'>Mis Pedidos</span>
              </button>
            </li>

            <li className="w-full flex flex-row flex-nowrap items-center mb-2">
              <button
                onClick={() => {
                  setView('cart');
                  onClose();
                }}
                className="w-full px-4 py-2 border rounded flex justify-start items-center flex-row hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span className='ml-2'>Carrito</span>
                <div className="ml-auto relative">
                  <CartBadge count={cart.length} variant="green" size="sm" className="relative top-0 right-0" />
                </div>
              </button>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default SlideMenu;