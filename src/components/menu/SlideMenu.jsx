import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import CartBadge from '../cart/CartBadge';
import {
  MoonIcon,
  SunIcon,
  RocketLaunchIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  XMarkIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CogIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';

function SlideMenu({ isOpen, onClose, view, setView }) {
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

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

  // Cerrar sección admin cuando se cierra el menú
  useEffect(() => {
    if (!isOpen) {
      setIsAdminOpen(false);
    }
  }, [isOpen]);

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

        <div className="p-4 space-y-2 overflow-y-auto h-full pb-20">
          {/* Botón de tema */}
          <div className="w-full flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all duration-200 ${
                theme === 'dark'
                  ? 'border-gray-600 bg-gray-700 text-yellow-400 hover:bg-gray-600'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'light' ? (
                <>
                  <MoonIcon className="w-5 h-5" />
                  <span className="text-sm">Oscuro</span>
                </>
              ) : (
                <>
                  <SunIcon className="w-5 h-5" />
                  <span className="text-sm">Claro</span>
                </>
              )}
            </button>
          </div>

          {/* Navegación principal */}
          <div className="space-y-2">
            {/* Productos */}
            <button
              onClick={() => {
                setView('home');
                onClose();
              }}
              className="w-full px-4 py-3 border rounded-lg flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              <RocketLaunchIcon className="w-5 h-5 text-blue-500" />
              <span>Productos</span>
            </button>

            {/* Mis Pedidos */}
            <button
              onClick={() => {
                setView('orders');
                onClose();
              }}
              className="w-full px-4 py-3 border rounded-lg flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              <ShoppingBagIcon className="w-5 h-5 text-green-500" />
              <span>Mis Pedidos</span>
            </button>

            {/* Carrito */}
            <button
              onClick={() => {
                setView('cart');
                onClose();
              }}
              className="w-full px-4 py-3 border rounded-lg flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium relative"
            >
              <ShoppingCartIcon className="w-5 h-5 text-orange-500" />
              <span>Carrito</span>
              <div className="ml-auto relative">
                <CartBadge count={cart.length} variant="green" size="sm" className="relative top-0 right-0" />
              </div>
            </button>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-4"></div>

          {/* Sección Administración */}
          <div className="space-y-2">
            {/* Header de Administración - Desplegable */}
            <button
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className={`w-full px-4 py-3 border rounded-lg flex items-center gap-3 transition-all duration-200 font-medium
                ${isAdminOpen
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <CogIcon className="w-5 h-5 text-red-500" />
              <span>Administración</span>
              <div className="ml-auto">
                {isAdminOpen ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Submenú de Administración */}
            <div className={`overflow-hidden transition-all duration-300 ${
              isAdminOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="pl-4 space-y-2">
                {/* Gráfica de Ganancias */}
                <button
                  onClick={() => {
                    setView('earnings-chart');
                    onClose();
                  }}
                  className="w-full px-4 py-2 rounded-lg flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm border border-transparent hover:border-red-200 dark:hover:border-red-700"
                >
                  <PresentationChartLineIcon className="w-4 h-4 text-purple-600" />
                  <span>Gráfica de Ganancias</span>
                </button>

                {/* Métricas Diarias */}
                <button
                  onClick={() => {
                    setView('metrics');
                    onClose();
                  }}
                  className="w-full px-4 py-2 rounded-lg flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm border border-transparent hover:border-red-200 dark:hover:border-red-700"
                >
                  <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                  <span>Ganancias Diarías</span>
                </button>

                {/* Reportes */}
                <button
                  onClick={() => {
                    setView('sales-report');
                    onClose();
                  }}
                  className="w-full px-4 py-2 rounded-lg flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm border border-transparent hover:border-red-200 dark:hover:border-red-700"
                >
                  <ChartBarIcon className="w-4 h-4 text-blue-600" />
                  <span>Reporte de Ventas</span>
                </button>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <p>Versión 1.0.0</p>
              <p className="mt-1">POS System</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlideMenu;