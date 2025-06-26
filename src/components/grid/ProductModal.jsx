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
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl } from '../../utils/helpers';
import { getPaymentMethods } from '../../utils/api';

function ProductModal({
  isOpen,
  onClose,
  product,
  // Propiedades para edición
  initialQuantity = 1,
  initialOptions = [],
  initialFlavors = [],
  initialExtras = [],
  initialSauces = [],
  initialComment = '',
  initialPaymentMethod = null,
  onSave,
  isEditing = false,
  onAddedToCart
}) {
  const { theme } = useTheme();
  const { addToCart, extras, sauces } = useCart();

  // Estados para el producto
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  // ✅ NUEVOS Estados para método de pago
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Estado para manejo de imagen del producto
  const [productImageState, setProductImageState] = useState({
    hasError: false,
    errorCount: 0
  });

  // ✅ CARGAR MÉTODOS DE PAGO al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

// En ProductModal.jsx, dentro del useEffect que carga métodos de pago
// Reemplazar la función loadPaymentMethods con esta versión corregida:

const loadPaymentMethods = async () => {
  setIsLoadingPayments(true);
  setPaymentError(null);

  try {
    const response = await getPaymentMethods();
    const validPayments = Array.isArray(response) ?
      response.filter(pm => pm && pm.id_payment_method && pm.name) : [];

    setPaymentMethods(validPayments);
    // ✅ PRESELECCIONAR EFECTIVO (id=1)
    setSelectedPaymentMethod(validPayments[0].id_payment_method);
  } catch (error) {
    console.error('Error loading payment methods:', error);
    setPaymentError(error);
  } finally {
    setIsLoadingPayments(false);
  }

};

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

  // ✅ RESETEAR ESTADOS CUANDO SE ABRE/CIERRA EL MODAL
// src/components/grid/ProductModal.jsx

  // ✅ RESETEAR ESTADOS CUANDO SE ABRE/CIERRA EL MODAL - CORREGIDO
  useEffect(() => {
    if (isOpen && product) {
      console.log('🔄 Initializing ProductModal:', { isEditing, initialPaymentMethod });

      // 1. Restablecer estados básicos
      setQuantity(initialQuantity || 1);
      setSelectedExtras(Array.isArray(initialExtras) ? [...initialExtras] : []);
      setSelectedSauces(Array.isArray(initialSauces) ? [...initialSauces] : []);
      setComment(initialComment || '');
      setErrors({});
      setProductImageState({ hasError: false, errorCount: 0 });

      if (isEditing && initialPaymentMethod) {
        setSelectedPaymentMethod(initialPaymentMethod);
      } else {
        setSelectedPaymentMethod(paymentMethods.length > 0 ? paymentMethods[0].id_payment_method : null);
      }
      
      // 3. Configurar opción y sabor seleccionados
      let optionToSelect = (initialOptions && initialOptions.length > 0) ? initialOptions[0] : (product.options && product.options.length > 0) ? product.options[0] : null;
      setSelectedOption(optionToSelect);

      let flavorToSelect = (initialFlavors && initialFlavors.length > 0) ? initialFlavors[0] : (product.flavors && product.flavors.length > 0) ? product.flavors[0] : null;
      setSelectedFlavor(flavorToSelect);
    }
  }, [
    isOpen, product, initialQuantity, initialOptions, initialFlavors, 
    initialExtras, initialSauces, initialComment, initialPaymentMethod, 
    isEditing, paymentMethods
  ]);

  // ✅ SCROLL LOCK
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

    const handlePaymentsClick = (extra) => {
      setSelectedPaymentMethod(prev => {
        const isSelected = prev.some(e => e.id_payment_method === extra.id_payment_method);
        if (isSelected) {
          return prev.filter(e => e.id_payment_method !== extra.id_payment_method);
        } else {
          return [...prev, paymentMethods];
        }
      });
    };

  // Función para manejar extras
  const handleExtraClick = (extra) => {
    setSelectedExtras(prev => {
      const isSelected = prev.some(e => e.id_extra === extra.id_extra);
      if (isSelected) {
        return prev.filter(e => e.id_extra !== extra.id_extra);
      } else {
        return [...prev, { ...extra, quantity: 1 }];
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

    // ✅ Validar método de pago si es requerido
    if (!selectedPaymentMethod) {
      newErrors.paymentMethod = 'Por favor, selecciona un método de pago';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ CALCULAR PRECIO TOTAL
  const calculateTotalPrice = () => {
    let total = selectedOption ? parseFloat(selectedOption.price) : parseFloat(product.price || 0);

    // Agregar precio de extras
    selectedExtras.forEach(extra => {
      const extraPrice = parseFloat(extra.price || extra.actual_price || 0);
      const extraQuantity = parseInt(extra.quantity || 1);
      total += extraPrice * extraQuantity;
    });

    // Agregar precio de salsas
    selectedSauces.forEach(sauce => {
      const saucePrice = parseFloat(sauce.price || sauce.actual_price || 0);
      total += saucePrice;
    });

    // Agregar precio de sabor
    if (selectedFlavor && selectedFlavor.price) {
      const flavorPrice = parseFloat(selectedFlavor.price || 0);
      total += flavorPrice;
    }

    return total * quantity;
  };

  // ✅ FUNCIÓN PARA GUARDAR
  const handleSave = () => {
    if (!validateForm()) {
      Swal.fire({
        title: 'Campos requeridos',
        text: 'Por favor, completa todos los campos obligatorios',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
      return;
    }

    if (onSave) {
      const dataToSave = {
        product,
        quantity,
        selectedOption,
        selectedFlavor,
        selectedExtras: [...selectedExtras],
        selectedSauces: [...selectedSauces],
        comment,
        totalPrice: calculateTotalPrice(),
        selectedPaymentMethod,
        options: selectedOption ? [selectedOption] : [],
        flavors: selectedFlavor ? [selectedFlavor] : [],
        extras: [...selectedExtras],
        sauces: [...selectedSauces]
      };

      onSave(dataToSave);

      if (isEditing) {
        Swal.fire({
          title: '¡Producto actualizado!',
          text: 'Los cambios se han guardado',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
      }
    } else {
      // Agregar al carrito directamente
      const cartItem = {
        id: Date.now(),
        product,
        quantity,
        selectedOption,
        selectedFlavor,
        selectedExtras: [...selectedExtras],
        selectedSauces: [...selectedSauces],
        comment,
        totalPrice: calculateTotalPrice(),
        ...{ selectedPaymentMethod }
      };

      addToCart(cartItem);

      if (onAddedToCart) {
        onAddedToCart();
      }

      Swal.fire({
        title: '¡Producto agregado!',
        text: `${product.name} se ha agregado al carrito`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
    }

    onClose();
  };

  if (!isOpen || !product) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <style>{`
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
      >
        <div
          className={`w-full sm:w-[600px] md:w-[650px] max-h-[95vh] sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl transition-all duration-300 ease-out transform
          ${theme === 'dark'
            ? 'bg-gray-900 text-white border-t-2 sm:border-2 border-gray-700'
            : 'bg-white text-gray-900 border-t-2 sm:border-2 border-gray-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER COMPACTO */}
          <div className={`sticky top-0 z-10 px-4 py-3 border-b ${
            theme === 'dark' ? 'border-gray-700 bg-gray-900/95' : 'border-gray-200 bg-white/95'
          } backdrop-blur-md rounded-t-none sm:rounded-t-2xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {/* Imagen del producto */}
                <div className="relative flex-shrink-0">
                  <img
                    src={getOptimizedProductImage()}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-lg shadow-sm"
                    onError={handleProductImageError}
                  />
                </div>

                {/* Info del producto */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{product.name}</h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isEditing ? 'Editar producto' : 'Personalizar producto'}
                  </p>
                </div>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors hover:scale-105 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CONTENIDO SCROLLEABLE */}
          <div className="modal-content px-4 py-3 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-120px)]">
            <div className="space-y-4">

              {/* ✅ SECCIÓN DE MÉTODOS DE PAGO (si se muestra) */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-green-400' : 'bg-green-500'}`}></div>
                    Método de Pago
                  </h3>

                  {isLoadingPayments ? (
                    <div className={`flex items-center gap-2 p-3 border rounded-lg ${
                      theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'
                    }`}>
                      <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Cargando métodos de pago...
                      </span>
                    </div>
                  ) : paymentError ? (
                    <div className={`p-3 border rounded-lg border-red-300 ${
                      theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
                    }`}>
                      <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                        Error cargando métodos de pago
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                              relative flex items-center gap-2 p-3 border-2 rounded-lg transition-all text-left
                              ${isSelected
                                ? theme === 'dark'
                                  ? 'border-green-500 bg-green-900/30 text-green-300'
                                  : 'border-green-500 bg-green-50 text-green-700'
                                : theme === 'dark'
                                  ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                              }
                            `}
                          >
                            {/* Ícono del método de pago */}
                            <div className={`
                              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                              ${isSelected
                                ? theme === 'dark' ? 'bg-green-800' : 'bg-green-500 text-white'
                                : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                              }
                            `}>
                              {method.name.toLowerCase().includes('efectivo') ? (
                                <CurrencyDollarIcon className="w-4 h-4" />
                              ) : method.name.toLowerCase().includes('tarjeta') ? (
                                <CreditCardIcon className="w-4 h-4" />
                              ) : method.name.toLowerCase().includes('transferencia') ? (
                                <BanknotesIcon className="w-4 h-4" />
                              ) : method.name.toLowerCase().includes('qr') ? (
                                <QrCodeIcon className="w-4 h-4" />
                              ) : method.name.toLowerCase().includes('link') ? (
                                <LinkIcon className="w-4 h-4" />
                              ) : (
                                 <CurrencyDollarIcon className="w-4 h-4" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{method.name}</div>
                            </div>

                            {isSelected && (
                              <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {errors.paymentMethod && (
                    <p className="text-red-500 text-sm mt-2">{errors.paymentMethod}</p>
                  )}
                </div>
              

              {/* TAMAÑOS/OPCIONES */}
              {product.options && product.options.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                    Tamaños
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.options.map((option, idx) => (
                      <button
                        key={`option-${option.id_variant}-${idx}`}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          selectedOption?.id_variant === option.id_variant
                            ? `border-blue-500 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} transform scale-105`
                            : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                        }`}
                        onClick={() => {
                          setSelectedOption(option);
                          setErrors(prev => ({ ...prev, option: '' }));
                        }}
                      >
                        {selectedOption?.id_variant === option.id_variant && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="font-medium text-sm">{option.size}</p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            ${option.price}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.option && (
                    <p className="text-red-500 text-sm mt-2">{errors.option}</p>
                  )}
                </div>
              )}

              {/* SABORES */}
              {product.flavors && product.flavors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-orange-400' : 'bg-orange-500'}`}></div>
                    Sabores
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.flavors.map((flavor, idx) => (
                      <button
                        key={`flavor-${flavor.id_flavor}-${idx}`}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          selectedFlavor?.id_flavor === flavor.id_flavor
                            ? `border-orange-500 ${theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-50'} transform scale-105`
                            : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                        }`}
                        onClick={() => {
                          setSelectedFlavor(flavor);
                          setErrors(prev => ({ ...prev, flavor: '' }));
                        }}
                      >
                        {selectedFlavor?.id_flavor === flavor.id_flavor && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="font-medium text-sm">{flavor.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.flavor && (
                    <p className="text-red-500 text-sm mt-2">{errors.flavor}</p>
                  )}
                </div>
              )}

              {/* CANTIDAD */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                  Cantidad
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    className={`w-8 h-8 rounded-lg border transition-colors flex items-center justify-center ${
                      theme === 'dark'
                        ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                        : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                  <button
                    className={`w-8 h-8 rounded-lg border transition-colors flex items-center justify-center ${
                      theme === 'dark'
                        ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                        : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => setQuantity(prev => prev + 1)}
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* EXTRAS */}
              {extras && extras.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>
                    Extras
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {extras.map((extra, idx) => (
                      <button
                        key={`extra-${extra.id_extra}-${idx}`}
                        className={`relative p-3 rounded-lg border transition-all ${
                          selectedExtras.some(e => e.id_extra === extra.id_extra)
                            ? `border-yellow-500 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'}`
                            : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                        }`}
                        onClick={() => handleExtraClick(extra)}
                      >
                        {selectedExtras.some(e => e.id_extra === extra.id_extra) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="font-medium text-sm">{extra.name}</p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            +${extra.price}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SALSAS */}
              {sauces && sauces.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-red-400' : 'bg-red-500'}`}></div>
                    Salsas
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {sauces.map((sauce, idx) => (
                      <button
                        key={`sauce-${sauce.id_sauce}-${idx}`}
                        className={`relative p-3 rounded-lg border transition-all ${
                          selectedSauces.some(s => s.id_sauce === sauce.id_sauce)
                            ? `border-red-500 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'}`
                            : `border-gray-300 ${theme === 'dark' ? 'hover:border-gray-500 hover:bg-gray-800' : 'hover:border-gray-400 hover:bg-gray-50'}`
                        }`}
                        onClick={() => handleSauceClick(sauce)}
                      >
                        {selectedSauces.some(s => s.id_sauce === sauce.id_sauce) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="font-medium text-sm">{sauce.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COMENTARIOS */}
              <div className={`p-3 rounded-lg border-2 border-dashed ${
                theme === 'dark' ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50/50'
              }`}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
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
                  placeholder="¿Alguna instrucción especial para tu orden?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* FOOTER CON PRECIO Y BOTÓN */}
          <div className={`sticky bottom-0 px-4 py-3 border-t ${
            theme === 'dark' ? 'border-gray-700 bg-gray-900/95' : 'border-gray-200 bg-white/95'
          } backdrop-blur-md`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${calculateTotalPrice().toFixed(2)}
                </p>
              </div>
            </div>

            <button
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
              onClick={handleSave}
            >
              <ShoppingCartIcon className="w-5 h-5" />
              {isEditing ? 'Guardar cambios' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductModal;