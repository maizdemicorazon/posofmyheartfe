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
  LinkIcon
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
  onSave,
  onSaveToOrder, // ✅ NUEVA PROP: Para guardar en orden existente
  isEditing = false,
  isEditingOrder = false, // ✅ NUEVA PROP: Distinguir entre editar producto vs agregar a orden
  onAddedToCart
}) {
  const { theme } = useTheme();
  const { addToCart, extras, sauces, paymentMethods, products } = useCart();

  // Estados para el producto
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  // ✅ NUEVO ESTADO: Para selección de producto cuando se agrega a orden
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Estado para manejo de imagen del producto
  const [productImageState, setProductImageState] = useState({
    hasError: false,
    errorCount: 0,
    finalImageSrc: null
  });

  // ✅ FUNCIÓN MEJORADA: Resetear modal a valores iniciales
  const resetModalToInitial = () => {
    setQuantity(1);
    setSelectedOption(null);
    setSelectedFlavor(null);
    setSelectedExtras([]);
    setSelectedSauces([]);
    setComment('');
    setErrors({});
    setSelectedProduct(null);
    setProductImageState({
      hasError: false,
      errorCount: 0,
      finalImageSrc: null
    });

    // ✅ SI ESTÁ EN MODO AGREGAR A ORDEN, NO SELECCIONAR NADA AUTOMÁTICAMENTE
    if (!isEditingOrder) {
      // ✅ CONFIGURAR OPCIONES Y SABORES POR DEFECTO SOLO EN MODO NORMAL
      const availableOptions = product?.options || product?.product?.options || initialOptions || [];
      const availableFlavors = product?.flavors || product?.product?.flavors || initialFlavors || [];

      // Seleccionar primera opción por defecto
      if (availableOptions.length > 0) {
        setSelectedOption(availableOptions[0]);
      }

      // Seleccionar primer sabor por defecto
      if (availableFlavors.length > 0) {
        setSelectedFlavor(availableFlavors[0]);
      }
    }

    console.log('🔄 Modal reset to initial values');
  };

  // ✅ FUNCIÓN MEJORADA PARA OBTENER IMAGEN DEL PRODUCTO
  const getOptimizedProductImage = () => {
    const isDark = theme === 'dark';
    const currentProduct = selectedProduct || product;

    // ✅ BUSCAR IMAGEN EN MÚLTIPLES UBICACIONES POSIBLES
    let imageUrl = null;

    // Prioridad 1: Imagen directa del producto
    if (currentProduct?.image) {
      imageUrl = currentProduct.image;
    }
    // Prioridad 2: Imagen anidada en product
    else if (currentProduct?.product?.image) {
      imageUrl = currentProduct.product.image;
    }
    // Prioridad 3: product_image (para compatibilidad con órdenes)
    else if (currentProduct?.product_image) {
      imageUrl = currentProduct.product_image;
    }

    console.log('🖼️ ProductModal image lookup:', {
      productName: currentProduct?.name || currentProduct?.product_name,
      directImage: currentProduct?.image,
      nestedImage: currentProduct?.product?.image,
      productImage: currentProduct?.product_image,
      finalImageUrl: imageUrl
    });

    // Si no hay imagen, usar placeholder
    if (!imageUrl) {
      const placeholderUrl = generatePlaceholderUrl(
        currentProduct?.name || currentProduct?.product_name || 'Producto',
        300,
        isDark
      );
      console.log('❌ No image found, using placeholder:', placeholderUrl);
      return placeholderUrl;
    }

    // Optimizar imagen de Google Drive
    const optimizedUrl = optimizeGoogleDriveImageUrl(imageUrl, 300);
    console.log('✅ Using optimized image:', optimizedUrl);

    return optimizedUrl || generatePlaceholderUrl(
      currentProduct?.name || currentProduct?.product_name || 'Producto',
      300,
      isDark
    );
  };

  // ✅ FUNCIÓN MEJORADA PARA MANEJAR ERROR DE IMAGEN
  const handleProductImageError = (e) => {
    console.log('❌ ProductModal image error:', e.target.src);

    setProductImageState(prev => {
      if (prev.errorCount >= 2) {
        console.log('❌ Too many image errors, stopping retries');
        return prev;
      }

      const currentProduct = selectedProduct || product;
      const productName = currentProduct?.name || currentProduct?.product_name || 'Producto';
      const placeholderSrc = generatePlaceholderUrl(productName, 300, theme === 'dark');

      console.log('🔄 Setting fallback image:', placeholderSrc);

      // Cambiar la src del elemento img
      if (e.target) {
        e.target.src = placeholderSrc;
      }

      return {
        hasError: true,
        errorCount: prev.errorCount + 1,
        finalImageSrc: placeholderSrc
      };
    });
  };

  // ✅ RESETEAR ESTADOS CUANDO SE ABRE/CIERRA EL MODAL - MEJORADO
  useEffect(() => {
    if (isOpen && product) {
      console.log('🔄 Initializing ProductModal with product:', product);

      // 1. Restablecer estados básicos
      setQuantity(initialQuantity || 1);
      setComment(initialComment || '');
      setErrors({});

      // Reset imagen
      setProductImageState({
        hasError: false,
        errorCount: 0,
        finalImageSrc: null
      });

      // 2. ✅ MAPEAR EXTRAS CON CANTIDADES
      const extrasWithQuantities = Array.isArray(initialExtras)
        ? initialExtras.map(extra => ({
            ...extra,
            quantity: extra.quantity || 1
          }))
        : [];
      setSelectedExtras(extrasWithQuantities);

      // 3. ✅ MAPEAR SALSAS
      setSelectedSauces(Array.isArray(initialSauces) ? [...initialSauces] : []);

      console.log('🔄 Mapped initial data:', {
        isEditing,
        isEditingOrder,
        paymentMethodsLength: paymentMethods?.length || 0,
        extrasWithQuantities,
        initialSauces
      });

      // 4. ✅ CONFIGURAR SEGÚN EL MODO
      if (isEditingOrder) {
        // ✅ MODO AGREGAR A ORDEN: Configurar selector de productos
        setSelectedProduct(null);
        setSelectedOption(null);
        setSelectedFlavor(null);
      } else {
        // ✅ MODO NORMAL: Configurar opciones y sabores
        // Para opciones (tamaños)
        let optionToSelect = null;
        if (initialOptions && initialOptions.length > 0) {
          optionToSelect = initialOptions[0];
        } else if (product.options && product.options.length > 0) {
          optionToSelect = product.options[0];
        } else if (product.product?.options && product.product.options.length > 0) {
          optionToSelect = product.product.options[0];
        }
        setSelectedOption(optionToSelect);

        // Para sabores
        let flavorToSelect = null;
        if (initialFlavors && initialFlavors.length > 0) {
          flavorToSelect = initialFlavors[0];
        } else if (product.flavors && product.flavors.length > 0) {
          flavorToSelect = product.flavors[0];
        } else if (product.product?.flavors && product.product.flavors.length > 0) {
          flavorToSelect = product.product.flavors[0];
        }
        setSelectedFlavor(flavorToSelect);

        console.log('✅ ProductModal initialized with options and flavors:', {
          selectedOption: optionToSelect,
          selectedFlavor: flavorToSelect,
          productHasOptions: !!(product.options || product.product?.options),
          productHasFlavors: !!(product.flavors || product.product?.flavors)
        });
      }

    } else if (!isOpen) {
      // Reset cuando se cierra
      setQuantity(1);
      setSelectedOption(null);
      setSelectedFlavor(null);
      setSelectedExtras([]);
      setSelectedSauces([]);
      setComment('');
      setErrors({});
      setSelectedProduct(null);
      setProductImageState({ hasError: false, errorCount: 0, finalImageSrc: null });
    }
  }, [isOpen, product, initialQuantity, initialOptions, initialFlavors, initialExtras, initialSauces, initialComment, isEditing, isEditingOrder, paymentMethods]);

  // ✅ MANEJADORES DE CAMBIO PARA EXTRAS CON CANTIDAD
  const handleExtraQuantityChange = (extra, newQuantity) => {
    setSelectedExtras(prev => {
      const existingExtraIndex = prev.findIndex(e => e.id_extra === extra.id_extra);

      if (newQuantity === 0) {
        return prev.filter(e => e.id_extra !== extra.id_extra);
      } else if (existingExtraIndex >= 0) {
        const updated = [...prev];
        updated[existingExtraIndex] = { ...updated[existingExtraIndex], quantity: newQuantity };
        return updated;
      } else {
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

  // ✅ MANEJADOR PARA SELECCIÓN DE PRODUCTO (MODO AGREGAR A ORDEN)
  const handleProductSelection = (productFromList) => {
    setSelectedProduct(productFromList);

    // ✅ CONFIGURAR OPCIONES Y SABORES DEL PRODUCTO SELECCIONADO
    if (productFromList.options && productFromList.options.length > 0) {
      setSelectedOption(productFromList.options[0]);
    } else {
      setSelectedOption(null);
    }

    if (productFromList.flavors && productFromList.flavors.length > 0) {
      setSelectedFlavor(productFromList.flavors[0]);
    } else {
      setSelectedFlavor(null);
    }

    // Limpiar extras y salsas
    setSelectedExtras([]);
    setSelectedSauces([]);
    setComment('');
    setErrors({});

    console.log('✅ Product selected for order:', productFromList);
  };

  // ✅ CALCULAR PRECIO TOTAL CON CANTIDADES DE EXTRAS
  const calculateTotalPrice = () => {
    const currentProduct = selectedProduct || product;
    let total = 0;

    // Precio base del producto según opción seleccionada
    if (selectedOption) {
      total += Number(selectedOption.price || 0);
    } else if (currentProduct?.price) {
      total += Number(currentProduct.price);
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
    const currentProduct = selectedProduct || product;

    // ✅ VALIDAR PRODUCTO SELECCIONADO (EN MODO AGREGAR A ORDEN)
    if (isEditingOrder && !selectedProduct) {
      newErrors.product = 'Selecciona un producto';
    }

    // ✅ OBTENER OPCIONES Y SABORES DEL PRODUCTO ACTUAL
    const availableOptions = currentProduct?.options || currentProduct?.product?.options || initialOptions || [];
    const availableFlavors = currentProduct?.flavors || currentProduct?.product?.flavors || initialFlavors || [];

    // Validar opción si hay opciones disponibles
    if (availableOptions.length > 0 && !selectedOption) {
      newErrors.option = 'Selecciona un tamaño';
    }

    // Validar sabor si hay sabores disponibles
    if (availableFlavors.length > 0 && !selectedFlavor) {
      newErrors.flavor = 'Selecciona un sabor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ FUNCIÓN COMÚN PARA PREPARAR DATOS DEL PRODUCTO
  const prepareProductData = () => {
    const currentProduct = selectedProduct || product;

    return {
      id_product: currentProduct?.id_product || currentProduct?.product?.id_product,
      product_name: currentProduct?.name || currentProduct?.product_name || currentProduct?.product?.name,
      product_image: currentProduct?.image || currentProduct?.product_image || currentProduct?.product?.image,
      quantity,
      selectedOption,
      selectedFlavor,
      selectedExtras,
      selectedSauces,
      selectedProduct: selectedProduct, // ✅ Para modo orden
      comment: comment.trim(),
      totalPrice: calculateTotalPrice(),
      // ✅ MANTENER REFERENCIA AL PRODUCTO COMPLETO
      product: currentProduct
    };
  };

  // ✅ FUNCIÓN COMÚN PARA AGREGAR AL CARRITO (MODO NORMAL)
  const addProductToCart = async () => {
    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const errorElement = document.querySelector(`[data-error="${firstErrorKey}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }

    try {
      const productToAdd = prepareProductData();

      console.log('🛒 Adding to cart with product data:', productToAdd);

      if (isEditing && onSave) {
        await onSave(productToAdd);
      } else {
        addToCart(productToAdd);
        if (onAddedToCart) {
          onAddedToCart();
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error al agregar al carrito:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Error al agregar el producto al carrito',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
      return false;
    }
  };

  // ✅ FUNCIÓN COMÚN PARA AGREGAR A ORDEN (MODO ORDEN)
  const addProductToOrder = async () => {
    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const errorElement = document.querySelector(`[data-error="${firstErrorKey}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }

    try {
      const productToAdd = prepareProductData();

      console.log('🛒 Adding to order with product data:', productToAdd);

      if (onSaveToOrder) {
        return await onSaveToOrder(productToAdd);
      }

      return true;
    } catch (error) {
      console.error('❌ Error al agregar a la orden:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Error al agregar el producto a la orden',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
      return false;
    }
  };

  // ✅ MANEJAR AGREGAR AL CARRITO/ORDEN (BOTÓN NORMAL)
  const handleAddToCart = async () => {
    let success = false;

    if (isEditingOrder) {
      success = await addProductToOrder();
    } else {
      success = await addProductToCart();
    }

    if (success) {
      if (isEditing) {
        await Swal.fire({
          title: '✅ Producto actualizado',
          text: `${(selectedProduct || product)?.name || (selectedProduct || product)?.product_name} ha sido actualizado`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
      } else if (isEditingOrder) {
        await Swal.fire({
          title: '✅ Producto agregado a la orden',
          text: `${selectedProduct?.name} ha sido agregado a la orden`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
      } else {
        await Swal.fire({
          title: '✅ Agregado al carrito',
          text: `${product?.name || product?.product_name} ha sido agregado al carrito`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
      }
      onClose();
    }
  };

  // ✅ NUEVA FUNCIÓN: Manejar agregar otro producto
  const handleAddAnother = async () => {
    let success = false;

    if (isEditingOrder) {
      success = await addProductToOrder();
    } else {
      success = await addProductToCart();
    }

    if (success) {
      // Mostrar notificación de éxito como toast
      const productName = (selectedProduct || product)?.name || (selectedProduct || product)?.product_name;
      const message = isEditingOrder
        ? `${productName} se agregó a la orden. Configura el siguiente producto.`
        : `${productName} se agregó al carrito. Configura el siguiente producto.`;

      await Swal.fire({
        title: '✅ Producto agregado',
        text: message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });

      // Resetear el modal para el siguiente producto
      resetModalToInitial();
    }
  };

  if (!isOpen || !product) return null;

  // ✅ OBTENER DATOS SEGÚN EL MODO
  const currentProduct = selectedProduct || product;
  const availableOptions = currentProduct?.options || currentProduct?.product?.options || initialOptions || [];
  const availableFlavors = currentProduct?.flavors || currentProduct?.product?.flavors || initialFlavors || [];
  const availableExtras = extras || [];
  const availableSauces = sauces || [];

  console.log('🔍 ProductModal render data:', {
    isEditingOrder,
    selectedProductName: selectedProduct?.name,
    productName: product?.name || product?.product_name,
    availableOptionsCount: availableOptions.length,
    availableFlavorsCount: availableFlavors.length,
    availableExtrasCount: availableExtras.length,
    availableSaucesCount: availableSauces.length,
    hasImage: !!(currentProduct?.image || currentProduct?.product_image || currentProduct?.product?.image)
  });

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-2 md:p-4">
      <div className={`
        w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl
        h-screen sm:h-[95vh] md:h-[90vh] lg:h-[88vh]
        sm:rounded-xl rounded-t-3xl sm:rounded-t-xl shadow-2xl overflow-hidden flex flex-col
        ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
        animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 sm:duration-200
      `}>

        {/* HEADER CON IMAGEN DEL PRODUCTO MEJORADO */}
        <div className="flex-shrink-0 relative">
          {/* Imagen del producto mejorada */}
          <div className="h-32 xs:h-36 sm:h-40 md:h-48 lg:h-52 overflow-hidden relative">
            <img
              src={getOptimizedProductImage()}
              alt={currentProduct?.name || currentProduct?.product_name || 'Producto'}
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
                  {currentProduct?.name || currentProduct?.product_name || 'Seleccionar Producto'}
                </h2>
                <p className="text-white/80 text-xs sm:text-sm">
                  {isEditingOrder ? 'Agregar a orden existente' :
                   isEditing ? 'Editar producto' : 'Personalizar producto'}
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

            {/* ✅ SELECTOR DE PRODUCTOS (SOLO EN MODO AGREGAR A ORDEN) */}
            {isEditingOrder && (
              <div data-error="product">
                <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                  Seleccionar Producto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                  {products && products.map((productOption) => (
                    <button
                      key={productOption.id_product}
                      onClick={() => handleProductSelection(productOption)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        selectedProduct?.id_product === productOption.id_product
                          ? `border-purple-500 ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'}`
                          : `border-gray-300 ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'hover:border-gray-400'}`
                      }`}
                    >
                      {productOption.image && (
                        <img
                          src={optimizeGoogleDriveImageUrl(productOption.image, 60)}
                          alt={productOption.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{productOption.name}</div>
                      </div>
                      {selectedProduct?.id_product === productOption.id_product && (
                        <CheckIcon className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                {errors.product && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.product}</p>
                )}
              </div>
            )}

            {/* TAMAÑOS/OPCIONES MEJORADOS */}
            {availableOptions.length > 0 && (
              <div data-error="option">
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  Tamaños
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableOptions.map((option, idx) => (
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

            {/* SABORES MEJORADOS */}
            {availableFlavors.length > 0 && (
              <div data-error="flavor">
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>
                  Sabores
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableFlavors.map((flavor, idx) => (
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
            {availableExtras.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-green-400' : 'bg-green-500'}`}></div>
                  Extras <span className="text-xs font-normal">(Opcional)</span>
                </h3>
                <div className="space-y-2">
                  {availableExtras.map((extra) => {
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

                          <span className="text-lg font-bold min-w-[2rem] text-center">
                            {currentQuantity}
                          </span>

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

            {/* SALSAS MEJORADAS */}
            {availableSauces.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-red-400' : 'bg-red-500'}`}></div>
                  Salsas <span className="text-xs font-normal">(Opcional)</span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {availableSauces.map((sauce) => {
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

        {/* ✅ FOOTER CON PRECIO Y BOTONES - ADAPTADO PARA AMBOS MODOS */}
        <div className={`flex-shrink-0 p-3 sm:p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
          {/* Contenedor principal con mejor distribución */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">

            {/* Sección del precio - Más prominente */}
            <div className="flex-1 text-center sm:text-left">
              <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-medium`}>
                {isEditingOrder ? 'Total del producto' : 'Total a pagar'}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-green-500">
                ${calculateTotalPrice().toFixed(2)}
              </div>
            </div>

            {/* ✅ SECCIÓN DE BOTONES ADAPTADA PARA AMBOS MODOS */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:min-w-[360px]">

              {/* Botón Cancelar - Más discreto */}
              <button
                onClick={onClose}
                className={`
                  flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base
                  transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation
                  ${theme === 'dark'
                    ? 'bg-gray-700/50 hover:bg-gray-600/60 text-gray-300 hover:text-gray-200 border border-gray-600/50 hover:border-gray-500/60'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 border border-gray-200 hover:border-gray-300'
                  }
                  backdrop-blur-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2
                  ${theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
                  sm:flex-1
                `}
              >
                <XMarkIcon className="w-4 h-4 opacity-70" />
                <span>Cancelar</span>
              </button>

              {/* ✅ BOTÓN AGREGAR OTRO - ADAPTADO PARA AMBOS MODOS */}
              {!isEditing && (
                <button
                  onClick={handleAddAnother}
                  className={`
                    flex items-center justify-center gap-2 px-4 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-white text-sm
                    transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation
                    ${theme === 'dark'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500'
                    }
                    text-white shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:ring-offset-2
                    ${theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
                    sm:flex-2
                  `}
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>{isEditingOrder ? 'Agregar Otro' : 'Otro igual'}</span>
                </button>
              )}

              {/* Botón Principal - Adaptado según el modo */}
              <button
                onClick={handleAddToCart}
                className={`
                  flex items-center justify-center gap-2 px-4 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-white text-sm
                  transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation
                  ${theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
                  }
                  shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2
                  ${theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
                  sm:flex-[1.5]
                `}
              >
                <ShoppingCartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>
                  {isEditing ? 'Actualizar' :
                   isEditingOrder ? 'Agregar a Orden' : 'Agregar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;