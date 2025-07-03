import { useEffect, useRef } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ShoppingBagIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

/**
 * Modal para confirmar eliminación de orden completa cuando es el último producto
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función llamada al cerrar sin confirmar
 * @param {Function} props.onConfirm - Función llamada al confirmar eliminación de orden
 * @param {string} props.theme - Tema actual ('dark' | 'light')
 * @param {Object} props.order - Orden que se eliminará completamente
 * @param {Object} props.item - Último producto que se eliminará
 * @param {string} props.title - Título personalizado (opcional)
 * @param {string} props.confirmText - Texto del botón confirmar (opcional)
 * @param {string} props.warningText - Texto de advertencia (opcional)
 */
function DeleteOrderConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  theme = 'light',
  order,
  item,
  title = null,
  confirmText = null,
  warningText = '⚠️ Esta acción eliminará la orden completa y no se puede deshacer'
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

    // ✅ FOCUS EN EL BOTÓN CANCELAR AL ABRIR (más seguro)
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

  if (!isOpen || !order || !item) return null;

  // ✅ CONSTRUIR TEXTOS DINÁMICOS
  const modalTitle = title || `¿Eliminar orden completa #${order.id_order}?`;
  const buttonText = confirmText || 'Eliminar orden completa';

  return (
    <>
      {/* ✅ BACKDROP CON ANIMACIÓN */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" />
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

          {/* ✅ HEADER DEL MODAL - DISEÑO ESPECIAL PARA ADVERTENCIA CRÍTICA */}
          <div className={`flex items-center justify-between p-6 border-b bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-xl`}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-800/30 rounded-full border-2 border-red-300">
                <ExclamationTriangleIcon className="w-7 h-7 text-red-100" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {modalTitle}
                </h3>
                <p className="text-red-100 text-sm">
                  Acción crítica e irreversible
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors text-red-100 hover:text-white hover:bg-red-800/50"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* ✅ CONTENIDO DEL MODAL */}
          <div className="p-6 space-y-6">

            {/* ✅ EXPLICACIÓN CLARA DEL PROBLEMA */}
            <div className={`p-4 rounded-lg border-l-4 border-orange-500 ${
              theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-50'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className={`font-bold text-lg mb-2 ${
                    theme === 'dark' ? 'text-orange-200' : 'text-orange-800'
                  }`}>
                    Este es el último producto de la orden
                  </h4>
                  <p className={`text-base leading-relaxed ${
                    theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                  }`}>
                    Al eliminar <strong>"{item.product_name}"</strong>, la orden quedará vacía.
                    Por política del sistema, las órdenes vacías se eliminan automáticamente.
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ RESUMEN DE LA ORDEN A ELIMINAR */}
            <div className={`p-5 rounded-lg border-2 ${
              theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h4 className={`font-bold text-lg mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
                Resumen de la orden a eliminar
              </h4>

              <div className="space-y-3">
                {/* ID de la orden */}
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📋 Número de orden:
                  </span>
                  <span className={`px-3 py-1 rounded-full font-bold text-lg ${
                    theme === 'dark'
                      ? 'bg-blue-900/50 text-blue-200'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    #{order.id_order}
                  </span>
                </div>

                {/* Cliente */}
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    👤 Cliente:
                  </span>
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    theme === 'dark'
                      ? 'bg-purple-900/50 text-purple-200'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {order.client_name || 'Sin nombre'}
                  </span>
                </div>

                {/* Método de pago */}
                {order.payment_name && (
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      💳 Método de pago:
                    </span>
                    <span className={`px-3 py-1 rounded-full font-medium ${
                      theme === 'dark'
                        ? 'bg-green-900/50 text-green-200'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.payment_name}
                    </span>
                  </div>
                )}

                {/* Fecha */}
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📅 Fecha:
                  </span>
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    theme === 'dark'
                      ? 'bg-yellow-900/50 text-yellow-200'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {new Date(order.order_date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ DETALLES DEL ÚLTIMO PRODUCTO */}
            <div className={`p-5 rounded-lg border-2 border-red-300 ${
              theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
            }`}>
              <h4 className={`font-bold text-lg mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-red-200' : 'text-red-800'
              }`}>
                <TrashIcon className="w-6 h-6 text-red-600" />
                Último producto a eliminar
              </h4>

              <div className="flex items-start gap-4">
                {/* Imagen del producto si existe */}
                {item.product_image && (
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-red-300 dark:border-red-600 flex-shrink-0"
                    loading="lazy"
                  />
                )}

                <div className="flex-1">
                  <h5 className={`font-bold text-lg mb-2 ${
                    theme === 'dark' ? 'text-red-200' : 'text-red-800'
                  }`}>
                    {item.product_name}
                  </h5>

                  <div className="space-y-2">
                    {/* Cantidad */}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-red-300' : 'text-red-700'
                      }`}>
                        Cantidad:
                      </span>
                      <span className={`px-2 py-1 rounded text-sm font-bold ${
                        theme === 'dark'
                          ? 'bg-red-800/50 text-red-200'
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {item.quantity || 1} {(item.quantity || 1) === 1 ? 'unidad' : 'unidades'}
                      </span>
                    </div>

                    {/* Variante si existe */}
                    {item.variant_name && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-red-300' : 'text-red-700'
                        }`}>
                          Tamaño:
                        </span>
                        <span className={`px-2 py-1 rounded text-sm font-bold ${
                          theme === 'dark'
                            ? 'bg-red-800/50 text-red-200'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {item.variant_name}
                        </span>
                      </div>
                    )}

                    {/* Sabor si existe */}
                    {item.flavor && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-red-300' : 'text-red-700'
                        }`}>
                          Sabor:
                        </span>
                        <span className={`px-2 py-1 rounded text-sm font-bold ${
                          theme === 'dark'
                            ? 'bg-red-800/50 text-red-200'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {item.flavor.name || item.flavor}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ LISTA DE LO QUE SE ELIMINARÁ */}
            <div className={`p-5 rounded-lg border-2 border-red-500 ${
              theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
            }`}>
              <h4 className={`font-bold text-lg mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-red-200' : 'text-red-800'
              }`}>
                <DocumentTextIcon className="w-6 h-6 text-red-600" />
                Se eliminará permanentemente:
              </h4>

              <ul className="space-y-2">
                <li className={`flex items-center gap-3 text-base ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-700'
                }`}>
                  <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></span>
                  <span>El producto: <strong>"{item.product_name}"</strong></span>
                </li>
                <li className={`flex items-center gap-3 text-base ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-700'
                }`}>
                  <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></span>
                  <span>La orden completa <strong>#{order.id_order}</strong></span>
                </li>
                <li className={`flex items-center gap-3 text-base ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-700'
                }`}>
                  <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></span>
                  <span>Todos los datos asociados (cliente, pago, fecha)</span>
                </li>
                <li className={`flex items-center gap-3 text-base ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-700'
                }`}>
                  <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></span>
                  <span>El registro completo del sistema</span>
                </li>
              </ul>
            </div>

            {/* ✅ ADVERTENCIA FINAL */}
            <div className={`text-center p-4 rounded-lg border-2 ${
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
            theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
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

            {/* Botón Confirmar - DISEÑO CRÍTICO */}
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 border-2 border-red-500"
            >
              🗑️ {buttonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default DeleteOrderConfirmationModal;