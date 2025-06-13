import { useCart } from '../../context/CartContext';
import { PencilIcon, TrashIcon, ArrowLeftIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

function Cart({ onCloseCart, isMobile = false, showBackButton = false }) {
  const { cart, removeFromCart, startEditProduct, saveOrder, clearCart, calculateProductPrice, cartTotal } = useCart();
  const hasProducts = cart && cart.length > 0;

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
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      clearCart();

      await Swal.fire({
        title: '¡Carrito limpiado!',
        text: 'Todos los productos han sido eliminados',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
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
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      removeFromCart(index);

      await Swal.fire({
        title: '¡Producto eliminado!',
        text: `${productName} ha sido quitado del carrito`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  return (
    <div className={`${isMobile ? 'p-3' : 'max-w-2xl mx-auto p-2 lg:p-4'} text-black`}>
      {/* Header con botón de regresar si se necesita */}
      {showBackButton && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
          <button
            onClick={onCloseCart}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">Volver a Productos</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Carrito</h1>
            <p className="text-gray-600">Revisa tus productos seleccionados</p>
          </div>
        </div>
      )}

      {cart.length === 0 ? (
        <div className="text-center py-8 lg:py-12">
          <div className="mb-4 flex justify-center">
            <div className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32 lg:w-36 lg:h-36'} rounded-full bg-gray-100 flex items-center justify-center mx-auto`}>
              <ShoppingCartIcon className="w-16 h-16 text-gray-400" />
            </div>
          </div>
          <p className={`text-gray-500 ${isMobile ? 'text-base' : 'text-lg'}`}>Tu carrito está vacío</p>
          <p className={`text-gray-400 mt-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>Agrega algunos productos para comenzar</p>

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
            {cart.map((product, idx) => (
              <div key={product.id || idx} className="flex items-start gap-3 lg:gap-4 border-b pb-4">
                <img
                  src={product.image || 'https://via.placeholder.com/64'}
                  alt="product"
                  className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-full object-cover border flex-shrink-0`}
                />

                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>{product.name}</h4>

                  {/* Opciones seleccionadas */}
                  {product.options && product.options.length > 0 && product.options[0] && (
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                      <span className="font-medium">Tamaño:</span> {product.options[0].size} (+${product.options[0].price})
                    </p>
                  )}

                  {product.flavors && product.flavors.length > 0 && product.flavors[0] && (
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                      <span className="font-medium">Sabor:</span> {product.flavors[0].name}
                    </p>
                  )}

                  {/* Extras */}
                  {product.extras && product.extras.length > 0 && (
                    <div className="mt-1">
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Extras:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.extras.map((extra, i) => (
                          <span
                            key={i}
                            className={`inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs`}
                          >
                            {extra.name} +${extra.price} x{extra.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salsas */}
                  {product.sauces && product.sauces.length > 0 && (
                    <div className="mt-1">
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Salsas:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.sauces.map((sauce, i) => (
                          <span
                            key={i}
                            className={`inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs`}
                          >
                            {sauce.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                    <span className="font-medium">Cantidad:</span> {product.quantity}
                  </p>

                  {product.comment && (
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 italic mt-1`}>
                      "{product.comment}"
                    </p>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-2 mt-2">
                    <button
                      className="p-2 border border-red-500 rounded hover:bg-red-50 transition-colors"
                      onClick={() => handleRemoveProduct(idx, product.name)}
                      title="Eliminar producto"
                    >
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      className="p-2 border border-blue-500 rounded hover:bg-blue-50 transition-colors"
                      onClick={() => startEditProduct(idx)}
                      title="Editar producto"
                    >
                      <PencilIcon className="w-4 h-4 text-blue-500" />
                    </button>
                  </div>
                </div>

                {/* Precio */}
                <div className="text-right flex-shrink-0">
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-green-600`}>
                    ${calculateProductPrice(product).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Total y botones */}
          <div className="border-t pt-4">
            <div className={`flex justify-between items-center font-bold ${isMobile ? 'text-lg' : 'text-xl'} mb-4`}>
              <span>Total:</span>
              <span className="text-green-600">${cartTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-3">
              <button
                className={`w-full bg-green-600 text-white rounded-lg ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} font-semibold hover:bg-green-700 transition-colors`}
                onClick={() => {
                  saveOrder();
                  if (typeof onCloseCart === 'function' && isMobile) {
                    setTimeout(() => onCloseCart(), 1500);
                  }
                }}
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
  );
}

export default Cart;