import { useState, useRef, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { PencilIcon, TrashIcon, ArrowLeftIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import ClientPaymentModal from '../modals/ClientPaymentModal';
import Swal from 'sweetalert2';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl } from '../../utils/helpers';

function Cart({ onCloseCart, isMobile = false, showBackButton = false }) {
  const { cart, removeFromCart, startEditProduct, saveOrder, clearCart, calculateProductPrice, cartTotal, paymentMethods } = useCart();
  const { theme } = useTheme();
  const hasProducts = cart && cart.length > 0;

  // ✅ Estados para manejo de imágenes por producto
  const [imageStates, setImageStates] = useState({});
  const imageRefs = useRef({});

  // ✅ FORZAR RE-RENDER CUANDO CAMBIE EL CARRITO
  const [cartVersion, setCartVersion] = useState(0);

  // ✅ ESTADOS PARA EL MODAL DE CLIENTE Y PAGO
  const [showClientPaymentModal, setShowClientPaymentModal] = useState(false);

  useEffect(() => {
    console.log('🔄 Cart changed, forcing re-render');
    setCartVersion(prev => prev + 1);
  }, [cart]);

  // 🚨 DEBUGGING - Mostrar estructura completa del carrito
  console.log('🛒 CURRENT CART STRUCTURE (v' + cartVersion + '):', cart);
  console.log('🔍 Cart items count:', cart.length);
  cart.forEach((item, index) => {
    console.log(`📦 Cart Item ${index} COMPLETE STRUCTURE:`, {
      index,
      id: item.id,
      id_product: item.id_product,
      product_name: item.product_name,
      name: item.name,
      product_image: item.product_image,
      image: item.image,
      clientName: item.clientName,
      totalPrice: item.totalPrice,
      selectedSauces: item.selectedSauces,
      sauces: item.sauces,
      complete_item: item
    });
  });

  // ✅ FUNCIÓN PARA OPTIMIZAR IMAGEN DEL PRODUCTO
  const getOptimizedProductImage = (cartItem, index) => {
    const isDark = theme === 'dark';

    // ✅ Buscar imagen en múltiples ubicaciones posibles
    const imageUrl = cartItem.product_image ||
                     cartItem.image ||
                     cartItem.product?.image;

    // ✅ Buscar nombre en múltiples ubicaciones posibles
    const productName = cartItem.product_name ||
                       cartItem.name ||
                       cartItem.product?.name ||
                       'Producto';

    console.log(`🖼️ Image lookup for item ${index}:`, {
      product_image: cartItem.product_image,
      image: cartItem.image,
      nested_image: cartItem.product?.image,
      final_url: imageUrl,
      product_name: productName
    });

    if (!imageUrl) {
      console.log(`❌ No image found for product ${index}, using placeholder`);
      return generatePlaceholderUrl(productName, 400, isDark);
    }

    console.log(`✅ Using image URL for product ${index}:`, imageUrl);
    return optimizeGoogleDriveImageUrl(imageUrl, 400) ||
           generatePlaceholderUrl(productName, 400, isDark);
  };

  const handleImageError = (productKey, productName, index) => {
    setImageStates(prev => {
      if (prev[productKey]?.errorCount >= 1) {
        console.log(`❌ Product image failed multiple times for ${productName}, stopping retries`);
        return prev;
      }

      const placeholderSrc = generatePlaceholderUrl(productName, 400, theme === 'dark');
      console.log(`❌ Product image failed for ${productName}, using SVG placeholder`);

      if (imageRefs.current[productKey]) {
        imageRefs.current[productKey].src = placeholderSrc;
      }

      return {
        ...prev,
        [productKey]: {
          hasError: true,
          errorCount: (prev[productKey]?.errorCount || 0) + 1
        }
      };
    });
  };

  // ✅ FUNCIÓN PARA MANEJAR CONFIRMACIÓN DEL MODAL
  const handleClientPaymentConfirm = async (modalData) => {
    setShowClientPaymentModal(false);

    try {
      console.log('💾 Saving order with modal data:', {
        clientName: modalData.clientName,
        selectedPaymentMethod: modalData.selectedPaymentMethod,
        cartItemsCount: cart.length,
        cartTotal: cartTotal
      });

      // ✅ PASAR CORRECTAMENTE LOS PARÁMETROS A saveOrder
      await saveOrder(
        modalData.clientName || '',
        modalData.selectedPaymentMethod
      );

      // Cerrar carrito en mobile después de guardar
      if (typeof onCloseCart === 'function' && isMobile) {
        setTimeout(() => onCloseCart(), 1500);
      }

    } catch (error) {
      console.error('❌ Error saving order:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Error al guardar la orden',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
    }
  };

  // ✅ FUNCIÓN PARA CERRAR MODAL
  const handleClientPaymentClose = () => {
    setShowClientPaymentModal(false);
  };

  // ✅ HANDLER PARA GUARDAR ORDEN CON MODAL - ACTUALIZADO
  const handleSaveOrder = async () => {
    // Verificar que hay métodos de pago disponibles
    if (!paymentMethods || paymentMethods.length === 0) {
      await Swal.fire({
        title: 'Error',
        text: 'No hay métodos de pago disponibles',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });
      return;
    }

    // Mostrar modal usando el componente
    setShowClientPaymentModal(true);
  };

  const handleClearCart = async () => {
    if (!hasProducts) return;

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Esto eliminará todos los productos del carrito!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, limpiar carrito',
      cancelButtonText: 'Cancelar',
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#f9fafb' : '#111827'
    });

    if (result.isConfirmed) {
      clearCart();

      await Swal.fire({
        title: '¡Carrito limpiado!',
        text: 'Todos los productos han sido eliminados',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827'
      });

      if (typeof onCloseCart === 'function') {
        setTimeout(() => {
          onCloseCart();
        }, 500);
      }
    }
  };

  const handleRemoveProduct = async (index, productName) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: `¿Quieres quitar "${productName}" del carrito?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#f9fafb' : '#111827'
    });

    if (result.isConfirmed) {
      const product = cart[index];
      if (product) {
        removeFromCart(product.id || product.id_product || index);

        await Swal.fire({
          title: '¡Producto eliminado!',
          text: `${productName} ha sido quitado del carrito`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
      }
    }
  };

  const handleEditProduct = (cartItem, index) => {
    startEditProduct(cartItem);
    console.log('🔄 startEditProduct called with:', cartItem);
  };

  return (
    <>
      <div className={`max-w-2xl mx-auto p-3 sm:p-2 lg:p-4 ${
        theme === 'dark' ? 'text-white' : 'text-black'
      }`}>
        {/* Header con botón de regresar si se necesita */}
        {showBackButton && (
          <div className={`flex items-center gap-4 mb-6 pb-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={onCloseCart}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">Volver a Productos</span>
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Mi Carrito
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Revisa tus productos seleccionados
              </p>
            </div>
          </div>
        )}

        {cart.length === 0 ? (
             <div className="flex-grow flex flex-col items-center justify-center text-center p-4 overflow-hidden">
                  <div className="text-center py-8 lg:py-12">
                    <div className="mb-4 flex justify-center">
                      <div className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32 lg:w-36 lg:h-36'} rounded-full ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                      } flex items-center justify-center mx-auto`}>
                      <ShoppingCartIcon className={`w-16 h-16 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    </div>
                  </div>
                 <p className={`font-semibold text-gray-700 dark:text-gray-400 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} ${isMobile ? 'text-base' : 'text-lg'}`}>
                   Tu carrito está vacío
                 </p>
                 <p className={`mt-1 text-gray-500 dark:text-gray-400 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} mt-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                   Agrega algunos productos para comenzar
                 </p>
                 <img
                     src="/images/maizmicorazon.png"
                     alt="Marca de agua"
                     className="h-250 object-contain opacity-20 -mt-50"
                   />
             </div>
            {isMobile && (
              <button
                onClick={onCloseCart}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                Ver Productos
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Lista de productos */}
            <div className="space-y-4 mb-6">
              {cart.map((cartItem, idx) => {
                // ✅ FIX CRÍTICO: Usar ID único del carrito, NO id_product que puede duplicarse
                const uniqueCartKey = cartItem.id || `cart-${idx}-${Date.now()}`;

                // ✅ BUSCAR NOMBRE EN MÚLTIPLES UBICACIONES
                const productName = cartItem.product_name ||
                                   cartItem.name ||
                                   cartItem.product?.name ||
                                   'Producto sin nombre';

                console.log(`📦 Rendering cart item ${idx}:`, {
                  uniqueCartKey,
                  cartItemId: cartItem.id,
                  idProduct: cartItem.id_product,
                  productName,
                  clientName: cartItem.clientName,
                  hasProductImage: !!cartItem.product_image,
                  hasImage: !!cartItem.image,
                  hasNestedImage: !!cartItem.product?.image
                });

                return (
                  <div key={uniqueCartKey} className={`flex items-start gap-3 lg:gap-4 border-b pb-4 ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    {/* ✅ IMAGEN DEL PRODUCTO CORREGIDA */}
                    <div className="relative flex-shrink-0">
                      <img
                        ref={el => imageRefs.current[uniqueCartKey] = el}
                        src={getOptimizedProductImage(cartItem, idx)}
                        alt={productName}
                        className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-full object-cover border ${
                          theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                        }`}
                        loading="lazy"
                        onError={() => handleImageError(uniqueCartKey, productName, idx)}
                      />

                      {/* Overlay con error de imagen */}
                      {imageStates[uniqueCartKey]?.hasError && (
                        <div className={`absolute inset-0 ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        } rounded-full flex flex-col items-center justify-center`}>
                          <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
                               fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'} mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {productName}
                      </h4>

                      {/* ✅ SECCIÓN DE DETALLES MEJORADA Y ORGANIZADA - INCLUYE CLIENTE */}
                      <div className="space-y-2">

                        {/* ✅ NOMBRE DEL CLIENTE */}
                        {cartItem.clientName && (
                          <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-cyan-400' : 'bg-cyan-500'}`}></div>
                            <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Cliente:
                            </span>
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                              theme === 'dark'
                                ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-700/50'
                                : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                            }`}>
                              👤 {cartItem.clientName}
                            </span>
                          </div>
                        )}

                        {/* Método de Pago */}
                         // No se muestra en el carrito ya que se enviá en ClientPaymentModal

                        {/* Variante/Tamaño */}
                        {(cartItem.variant_name || cartItem.selectedOption?.size) && (
                          <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                            <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Tamaño:
                            </span>
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {cartItem.variant_name || cartItem.selectedOption?.size}
                            </span>
                          </div>
                        )}

                        {/* Sabor */}
                        {(() => {
                          // ✅ BUSCAR SABOR EN MÚLTIPLES UBICACIONES
                          const flavorToShow = cartItem.selectedFlavor?.name ||
                                             cartItem.flavor?.name ||
                                             cartItem.selectedFlavor ||
                                             cartItem.flavor;

                          console.log(`🍋 Flavor lookup for item ${idx}:`, {
                            selectedFlavor: cartItem.selectedFlavor,
                            flavor: cartItem.flavor,
                            flavorToShow
                          });

                          return flavorToShow ? (
                            <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>
                              <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Sabor:
                              </span>
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                theme === 'dark'
                                  ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                                  : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                              }`}>
                                {flavorToShow}
                              </span>
                            </div>
                          ) : null;
                        })()}

                        {/* Extras */}
                        {cartItem.extras && cartItem.extras.length > 0 && (
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-orange-400' : 'bg-orange-500'}`}></div>
                              <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Extras:
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 ml-4">
                              {cartItem.extras.map((extra, extraIdx) => (
                                <span
                                  key={`extra-${extraIdx}`}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                    theme === 'dark'
                                      ? 'bg-orange-900/30 text-orange-300 border border-orange-700/50'
                                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                                  }`}
                                >
                                  <span>{extra.name}</span>
                                  {extra.quantity && extra.quantity > 1 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                                      theme === 'dark'
                                        ? 'bg-orange-700 text-orange-200'
                                        : 'bg-orange-600 text-white'
                                    }`}>
                                      ×{extra.quantity}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Salsas */}
                        {cartItem.sauces && cartItem.sauces.length > 0 && (
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-red-400' : 'bg-red-500'}`}></div>
                              <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Salsas:
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 ml-4">
                              {cartItem.sauces.map((sauce, sauceIdx) => (
                                <span
                                  key={`sauce-${sauceIdx}`}
                                  className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                                    theme === 'dark'
                                      ? 'bg-red-900/30 text-red-300 border border-red-700/50'
                                      : 'bg-red-100 text-red-700 border border-red-200'
                                  }`}
                                >
                                  🌶️ {sauce.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cantidad */}
                        <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                          <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Cantidad:
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            theme === 'dark'
                              ? 'bg-purple-900/30 text-purple-300 border border-purple-700/50'
                              : 'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}>
                            {cartItem.quantity} {cartItem.quantity === 1 ? 'unidad' : 'unidades'}
                          </span>
                        </div>

                        {/* Comentario */}
                        {cartItem.comment && (
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1 ${theme === 'dark' ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                              <div>
                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Comentario:
                                </span>
                                <p className={`mt-1 px-3 py-2 rounded-lg italic ${
                                  theme === 'dark'
                                    ? 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                                }`}>
                                  "{cartItem.comment}"
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 🚨 BOTONES DE ACCIÓN - CRÍTICO */}
                      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          className={`flex items-center gap-1 px-3 py-2 border border-red-500 rounded-lg transition-all duration-200 hover:scale-105 ${
                            theme === 'dark'
                              ? 'hover:bg-red-900/20 text-red-400'
                              : 'hover:bg-red-50 text-red-600'
                          }`}
                          onClick={() => handleRemoveProduct(idx, productName)}
                          title="Eliminar producto"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                            Eliminar
                          </span>
                        </button>

                        {/* 🚨 BOTÓN EDITAR - AQUÍ ESTÁ EL FIX CRÍTICO */}
                        <button
                          className={`flex items-center gap-1 px-3 py-2 border border-blue-500 rounded-lg transition-all duration-200 hover:scale-105 ${
                            theme === 'dark'
                              ? 'hover:bg-blue-900/20 text-blue-400'
                              : 'hover:bg-blue-50 text-blue-600'
                          }`}
                          onClick={() => handleEditProduct(cartItem, idx)}
                          title="Editar producto"
                        >
                          <PencilIcon className="w-4 h-4" />
                          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                            Editar
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="text-right flex-shrink-0">
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-green-600`}>
                        ${(() => {
                          // ✅ CALCULAR PRECIO DINÁMICAMENTE EN CADA RENDER
                          const calculatedPrice = calculateProductPrice(cartItem);
                          console.log(`💰 Price for item ${idx}:`, {
                            cartItemId: cartItem.id,
                            productName: cartItem.product_name || cartItem.name,
                            clientName: cartItem.clientName,
                            totalPrice: cartItem.totalPrice,
                            calculatedPrice,
                            usingCalculated: !cartItem.totalPrice || cartItem.totalPrice === 0
                          });

                          // Usar precio calculado si no hay totalPrice o si es 0
                          const finalPrice = cartItem.totalPrice && cartItem.totalPrice > 0
                            ? cartItem.totalPrice
                            : calculatedPrice;

                          return finalPrice.toFixed(2);
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total y botones */}
            <div className="pt-4">
              <div className={`flex justify-between items-center font-bold ${isMobile ? 'text-lg' : 'text-xl'} mb-4`}>
                <span>Total:</span>
                <span className="text-green-600">${cartTotal.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                {/* ✅ BOTÓN MODIFICADO PARA USAR EL COMPONENTE MODAL */}
                <button
                  className={`w-full bg-green-600 text-white rounded-lg ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} font-semibold hover:bg-green-700 transition-colors`}
                  onClick={handleSaveOrder}
                >
                  Guardar Orden
                </button>

                <button
                  className={`w-full bg-red-600 text-white rounded-lg ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} font-semibold hover:bg-red-700 transition-colors`}
                  onClick={handleClearCart}
                >
                  Limpiar Carrito
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ MODAL DE CLIENTE Y PAGO USANDO EL COMPONENTE */}
      <ClientPaymentModal
        isOpen={showClientPaymentModal}
        onClose={handleClientPaymentClose}
        onConfirm={handleClientPaymentConfirm}
        theme={theme}
        paymentMethods={paymentMethods}
        initialClientName=""
        initialPaymentMethod={null}
        title="🛒 Finalizar Pedido"
        confirmText="✅ Guardar Orden"
        clientRequired={false}
      />
    </>
  );
}

export default Cart;