import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Bars3Icon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BusinessHeader from './BusinessHeader';
import { CATEGORIES, CATEGORY_NAMES, BREAKPOINTS } from '../../utils/constants';

function TopNav({ selectedCategory, onSelectCategory, onMenuClick }) {
  const { theme } = useTheme();
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ CONFIGURACIÓN DE CATEGORÍAS MEJORADA
  const categories = [
    { id: CATEGORIES.ALL, name: CATEGORY_NAMES[CATEGORIES.ALL], color: 'yellow', icon: '🌽' },
    { id: CATEGORIES.ESQUITES, name: CATEGORY_NAMES[CATEGORIES.ESQUITES], color: 'red', icon: '🍽️' },
    { id: CATEGORIES.ELOTES, name: CATEGORY_NAMES[CATEGORIES.ELOTES], color: 'orange', icon: '🌽' },
    { id: CATEGORIES.BEBIDAS, name: CATEGORY_NAMES[CATEGORIES.BEBIDAS], color: 'blue', icon: '🥤' },
    { id: CATEGORIES.ESPECIALES, name: CATEGORY_NAMES[CATEGORIES.ESPECIALES], color: 'purple', icon: '⭐' },
    { id: CATEGORIES.ANTOJITOS, name: CATEGORY_NAMES[CATEGORIES.ANTOJITOS], color: 'green', icon: '🍿' }
  ];

  // ✅ DETECTAR TAMAÑO DE PANTALLA
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.MD);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ✅ CERRAR MENÚ DE FILTROS AL CAMBIAR CATEGORÍA
  useEffect(() => {
    setIsFilterMenuOpen(false);
  }, [selectedCategory]);

  // ✅ FUNCIÓN PARA OBTENER CLASES DE COLOR POR CATEGORÍA
  const getCategoryColorClasses = (color, isSelected) => {
    const colorMap = {
      yellow: {
        selected: 'bg-yellow-300 border-yellow-300 text-gray-800 shadow-lg transform scale-105',
        unselected: theme === 'dark'
          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-yellow-900/30 hover:border-yellow-600 hover:text-yellow-300'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700'
      },
      red: {
        selected: 'bg-red-600 border-red-600 text-white shadow-lg transform scale-105',
        unselected: theme === 'dark'
          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-red-900/30 hover:border-red-600 hover:text-red-300'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
      },
      orange: {
        selected: 'bg-orange-600 border-orange-600 text-white shadow-lg transform scale-105',
        unselected: theme === 'dark'
          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-orange-900/30 hover:border-orange-600 hover:text-orange-300'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'
      },
      blue: {
        selected: 'bg-blue-600 border-blue-600 text-white shadow-lg transform scale-105',
        unselected: theme === 'dark'
          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-blue-900/30 hover:border-blue-600 hover:text-blue-300'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
      },
      purple: {
        selected: 'bg-purple-600 border-purple-600 text-white shadow-lg transform scale-105',
        unselected: theme === 'dark'
          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-purple-900/30 hover:border-purple-600 hover:text-purple-300'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700'
      },
      green: {
        selected: 'bg-green-600 border-green-600 text-white shadow-lg transform scale-105',
        unselected: theme === 'dark'
          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-green-900/30 hover:border-green-600 hover:text-green-300'
          : 'bg-white border-gray-300 text-gray-800 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
      }
    };

    return colorMap[color] ? colorMap[color][isSelected ? 'selected' : 'unselected'] : colorMap.gray.unselected;
  };

  // ✅ CONTAR CATEGORÍAS VISIBLES EN DESKTOP
  const maxVisibleCategories = isMobile ? 3 : 6;
  const visibleCategories = categories.slice(0, maxVisibleCategories);
  const hiddenCategories = categories.slice(maxVisibleCategories);

  return (
    <div className={`w-full transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* ✅ Business Header */}
      <BusinessHeader />

      {/* ✅ Navegación de Categorías Mejorada */}
      <div className={`${
        theme === 'dark'
          ? 'bg-gradient-to-r from-green-700 via-green-600 to-green-700'
          : 'bg-gradient-to-r from-green-600 via-green-500 to-green-600'
      } shadow-lg border-t ${theme === 'dark' ? 'border-green-600' : 'border-green-700'}`}>
        <div className="max-w-l mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between py-3 gap-3">

            {/* ✅ Botón de Menú Mejorado */}
            <button
              onClick={onMenuClick}
              className={`flex-shrink-0 p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-md ${
                theme === 'dark'
                  ? 'bg-white/90 hover:bg-white text-gray-800 hover:shadow-lg'
                  : 'bg-white hover:bg-yellow-100 text-gray-800 hover:shadow-lg'
              }`}
              aria-label="Abrir menú principal"
            >
              <Bars3Icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            {/* ✅ Categorías Visibles */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {/* Categoría "Todos" siempre visible */}
              <button
                className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold border-2 transition-all duration-200 text-xs sm:text-sm ${
                  getCategoryColorClasses('yellow', selectedCategory === CATEGORIES.ALL)
                }`}
                onClick={() => onSelectCategory(CATEGORIES.ALL)}
              >
                <span className="flex items-center gap-1.5">
                  <span className="hidden sm:inline">🌽</span>
                  <span>Todos</span>
                </span>
              </button>

              {/* Categorías específicas */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {visibleCategories
                  .filter(cat => cat.id !== CATEGORIES.ALL)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold border-2 transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
                        getCategoryColorClasses(cat.color, selectedCategory === cat.id)
                      }`}
                      onClick={() => onSelectCategory(cat.id)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="hidden sm:inline">{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* ✅ Menú de Filtros para Categorías Ocultas */}
            {hiddenCategories.length > 0 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-md ${
                    isFilterMenuOpen
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-white/90 hover:bg-white text-gray-800'
                        : 'bg-white hover:bg-gray-100 text-gray-800'
                  }`}
                  aria-label="Más categorías"
                >
                  {isFilterMenuOpen ? (
                    <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <FunnelIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>

                {/* ✅ Menú Desplegable de Categorías */}
                {isFilterMenuOpen && (
                  <>
                    {/* Overlay */}
                    <div
                      className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
                      onClick={() => setIsFilterMenuOpen(false)}
                      aria-hidden="true"
                    />

                    {/* Menú */}
                    <div className={`absolute top-full right-0 mt-2 py-2 w-48 sm:w-56 rounded-xl shadow-2xl border z-40 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-white border-gray-200'
                    } animate-in fade-in slide-in-from-top-5 duration-200`}>

                      <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Más categorías
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {hiddenCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-3 ${
                              selectedCategory === cat.id
                                ? theme === 'dark'
                                  ? 'bg-blue-900/50 text-blue-300 border-l-4 border-blue-500'
                                  : 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                                : theme === 'dark'
                                  ? 'text-gray-300 hover:bg-gray-700'
                                  : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-lg flex-shrink-0">{cat.icon}</span>
                            <div>
                              <div className="font-medium text-sm">{cat.name}</div>
                              {selectedCategory === cat.id && (
                                <div className={`text-xs ${
                                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                }`}>
                                  Categoría activa
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ✅ Indicador de Categoría Activa en Móvil */}
        {isMobile && selectedCategory !== CATEGORIES.ALL && (
          <div className={`px-4 pb-2 ${
            theme === 'dark' ? 'text-green-100' : 'text-green-100'
          }`}>
            <div className="flex items-center gap-2 text-xs">
              <span>Mostrando:</span>
              <span className="font-semibold">
                {categories.find(cat => cat.id === selectedCategory)?.icon}{' '}
                {categories.find(cat => cat.id === selectedCategory)?.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Estilos para ocultar scrollbar - CORREGIDO */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `
        }}
      />
    </div>
  );
}

export default TopNav;