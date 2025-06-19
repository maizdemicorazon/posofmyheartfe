import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { PlusIcon, MinusIcon, XMarkIcon, CheckIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl } from '../../utils/helpers';

function ProductOptionsModal({
  isOpen,
  onClose,
  product,
  initialQuantity = 1,
  initialOptions = [],
  initialFlavors = [],
  initialExtras = [],
  initialSauces = [],
  initialComment = '',
  onSave,
  isEditing = false,
  onAddedToCart
}) {
  const { theme } = useTheme();
  const { addToCart, extras, sauces } = useCart();

  // Estados locales
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  // ✅ Estado para manejo de imagen del producto
  const [productImageState, setProductImageState] = useState({
    hasError: false,
    errorCount: 0
  });

  // ✅ FUNCIÓN PARA OPTIMIZAR IMAGEN DEL PRODUCTO CON PROTECCIÓN ANTI-LOOP
  const getOptimizedProductImage = () => {
    const isDark = theme === 'dark';
    if (!product?.image) {
      return generatePlaceholderUrl(product?.name || 'Producto', 400, isDark);
    }
    return optimizeGoogleDriveImageUrl(product.image, 400) || generatePlaceholderUrl(product.name, 400, isDark);
  };

  const handleProductImageError = (e) => {
    setProductImageState(prev => {
      // Prevenir loop infinito
      if (prev.errorCount >= 1) {
        console.log(`❌ Product image failed multiple times for ${product.name}, stopping retries`);
        return prev;
      }

      const placeholderSrc = generatePlaceholderUrl(product.name, 400, theme === 'dark');
      console.log(`❌ Product image failed for ${product.name}, using SVG placeholder`);

      e.target.src = placeholderSrc;

      return {
        hasError: true,
        errorCount: prev.errorCount + 1
      };
    });
  };

  // Resetear estados cuando se abre/cierra el modal o cambia el producto
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(initialQuantity || 1);
      setSelectedExtras(Array.isArray(initialExtras) ? [...initialExtras] : []);
      setSelectedSauces(Array.isArray(initialSauces) ? [...initialSauces] : []);
      setComment(initialComment || '');
      setErrors({});

      // Reset product image state
      setProductImageState({ hasError: false, errorCount: 0 });

      // Configurar opciones predeterminadas si existen
      if (Array.isArray(initialOptions) && initialOptions.length > 0) {
        setSelectedOption(initialOptions[0]);
      } else if (product.options && product.options.length > 0) {
        setSelectedOption(product.options[0]);
      }

      if (Array.isArray(initialFlavors) && initialFlavors.length > 0) {
        setSelectedFlavor(initialFlavors[0]);
      } else if (product.flavors && product.flavors.length > 0) {
        setSelectedFlavor(product.flavors[0]);
      }
    }
  }, [isOpen, product, initialQuantity, initialOptions, initialFlavors, initialExtras, initialSauces, initialComment]);

  // ✅ SCROLL LOCK - Prevenir scroll del fondo cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      // Guardar el scroll actual
      const scrollY = window.scrollY;

      // Aplicar estilos para bloquear el scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Cleanup cuando se cierra el modal
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        // Restaurar la posición del scroll
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Función para manejar extras
  const handleExtraClick = (extra) => {
    setSelectedExtras(prev => {
      const isSelected = prev.some(e => e.id_extra === extra.id_extra);
      if (isSelected) {
        return prev.filter(e => e.id_extra !== extra.id_extra);
      } else {
        return [...prev, extra];
      }
    });
  };

  // Función para manejar salsas
  const handleSauceClick = (sauce) => {
    setSelectedSauces(prev => {
      const isSelected = prev.some(s => s.id_sauce === sauce.id_sauce);
      if (isSelected) {
        return prev.filter(s => s.id_sauce !== sauce.id_sauce);
      } else {
        return [...prev, sauce];
      }
    });
  };

  // Validaciones
  const validateForm = () => {
    const newErrors = {};

    if (product.options && product.options.length > 0 && !selectedOption) {
      newErrors.option = 'Por favor, selecciona un tamaño';
    }

    if (product.flavors && product.flavors.length > 0 && !selectedFlavor) {
      newErrors.flavor = 'Por favor, selecciona un sabor';
    }

    if (quantity < 1) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calcular precio total
  const calculateTotalPrice = () => {
    let total = selectedOption ? parseFloat(selectedOption.price) : parseFloat(product.price || 0);

    selectedExtras.forEach(extra => {
      total += parseFloat(extra.price || 0);
    });

    return total * quantity;
  };

  // Función para guardar
  const handleSave = () => {
    if (!validateForm()) {
      Swal.fire({
        title: 'Campos requeridos',
        text: 'Por favor, completa todos los campos obligatorios',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    if (onSave) {
      onSave({
        product,
        quantity,
        selectedOption,
        selectedFlavor,
        selectedExtras,
        selectedSauces,
        comment,
        totalPrice: calculateTotalPrice()
      });
    } else {
      // Agregar al carrito directamente
      const cartItem = {
        id: Date.now(),
        product,
        quantity,
        selectedOption,
        selectedFlavor,
        selectedExtras,
        selectedSauces,
        comment,
        totalPrice: calculateTotalPrice()
      };

      addToCart(cartItem);

      if (onAddedToCart) {
        onAddedToCart();
      }

      Swal.fire({
        title: '¡Perfecto!',
        text: `${product.name} se agregó correctamente`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
    onClose();
  };

  // No renderizar si no está abierto o no hay producto
  if (!isOpen || !product) return null;

  // ✅ HANDLER PARA PREVENIR SCROLL FUERA DEL MODAL
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalScroll = (e) => {
    // Prevenir que el scroll se propague al elemento padre
    e.stopPropagation();
  };

  return (
    <>
      {/* ✅ ESTILOS CSS PARA MEJORAR EL SCROLL */}
      <style>{`
        /* Scroll lock para webkit browsers */
        .modal-scroll-lock {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* Personalizar scrollbar para el modal */
        .modal-content::-webkit-scrollbar {
          width: 6px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: ${theme === 'dark' ? '#1F2937' : '#F9FAFB'};
          border-radius: 3px;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? '#4B5563' : '#D1D5DB'};
          border-radius: 3px;
        }

        .modal-content::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? '#6B7280' : '#9CA3AF'};
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
        onClick={handleBackdropClick}
        style={{ touchAction: 'none' }} // Prevenir gestos de touch en el fondo
      >
        <div
          className={`w-full sm:w-[680px] md:w-[720px] lg:w-[680px] max-h-[95vh] sm:max-h-[85vh] rounded-none sm:rounded-2xl shadow-2xl transition-all duration-300 ease-out transform
          ${theme === 'dark'
            ? 'bg-gray-900 text-white border-t-2 sm:border-2 border-gray-700'
            : 'bg-white text-gray-900 border-t-2 sm:border-2 border-gray-100'
          }`}
          onClick={(e) => e.stopPropagation()} // Prevenir que clicks dentro del modal lo cierren
          onScroll={handleModalScroll}
          style={{
            overscrollBehavior: 'contain', // Contener el scroll dentro del modal
            touchAction: 'pan-y' // Permitir solo scroll vertical
          }}
        >
        {/* HEADER COMPACTO CON IMAGEN Y INFO BÁSICA */}
        <div className={`sticky top-0 z-10 px-4 sm:px-6 py-3 sm:py-4 border-b ${
          theme === 'dark' ? 'border-gray-700 bg-gray-900/95' : 'border-gray-200 bg-white/95'
        } backdrop-blur-md rounded-t-none sm:rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              {/* Imagen del producto - más pequeña */}
              <div className="relative flex-shrink-0">
                <img
                  src={getOptimizedProductImage()}
                  alt={product.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg shadow-sm"
                  onError={handleProductImageError}
                />
                {productImageState.hasError && (
                  <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info del producto */}
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-bold truncate">{product.name}</h2>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {product.description?.substring(0, 40)}{product.description?.length > 40 ? '...' : ''}
                </p>
              </div>
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors hover:scale-105 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div
          className="modal-content modal-scroll-lock px-4 sm:px-6 py-3 sm:py-4 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(85vh-120px)] overscroll-contain"
          onScroll={handleModalScroll}
        >
          <div className="space-y-4 sm:space-y-5">

            {/* TAMAÑOS/OPCIONES - DISEÑO EN GRID COMPACTO */}
            {product.options && product.options.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  Tamaños
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2">
                  {product.options.map((option, idx) => (
                    <div
                      key={`option-${option.id_variant}-${idx}`}
                      className={`relative p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        selectedOption?.id_variant === option.id_variant
                          ? `border-blue-500 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} shadow-md transform scale-105`
                          : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                      }`}
                      onClick={() => {
                        setSelectedOption(option);
                        setErrors(prev => ({ ...prev, option: '' }));
                      }}
                    >
                      {selectedOption?.id_variant === option.id_variant && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                          <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="font-medium text-xs sm:text-sm">{option.size}</p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          ${option.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.option && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.option}</p>
                )}
              </div>
            )}

            {/* SABORES - DISEÑO COMPACTO */}
            {product.flavors && product.flavors.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-green-400' : 'bg-green-500'}`}></div>
                  Sabores
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2">
                  {product.flavors.map((flavor, idx) => (
                    <div
                      key={`flavor-${flavor.id_flavor}-${idx}`}
                      className={`relative p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        selectedFlavor?.id_flavor === flavor.id_flavor
                          ? `border-green-500 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'} shadow-md transform scale-105`
                          : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                      }`}
                      onClick={() => {
                        setSelectedFlavor(flavor);
                        setErrors(prev => ({ ...prev, flavor: '' }));
                      }}
                    >
                      {selectedFlavor?.id_flavor === flavor.id_flavor && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                          <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="font-medium text-xs sm:text-sm">{flavor.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.flavor && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.flavor}</p>
                )}
              </div>
            )}

            {/* CANTIDAD - DISEÑO INLINE MÁS COMPACTO */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                Cantidad
              </h3>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border transition-colors flex items-center justify-center ${
                    theme === 'dark'
                      ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                >
                  <MinusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <span className="text-base sm:text-lg font-bold w-6 sm:w-8 text-center">{quantity}</span>
                <button
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border transition-colors flex items-center justify-center ${
                    theme === 'dark'
                      ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => setQuantity(prev => prev + 1)}
                >
                  <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* EXTRAS - GRID COMPACTO */}
            {extras && extras.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>
                  Extras
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2">
                  {extras.map((extra, idx) => (
                    <div
                      key={`extra-${extra.id_extra}-${idx}`}
                      className={`relative flex items-center p-2 sm:p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        selectedExtras.some(e => e.id_extra === extra.id_extra)
                          ? `border-yellow-500 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'} shadow-md`
                          : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                      }`}
                      onClick={() => handleExtraClick(extra)}
                    >
                      {selectedExtras.some(e => e.id_extra === extra.id_extra) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                          <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                      <div className="flex-1 text-center">
                        <p className="font-medium text-xs sm:text-sm">{extra.name}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          +${extra.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SALSAS - GRID COMPACTO */}
            {sauces && sauces.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-red-400' : 'bg-red-500'}`}></div>
                  Salsas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2">
                  {sauces.map((sauce, idx) => (
                    <div
                      key={`sauce-${sauce.id_sauce}-${idx}`}
                      className={`relative flex items-center p-2 sm:p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        selectedSauces.some(s => s.id_sauce === sauce.id_sauce)
                          ? `border-red-500 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'} shadow-md`
                          : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                      }`}
                      onClick={() => handleSauceClick(sauce)}
                    >
                      {selectedSauces.some(s => s.id_sauce === sauce.id_sauce) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                          <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                      <div className="flex-1 text-center">
                        <p className="font-medium text-xs sm:text-sm">{sauce.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMENTARIOS - MÁS VISIBLE Y PROMINENTE */}
            <div className={`p-3 sm:p-4 rounded-xl border-2 border-dashed ${
              theme === 'dark'
                ? 'border-gray-600 bg-gray-800/50'
                : 'border-gray-300 bg-gray-50/50'
            }`}>
              <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                Comentarios especiales
                <span className={`text-xs px-2 py-1 rounded-full ${
                  theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                }`}>
                  Opcional
                </span>
              </h3>
              <textarea
                className={`w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 placeholder-gray-500'
                }`}
                rows="3"
                placeholder="¿Alguna instrucción especial para tu orden? Escríbela aquí..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* FOOTER STICKY CON PRECIO Y BOTÓN */}
        <div className={`sticky bottom-0 px-4 sm:px-6 py-3 sm:py-4 border-t ${
          theme === 'dark' ? 'border-gray-700 bg-gray-900/95' : 'border-gray-200 bg-white/95'
        } backdrop-blur-md`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Total ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})
              </p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                ${calculateTotalPrice().toFixed(2)}
              </p>
            </div>
          </div>

          <button
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-200 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
            onClick={handleSave}
          >
            <ShoppingCartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            {isEditing ? 'Guardar cambios' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

export default ProductOptionsModal;