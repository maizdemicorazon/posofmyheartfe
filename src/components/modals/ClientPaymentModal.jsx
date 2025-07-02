import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getPaymentMethodIcon } from '../../utils/helpers';

/**
 * Modal reutilizable para capturar cliente y método de pago
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función llamada al cerrar sin confirmar
 * @param {Function} props.onConfirm - Función llamada al confirmar con datos
 * @param {string} props.theme - Tema actual ('dark' | 'light')
 * @param {Array} props.paymentMethods - Array de métodos de pago disponibles
 * @param {string} props.initialClientName - Nombre inicial del cliente
 * @param {number} props.initialPaymentMethod - ID del método de pago inicial
 * @param {string} props.title - Título del modal (opcional)
 * @param {string} props.confirmText - Texto del botón confirmar (opcional)
 * @param {boolean} props.clientRequired - Si el cliente es requerido (opcional)
 */
function ClientPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  theme = 'light',
  paymentMethods = [],
  initialClientName = '',
  initialPaymentMethod = null,
  title = '🛒 Finalizar Pedido',
  confirmText = '✅ Continuar',
  clientRequired = false
}) {
  // ✅ Estados del modal
  const [clientName, setClientName] = useState(initialClientName);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(initialPaymentMethod);
  const [errors, setErrors] = useState({
    client: false,
    payment: false
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // ✅ Efectos
  useEffect(() => {
    if (isOpen) {
      setClientName(initialClientName);
      setSelectedPaymentMethod(initialPaymentMethod);
      setErrors({ client: false, payment: false });
      setIsAnimating(true);

      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      // Restaurar scroll del body
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialClientName, initialPaymentMethod]);

  // ✅ Funciones de manejo
  const handleClientNameChange = (e) => {
    setClientName(e.target.value);
    if (errors.client) {
      setErrors(prev => ({ ...prev, client: false }));
    }
  };

  const handlePaymentMethodSelect = (paymentId) => {
    setSelectedPaymentMethod(paymentId);
    if (errors.payment) {
      setErrors(prev => ({ ...prev, payment: false }));
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    const newErrors = {
      client: clientRequired && !clientName.trim(),
      payment: !selectedPaymentMethod
    };

    setErrors(newErrors);

    if (!newErrors.client && !newErrors.payment) {
      onConfirm({
        clientName: clientName.trim(),
        selectedPaymentMethod: selectedPaymentMethod
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* ✨ OVERLAY */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        } ${
          theme === 'dark'
            ? 'bg-black/70 backdrop-blur-sm'
            : 'bg-black/50 backdrop-blur-sm'
        }`}
        onClick={handleClose}
      />

      {/* ✨ MODAL */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 transform ${
        isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
      } ${
        theme === 'dark'
          ? 'bg-gray-800 shadow-2xl shadow-black/50'
          : 'bg-white shadow-2xl shadow-gray-900/20'
      } rounded-3xl`}>

        {/* ✨ HEADER */}
        <div className={`relative px-8 py-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold text-center ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {title}
          </h2>

          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* ✨ CONTENIDO */}
        <div className="px-8 py-8 space-y-8">

          {/* ✨ SECCIÓN DE CLIENTE */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                  : 'bg-gradient-to-br from-cyan-100 to-blue-100 border border-cyan-200'
              }`}>
                <span className="text-lg">👤</span>
              </div>
              <div>
                <label className={`block text-base font-bold ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  Información del Cliente
                </label>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {clientRequired ? 'Requerido para continuar' : 'Opcional - mejora el servicio'}
                </p>
              </div>
            </div>

            <div className="relative group">
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={clientName}
                onChange={handleClientNameChange}
                className={`w-full px-6 py-4 rounded-2xl border-2 text-center font-medium transition-all duration-300 ${
                  errors.client
                    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'
                    : theme === 'dark'
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:bg-gray-750 focus:shadow-lg focus:shadow-cyan-400/20 group-hover:border-cyan-300'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-cyan-500 focus:bg-cyan-50/50 focus:shadow-lg focus:shadow-cyan-500/20 group-hover:border-cyan-300'
                } focus:outline-none focus:ring-4 focus:ring-cyan-500/20`}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>

            {errors.client && (
              <div className="text-red-500 text-sm mt-3 ml-2 flex items-center gap-2 animate-pulse">
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">!</span>
                El nombre del cliente es requerido
              </div>
            )}
          </div>

          {/* ✨ SECCIÓN DE MÉTODOS DE PAGO */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30'
                  : 'bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200'
              }`}>
                <span className="text-lg">💳</span>
              </div>
              <div>
                <label className={`block text-base font-bold ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  Método de Pago
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Selecciona cómo procesaremos el pago
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map(method => {
                const isSelected = selectedPaymentMethod === method.id_payment_method;

                return (
                  <button
                    key={method.id_payment_method}
                    type="button"
                    onClick={() => handlePaymentMethodSelect(method.id_payment_method)}
                    className={`group relative flex flex-col items-center gap-3 p-5 border-2 rounded-2xl transition-all duration-300 min-h-[6rem] transform hover:scale-105 hover:shadow-lg ${
                      isSelected
                        ? `border-green-500 shadow-lg shadow-green-500/20 ${
                            theme === 'dark'
                              ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/40'
                              : 'bg-gradient-to-br from-green-50 to-emerald-50'
                          }`
                        : `border-gray-300 hover:border-gray-400 ${
                            theme === 'dark'
                              ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 hover:shadow-gray-700/30'
                              : 'hover:bg-gray-50/80 hover:shadow-gray-300/30'
                          }`
                    } ${errors.payment ? 'animate-pulse' : ''}`}
                  >
                    {/* Ícono con gradiente */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 text-xl ${
                      isSelected
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                        : theme === 'dark'
                          ? 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-300 group-hover:from-gray-500 group-hover:to-gray-600'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 group-hover:from-gray-300 group-hover:to-gray-400'
                    }`}>
                      {getPaymentMethodIcon(method.name)}
                    </div>

                    {/* Texto del método */}
                    <div className="text-center flex-1">
                      <div className={`font-bold text-sm leading-tight group-hover:text-current ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        {method.name}
                      </div>
                    </div>

                    {/* Check animado */}
                    <div className={`absolute -top-2 -right-2 transform transition-all duration-300 ${
                      isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}>
                      <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-pulse">
                        <span className="text-sm font-bold">✓</span>
                      </div>
                    </div>

                    {/* Efecto de hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </button>
                );
              })}
            </div>

            {errors.payment && (
              <div className="text-red-500 text-sm mt-4 ml-2 flex items-center gap-2 animate-pulse">
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">!</span>
                Selecciona un método de pago para continuar
              </div>
            )}
          </div>
        </div>

        {/* ✨ FOOTER CON BOTONES */}
        <div className={`px-8 py-6 border-t flex gap-4 justify-end ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={handleClose}
            className={`px-8 py-4 text-base font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-gray-600/30 hover:shadow-gray-700/40'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-gray-500/30 hover:shadow-gray-600/40'
            }`}
          >
            ❌ Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className={`px-8 py-4 text-base font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-600/30 hover:shadow-blue-700/40'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-600/40'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientPaymentModal;