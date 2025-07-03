import { useEffect, useRef } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { formatPrice } from '../../utils/helpers';

/**
 * Modal reutilizable para confirmar eliminación de productos de orden
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función llamada al cerrar sin confirmar
 * @param {Function} props.onConfirm - Función llamada al confirmar eliminación
 * @param {string} props.theme - Tema actual ('dark' | 'light')
 * @param {Object} props.item - Item de la orden a eliminar
 * @param {Function} props.calculateItemPrice - Función para calcular precio del item
 * @param {string} props.title - Título personalizado (opcional)
 * @param {string} props.confirmText - Texto del botón confirmar (opcional)
 * @param {string} props.warningText - Texto de advertencia (opcional)
 * @param {boolean} props.showDetails - Mostrar detalles del producto (opcional)
 */
function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  theme = 'light',
  item,
  calculateItemPrice,
  title = null,
  confirmText = null,
  warningText = '⚠️ Esta acción no se puede deshacer',
  showDetails = true
}) {

  const modalRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // ✅ MANEJAR ESC Y CLICK FUERA DEL MODAL
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    // ✅ FOCUS EN EL BOTÓN CANCELAR AL ABRIR
    setTimeout(() => {
      const cancelButton = document.querySelector('[data-cancel-button]');
      if (cancelButton) {
        cancelButton.focus();
      }
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ✅ PREVENIR SCROLL DEL BODY CUANDO EL MODAL ESTÁ ABIERTO
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  // ✅ CONSTRUIR TEXTOS DINÁMICOS
  const modalTitle = title || `¿Eliminar ${item.product_name}?`;
  const buttonText = confirmText || 'Eliminar producto';

  // ✅ CALCULAR PRECIO TOTAL
  const totalPrice = calculateItemPrice
    ? calculateItemPrice(item)
    : parseFloat(item.product_price || 0) * parseInt(item.quantity || 1);

  return (
    <>
      {/* ✅ BACKDROP CON ANIMACIÓN */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      </div>

      {/* ✅ MODAL CONTAINER */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div
          ref={modalRef}
          className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border transform transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          } ${isOpen ? 'translate-y-0' : 'translate-y-4'}`}
        >

          {/* ✅ HEADER DEL MODAL */}
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              }`}>
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className={`text-center text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {modalTitle}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ✅ CONTENIDO DEL MODAL */}
          <div className="p-6 space-y-6">
            {/* ✅ DETALLES DEL PRODUCTO */}
            {showDetails && (
              <div className={`p-4 rounded-lg border-l-4 border-red-500 shadow-sm ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-red-50'
              }`}>

                {/* Nombre del producto */}
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingBagIcon className="w-6 h-6 text-red-600" />
                  <h4 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.product_name || 'Producto sin nombre'}
                  </h4>
                </div>

                {/* Detalles organizados */}
                <div className="space-y-3">

                  {/* Cantidad */}
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📊 Cantidad:
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      theme === 'dark'
                        ? 'bg-blue-900/50 text-blue-200'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.quantity || 1} {(item.quantity || 1) === 1 ? 'unidad' : 'unidades'}
                    </span>
                  </div>

                  {/* Variante/Tamaño */}
                  {item.variant_name && (
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        📏 Tamaño:
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        theme === 'dark'
                          ? 'bg-purple-900/50 text-purple-200'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.variant_name}
                      </span>
                    </div>
                  )}

                  {/* Sabor */}
                  {item.flavor && (
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        🍋 Sabor:
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        theme === 'dark'
                          ? 'bg-yellow-900/50 text-yellow-200'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.flavor.name || item.flavor}
                      </span>
                    </div>
                  )}

                  {/* Extras */}
                  {item.extras && item.extras.length > 0 && (
                    <div>
                      <span className={`font-medium block mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        ➕ Extras:
                      </span>
                      <div className="space-y-2 ml-4">
                        {item.extras.map((extra, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 rounded ${
                              theme === 'dark' ? 'bg-gray-600/50' : 'bg-gray-100'
                            }`}
                          >
                            <span className={`font-medium ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                            }`}>
                              {extra.name}
                              {extra.quantity > 1 && (
                                <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded-full">
                                  x{extra.quantity}
                                </span>
                              )}
                            </span>
                            <span className="text-sm font-bold text-green-600">
                              ${((extra.actual_price || extra.price || 0) * (extra.quantity || 1)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salsas */}
                  {item.sauces && item.sauces.length > 0 && (
                    <div>
                      <span className={`font-medium block mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        🌶️ Salsas:
                      </span>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {item.sauces.map((sauce, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              theme === 'dark'
                                ? 'bg-red-900/50 text-red-200'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {sauce.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comentario */}
                  {item.comment && (
                    <div>
                      <span className={`font-medium block mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        💬 Comentario:
                      </span>
                      <div className={`ml-4 p-3 rounded italic ${
                        theme === 'dark' ? 'bg-gray-600/50' : 'bg-gray-100'
                      }`}>
                        <p className={`${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          "{item.comment}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Precio total */}
                <div className={`mt-4 pt-3 border-t ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-lg ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      💰 Precio Total:
                    </span>
                    <span className="font-black text-xl text-red-600">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ ADVERTENCIA */}
            <div className={`text-center p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-800 text-red-400'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <p className="font-bold text-lg">
                {warningText}
              </p>
            </div>
          </div>

          {/* ✅ FOOTER CON BOTONES */}
          <div className={`flex items-center justify-end gap-3 p-6 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>

            {/* Botón Cancelar */}
            <button
              data-cancel-button
              onClick={onClose}
              className={`px-6 py-3 rounded-lg font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              ❌ Cancelar
            </button>

            {/* Botón Confirmar */}
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              🗑️ {buttonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default DeleteConfirmationModal;