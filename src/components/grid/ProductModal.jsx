import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import {
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  CheckIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  QrCodeIcon,
  LinkIcon,
  ArrowPathIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/constants';

function ProductModal({
  isOpen,
  onClose,
  product,
  initialQuantity = 1,
  initialOptions = [],
  initialFlavors = [],
  initialExtras = [],
  initialSauces = [],
  initialComment = '',
  initialClientName = '',
  initialPaymentMethod = null,
  onSave,
  isEditing = false,
  onAddedToCart
}) {
  const { theme } = useTheme();
  const { addToCart, extras, sauces, paymentMethods } = useCart();

  // Estados para el producto
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [comment, setComment] = useState('');
  const [clientName, setClientName] = useState('');
  const [errors, setErrors] = useState({});

  // ✅ Estados para método de pago (ahora usando los del contexto)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  // Estado para manejo de imagen del producto
  const [productImageState, setProductImageState] = useState({
    hasError: false,
    errorCount: 0
  });

  // ✅ FUNCIÓN PARA OPTIMIZAR IMAGEN DEL PRODUCTO
  const getOptimizedProductImage = () => {
    const isDark = theme === 'dark';
    if (!product?.image) {
      return generatePlaceholderUrl(product?.name || 'Producto', 300, isDark);
    }
    return optimizeGoogleDriveImageUrl(product.image, 300) || generatePlaceholderUrl(product.name, 300, isDark);
  };

  const handleProductImageError = (e) => {
    setProductImageState(prev => {
      if (prev.errorCount >= 1) {
        return prev;
      }

      const placeholderSrc = generatePlaceholderUrl(product.name, 300, theme === 'dark');
      e.target.src = placeholderSrc;

      return {
        hasError: true,
        errorCount: prev.errorCount + 1
      };
    });
  };

  // ✅ RESETEAR ESTADOS CUANDO SE ABRE/CIERRA EL MODAL - INCLUYE CLIENTE
  useEffect(() => {
    if (isOpen && product) {
      // 1. Restablecer estados básicos
      setQuantity(initialQuantity || 1);

      // ✅ MAPEAR EXTRAS CON CANTIDADES
      const extrasWithQuantities = Array.isArray(initialExtras)
        ? initialExtras.map(extra => ({
            ...extra,
            quantity: extra.quantity || 1 // ✅ ASEGURAR QUE TENGA CANTIDAD
          }))
        : [];
      setSelectedExtras(extrasWithQuantities);
      setSelectedSauces(Array.isArray(initialSauces) ? [...initialSauces] : []);
      setComment(initialComment || '');
      setClientName(initialClientName || '');
      setErrors({});
      setProductImageState({ hasError: false, errorCount: 0 });

      console.log('🔄 Initializing ProductModal:', {
        isEditing,
        initialPaymentMethod,
        initialClientName,
        paymentMethodsLength: paymentMethods?.length || 0,
        initialExtrasWithQuantities: extrasWithQuantities
      });

      // 2. ✅ CONFIGURAR MÉTODO DE PAGO - Usar métodos del contexto
      if (isEditing && initialPaymentMethod) {
        setSelectedPaymentMethod(initialPaymentMethod);
      } else {
        // Seleccionar el primer método de pago disponible por defecto
        const defaultPaymentMethod = paymentMethods && paymentMethods.length > 0
          ? paymentMethods[0]?.id_payment_method
          : null;
        setSelectedPaymentMethod(defaultPaymentMethod);
      }

      // 3. Configurar opción y sabor seleccionados
      let optionToSelect = (initialOptions && initialOptions.length > 0)
        ? initialOptions[0]
        : (product.options && product.options.length > 0)
          ? product.options[0]
          : null;
      setSelectedOption(optionToSelect);

      let flavorToSelect = (initialFlavors && initialFlavors.length > 0)
        ? initialFlavors[0]
        : (product.flavors && product.flavors.length > 0)
          ? product.flavors[0]
          : null;
      setSelectedFlavor(flavorToSelect);

    } else if (!isOpen) {
      // Reset cuando se cierra
      setQuantity(1);
      setSelectedOption(null);
      setSelectedFlavor(null);
      setSelectedExtras([]); // ✅ Array vacío (sin cantidades)
      setSelectedSauces([]);
      setComment('');
      setClientName('');
      setSelectedPaymentMethod(null);
      setErrors({});
      setProductImageState({ hasError: false, errorCount: 0 });
    }
  }, [isOpen, product, initialQuantity, initialOptions, initialFlavors, initialExtras, initialSauces, initialComment, initialClientName, initialPaymentMethod, isEditing, paymentMethods]);

  // ✅ MANEJADORES DE CAMBIO PARA EXTRAS CON CANTIDAD
  const handleExtraQuantityChange = (extra, newQuantity) => {
    setSelectedExtras(prev => {
      const existingExtraIndex = prev.findIndex(e => e.id_extra === extra.id_extra);

      if (newQuantity === 0) {
        // Si la cantidad es 0, remover el extra
        return prev.filter(e => e.id_extra !== extra.id_extra);
      } else if (existingExtraIndex >= 0) {
        // Si ya existe, actualizar la cantidad
        const updated = [...prev];
        updated[existingExtraIndex] = { ...updated[existingExtraIndex], quantity: newQuantity };
        return updated;
      } else {
        // Si no existe, agregarlo con la cantidad especificada
        return [...prev, { ...extra, quantity: newQuantity }];
      }
    });
  };

  const handleSauceToggle = (sauce) => {
    setSelectedSauces(prev => {
      const isSelected = prev.find(s => s.id_sauce === sauce.id_sauce);
      if (isSelected) {
        return prev.filter(s => s.id_sauce !== sauce.id_sauce);
      } else {
        return [...prev, sauce];
      }
    });
  };

  // ✅ CALCULAR PRECIO TOTAL CON CANTIDADES DE EXTRAS
  const calculateTotalPrice = () => {
    let total = 0;

    // Precio base del producto según opción seleccionada
    if (selectedOption) {
      total += Number(selectedOption.price || 0);
    }

    // Sumar extras con sus cantidades
    if (selectedExtras && selectedExtras.length > 0) {
      selectedExtras.forEach(extra => {
        const extraPrice = Number(extra.price || 0);
        const extraQuantity = Number(extra.quantity || 1);
        total += extraPrice * extraQuantity;
      });
    }

    return total * quantity;
  };

  // ✅ VALIDACIÓN ANTES DE AGREGAR AL CARRITO
  const validateForm = () => {
    const newErrors = {};

    // Validar opción si hay opciones disponibles
    if (product.options && product.options.length > 0 && !selectedOption) {
      newErrors.option = 'Selecciona un tamaño';
    }

    // Validar sabor si hay sabores disponibles
    if (product.flavors && product.flavors.length > 0 && !selectedFlavor) {
      newErrors.flavor = 'Selecciona un sabor';
    }

    // ✅ Validar método de pago
    if (!selectedPaymentMethod) {
      newErrors.paymentMethod = 'Selecciona un método de pago';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ MANEJAR AGREGAR AL CARRITO
  const handleAddToCart = async () => {
    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        // Hacer scroll hacia el primer error
        const errorElement = document.querySelector(`[data-error="${firstErrorKey}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    try {
      const productToAdd = {
        id_product: product.id_product,
        product_name: product.name,
        product_image: product.image,
        quantity,
        selectedOption,
        selectedFlavor,
        selectedExtras, // ✅ Ya incluye cantidades
        selectedSauces,
        selectedPaymentMethod,
        comment: comment.trim(),
        clientName: clientName.trim(),
        totalPrice: calculateTotalPrice()
      };

      console.log('🛒 Adding to cart with extras quantities:', {
        productToAdd,
        extrasWithQuantities: selectedExtras
      });

      if (isEditing && onSave) {
        await onSave(productToAdd);
        await Swal.fire({
          title: '✅ Producto actualizado',
          text: `${product.name} ha sido actualizado en el carrito`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        addToCart(productToAdd);
        await Swal.fire({
          title: '✅ Agregado al carrito',
          text: `${product.name} ha sido agregado al carrito`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });

        if (onAddedToCart) {
          onAddedToCart();
        }
      }

      onClose();
    } catch (error) {
      console.error('❌ Error al agregar al carrito:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Error al agregar el producto al carrito',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-2 md:p-4">
      <div className={`
        w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl
        h-screen sm:h-[95vh] md:h-[90vh] lg:h-[88vh]
        sm:rounded-xl rounded-t-3xl sm:rounded-t-xl shadow-2xl overflow-hidden flex flex-col
        ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
        animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 sm:duration-200
      `}>

        {/* HEADER CON IMAGEN DEL PRODUCTO */}
        <div className="flex-shrink-0 relative">
          {/* Imagen del producto */}
          <div className="h-32 xs:h-36 sm:h-40 md:h-48 lg:h-52 overflow-hidden relative">
            <img
              src={getOptimizedProductImage()}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={handleProductImageError}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          </div>

          {/* Contenido superpuesto */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">
                  {product.name}
                </h2>
                <p className="text-white/80 text-xs sm:text-sm">
                  {isEditing ? 'Editar producto' : 'Personalizar producto'}
                </p>
              </div>
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className={`absolute top-3 sm:top-4 right-3 sm:right-4 p-2 sm:p-2.5 rounded-lg transition-colors hover:scale-105 active:scale-95 ${
              theme === 'dark'
                ? 'text-white/80 hover:text-white hover:bg-black/30'
                : 'text-white/80 hover:text-white hover:bg-black/30'
            }`}
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 px-3 sm:px-4 py-2 sm:py-3 overflow-y-auto min-h-0">
          <div className="space-y-3 sm:space-y-4 pb-4">

            {/* ✅ SECCIÓN DE MÉTODOS DE PAGO */}
            <div data-error="paymentMethod">
              <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-green-400' : 'bg-green-500'}`}></div>
                Método de Pago
              </h3>

              {!paymentMethods || paymentMethods.length === 0 ? (
                <div className={`p-3 border rounded-lg border-red-300 ${
                  theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
                }`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    No hay métodos de pago disponibles
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {paymentMethods.map(method => {
                    const isSelected = selectedPaymentMethod === method.id_payment_method;
                    return (
                      <button
                        key={method.id_payment_method}
                        type="button"
                        onClick={() => {
                          setSelectedPaymentMethod(method.id_payment_method);
                          setErrors(prev => ({ ...prev, paymentMethod: '' }));
                        }}
                        className={`
                          relative flex flex-col items-center gap-2 p-2.5 sm:p-3 border-2 rounded-lg transition-all min-h-[3.5rem] sm:min-h-[4rem]
                          ${isSelected
                            ? `border-green-500 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'} transform scale-105`
                            : `border-gray-300 ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500 active:bg-gray-700' : 'hover:border-gray-400 active:bg-gray-50'}`
                          }
                        `}
                      >
                        {/* Ícono del método de pago */}
                        <div className={`
                          flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
                          ${isSelected
                            ? theme === 'dark' ? 'bg-green-800' : 'bg-green-500 text-white'
                            : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                          }
                        `}>
                          {method.name.toLowerCase().includes(PAYMENT_METHODS.EFECTIVO) ? (
                            <CurrencyDollarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : method.name.toLowerCase().includes(PAYMENT_METHODS.TB) ? (
                            <CreditCardIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : method.name.toLowerCase().includes(PAYMENT_METHODS.CLABE) ? (
                            <BanknotesIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : method.name.toLowerCase().includes(PAYMENT_METHODS.QR) ? (
                            <QrCodeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : method.name.toLowerCase().includes(PAYMENT_METHODS.LINK) ? (
                            <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : (
                             <CurrencyDollarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                        </div>

                        <div className="text-center">
                          <div className="font-medium text-xs sm:text-sm leading-tight">{method.name}</div>
                        </div>

                        {isSelected && (
                          <div className="absolute -top-1 -right-1">
                            <CheckIcon className="w-4 h-4 bg-green-500 text-white rounded-full p-0.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.paymentMethod && (
                <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.paymentMethod}</p>
              )}
            </div>

            {/* ✅ SECCIÓN DE CLIENTE */}
            <div data-error="clientName">
              <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                Cliente
              </h3>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setErrors(prev => ({ ...prev, clientName: '' }));
                  }}
                  placeholder="Nombre del cliente"
                  className={`
                    block w-full pl-10 pr-3 py-2.5 sm:py-3 border rounded-lg text-sm
                    ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-purple-500/20 touch-manipulation
                  `}
                />
              </div>
              {errors.clientName && (
                <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.clientName}</p>
              )}
            </div>

            {/* TAMAÑOS/OPCIONES */}
            {product.options && product.options.length > 0 && (
              <div data-error="option">
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  Tamaños
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {product.options.map((option, idx) => (
                    <button
                      key={`option-${option.id_variant}-${idx}`}
                      className={`relative p-2.5 sm:p-3 rounded-lg border-2 transition-all min-h-[3rem] sm:min-h-[2.5rem] ${
                        selectedOption?.id_variant === option.id_variant
                          ? `border-blue-500 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} transform scale-105`
                          : `border-gray-300 ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500 active:bg-gray-700' : 'hover:border-gray-400 active:bg-gray-50'}`
                      }`}
                      onClick={() => {
                        setSelectedOption(option);
                        setErrors(prev => ({ ...prev, option: '' }));
                      }}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-xs sm:text-sm leading-tight">{option.size}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
                          ${Number(option.price).toFixed(2)}
                        </div>
                      </div>
                      {selectedOption?.id_variant === option.id_variant && (
                        <div className="absolute -top-1 -right-1">
                          <CheckIcon className="w-4 h-4 bg-blue-500 text-white rounded-full p-0.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {errors.option && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.option}</p>
                )}
              </div>
            )}

            {/* SABORES */}
            {product.flavors && product.flavors.length > 0 && (
              <div data-error="flavor">
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>
                  Sabores
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {product.flavors.map((flavor, idx) => (
                    <button
                      key={`flavor-${flavor.id_flavor}-${idx}`}
                      className={`relative p-2.5 sm:p-3 rounded-lg border-2 transition-all min-h-[3rem] sm:min-h-[2.5rem] ${
                        selectedFlavor?.id_flavor === flavor.id_flavor
                          ? `border-yellow-500 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'} transform scale-105`
                          : `border-gray-300 ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500 active:bg-gray-700' : 'hover:border-gray-400 active:bg-gray-50'}`
                      }`}
                      onClick={() => {
                        setSelectedFlavor(flavor);
                        setErrors(prev => ({ ...prev, flavor: '' }));
                      }}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-xs sm:text-sm leading-tight">{flavor.name}</div>
                      </div>
                      {selectedFlavor?.id_flavor === flavor.id_flavor && (
                        <div className="absolute -top-1 -right-1">
                          <CheckIcon className="w-4 h-4 bg-yellow-500 text-white rounded-full p-0.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {errors.flavor && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.flavor}</p>
                )}
              </div>
            )}

            {/* EXTRAS CON CONTROLES DE CANTIDAD */}
            {extras && extras.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-green-400' : 'bg-green-500'}`}></div>
                  Extras <span className="text-xs font-normal">(Opcional)</span>
                </h3>
                <div className="space-y-2">
                  {extras.map((extra) => {
                    const selectedExtra = selectedExtras.find(e => e.id_extra === extra.id_extra);
                    const currentQuantity = selectedExtra ? selectedExtra.quantity : 0;
                    const extraPrice = Number(extra.price || 0);

                    return (
                      <div
                        key={extra.id_extra}
                        className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-lg border-2 transition-all min-h-[3rem] ${
                          currentQuantity > 0
                            ? `border-green-500 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'}`
                            : `border-gray-300 ${theme === 'dark' ? 'border-gray-600' : ''}`
                        }`}
                      >
                        {/* Información del extra */}
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="font-medium text-sm sm:text-base">{extra.name}</div>
                          <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            ${extraPrice.toFixed(2)} c/u
                            {currentQuantity > 0 && (
                              <span className="ml-2 font-medium text-green-600">
                                = ${(extraPrice * currentQuantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controles de cantidad */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Botón menos */}
                          <button
                            type="button"
                            onClick={() => handleExtraQuantityChange(extra, Math.max(0, currentQuantity - 1))}
                            disabled={currentQuantity === 0}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border-2 flex items-center justify-center transition-all touch-manipulation ${
                              currentQuantity === 0
                                ? 'opacity-50 cursor-not-allowed'
                                : theme === 'dark'
                                  ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 active:bg-gray-700'
                                  : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700 active:bg-gray-50'
                            }`}
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>

                          {/* Cantidad actual */}
                          <span className="text-lg font-bold min-w-[2rem] text-center">
                            {currentQuantity}
                          </span>

                          {/* Botón más */}
                          <button
                            type="button"
                            onClick={() => handleExtraQuantityChange(extra, currentQuantity + 1)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border-2 flex items-center justify-center transition-all touch-manipulation ${
                              theme === 'dark'
                                ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 active:bg-gray-700'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700 active:bg-gray-50'
                            }`}
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SALSAS */}
            {sauces && sauces.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-red-400' : 'bg-red-500'}`}></div>
                  Salsas <span className="text-xs font-normal">(Opcional)</span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {sauces.map((sauce) => {
                    const isSelected = selectedSauces.find(s => s.id_sauce === sauce.id_sauce);
                    return (
                      <button
                        key={sauce.id_sauce}
                        className={`relative p-2 rounded-lg border-2 transition-all min-h-[4rem] sm:min-h-[4.5rem] ${
                          isSelected
                            ? `border-red-500 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'}`
                            : `border-gray-300 ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500 active:bg-gray-700' : 'hover:border-gray-400 active:bg-gray-50'}`
                        }`}
                        onClick={() => handleSauceToggle(sauce)}
                      >
                        <div className="flex flex-col items-center gap-1.5 h-full justify-center">
                          {sauce.image && (
                            <img
                              src={optimizeGoogleDriveImageUrl(sauce.image, 60)}
                              alt={sauce.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded"
                              onError={(e) => {
                                e.target.src = generatePlaceholderUrl(sauce.name, 40, theme === 'dark');
                              }}
                            />
                          )}
                          <span className="text-xs font-medium text-center leading-tight line-clamp-2">
                            {sauce.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1">
                            <CheckIcon className="w-4 h-4 bg-red-500 text-white rounded-full p-0.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CANTIDAD */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
                Cantidad
              </h3>
              <div className="flex items-center justify-center gap-4 sm:justify-start">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center transition-all touch-manipulation ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 active:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700 active:bg-gray-50'
                  } disabled:opacity-50`}
                  disabled={quantity <= 1}
                >
                  <MinusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <span className="text-xl sm:text-2xl font-bold min-w-[3rem] sm:min-w-[4rem] text-center">{quantity}</span>

                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center transition-all touch-manipulation ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 active:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700 active:bg-gray-50'
                  }`}
                >
                  <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* COMENTARIO */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                Comentario <span className="text-xs font-normal">(Opcional)</span>
              </h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Instrucciones especiales..."
                className={`w-full p-2.5 sm:p-3 border rounded-lg text-sm resize-none touch-manipulation ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* FOOTER CON PRECIO Y BOTÓN */}
        <div className={`flex-shrink-0 p-3 sm:p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="text-left">
              <div className="text-xs sm:text-sm text-gray-500">Total</div>
              <div className="text-xl sm:text-2xl font-bold">
                ${calculateTotalPrice().toFixed(2)}
              </div>
            </div>
            <button
              onClick={handleAddToCart}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-white text-sm sm:text-base
                transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation
                ${theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
                }
                shadow-lg hover:shadow-xl
              `}
            >
              <ShoppingCartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              {isEditing ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;