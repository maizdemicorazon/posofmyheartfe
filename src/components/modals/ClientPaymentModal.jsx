import { useEffect } from 'react';
import Swal from 'sweetalert2';
import { PAYMENT_METHODS } from '../../utils/constants';

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

  useEffect(() => {
    if (!isOpen) return;

    const showModal = async () => {
      // Validar que existan métodos de pago
      if (!paymentMethods || paymentMethods.length === 0) {
        await Swal.fire({
          title: 'Error',
          text: 'No hay métodos de pago disponibles',
          icon: 'error',
          confirmButtonText: 'Entendido',
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
        onClose();
        return;
      }

      // Variable para almacenar la selección
      let selectedPaymentMethodId = initialPaymentMethod || null;

      // HTML personalizado para el modal
      const modalHtml = `
        <div class="space-y-6">
          <!-- Sección de Cliente -->
          <div>
            <label class="block text-sm font-semibold mb-3 text-left ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}">
              👤 Nombre del Cliente ${clientRequired ? '<span class="text-red-500">*</span>' : '(Opcional)'}
            </label>
            <input
              id="swal-client-name"
              type="text"
              placeholder="Ej: Juan Pérez"
              value="${initialClientName || ''}"
              class="w-full px-4 py-3 rounded-lg border text-center ${theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'}
                focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div id="client-error" class="text-red-500 text-sm mt-2 hidden">
              El nombre del cliente es requerido
            </div>
          </div>

          <!-- Sección de Métodos de Pago -->
          <div>
            <label class="block text-sm font-semibold mb-3 text-left ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}">
              💳 Método de Pago <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" id="payment-methods-grid">
              ${paymentMethods.map(method => `
                <button
                  type="button"
                  data-payment-id="${method.id_payment_method}"
                  class="payment-method-btn relative flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all min-h-[4rem] ${
                    (initialPaymentMethod && initialPaymentMethod == method.id_payment_method)
                      ? `border-green-500 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'}`
                      : `border-gray-300 ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500 active:bg-gray-700' : 'hover:border-gray-400 active:bg-gray-50'}`
                  }"
                >
                  <div class="payment-icon w-8 h-8 rounded-lg flex items-center justify-center ${
                    (initialPaymentMethod && initialPaymentMethod == method.id_payment_method)
                      ? 'bg-green-500 text-white'
                      : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                  }">
                    ${getPaymentMethodIcon(method.name)}
                  </div>
                  <div class="text-center">
                    <div class="font-medium text-xs leading-tight">${method.name}</div>
                  </div>
                  <div class="payment-check absolute -top-1 -right-1 ${
                    (initialPaymentMethod && initialPaymentMethod == method.id_payment_method) ? '' : 'hidden'
                  }">
                    <div class="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <span class="text-xs">✓</span>
                    </div>
                  </div>
                </button>
              `).join('')}
            </div>
            <div id="payment-error" class="text-red-500 text-sm mt-2 hidden">
              Selecciona un método de pago
            </div>
          </div>
        </div>
      `;

      const result = await Swal.fire({
        title,
        html: modalHtml,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: '❌ Cancelar',
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f9fafb' : '#111827',
        customClass: {
          confirmButton: `px-6 py-3 ${theme === 'dark'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg font-medium transition-colors`,
          cancelButton: `px-6 py-3 ${theme === 'dark'
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-lg font-medium transition-colors mr-3`,
          popup: 'max-w-md sm:max-w-lg'
        },
        buttonsStyling: false,
        allowOutsideClick: false,
        allowEscapeKey: true,
        didOpen: () => {
          setupModalInteractions();
        },
        preConfirm: () => {
          return validateAndGetData();
        }
      });

      // Manejar resultado
      if (result.isConfirmed && result.value) {
        onConfirm(result.value);
      } else {
        onClose();
      }

      // ✅ FUNCIÓN PARA CONFIGURAR INTERACCIONES DEL MODAL
      function setupModalInteractions() {
        const paymentButtons = document.querySelectorAll('.payment-method-btn');
        const paymentError = document.getElementById('payment-error');

        function selectPaymentMethod(button, paymentId) {
          // Deseleccionar todos
          paymentButtons.forEach(btn => {
            btn.classList.remove('border-green-500');
            btn.classList.add('border-gray-300');
            if (theme === 'dark') {
              btn.classList.add('border-gray-600');
              btn.classList.remove('bg-green-900/30');
            } else {
              btn.classList.remove('bg-green-50');
            }
            const icon = btn.querySelector('.payment-icon');
            const check = btn.querySelector('.payment-check');
            icon.classList.remove('bg-green-500', 'text-white');
            icon.classList.add(theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200');
            check.classList.add('hidden');
          });

          // Seleccionar actual
          button.classList.remove('border-gray-300');
          if (theme === 'dark') {
            button.classList.remove('border-gray-600');
            button.classList.add('bg-green-900/30');
          } else {
            button.classList.add('bg-green-50');
          }
          button.classList.add('border-green-500');
          const icon = button.querySelector('.payment-icon');
          const check = button.querySelector('.payment-check');
          icon.classList.remove(theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200');
          icon.classList.add('bg-green-500', 'text-white');
          check.classList.remove('hidden');

          selectedPaymentMethodId = parseInt(paymentId);
          paymentError.classList.add('hidden');

          console.log('✅ Payment method selected:', selectedPaymentMethodId);
        }

        // Configurar listeners
        paymentButtons.forEach(button => {
          button.addEventListener('click', () => {
            const paymentId = button.getAttribute('data-payment-id');
            selectPaymentMethod(button, paymentId);
          });
        });

        console.log('🔧 Modal opened with initial payment method:', selectedPaymentMethodId);
      }

      // ✅ FUNCIÓN PARA VALIDAR Y OBTENER DATOS
      function validateAndGetData() {
        const clientName = document.getElementById('swal-client-name').value.trim();
        const paymentError = document.getElementById('payment-error');
        const clientError = document.getElementById('client-error');

        let hasErrors = false;

        // Validar cliente si es requerido
        if (clientRequired && !clientName) {
          clientError.classList.remove('hidden');
          hasErrors = true;
        } else {
          clientError.classList.add('hidden');
        }

        // Validar método de pago (siempre requerido)
        if (!selectedPaymentMethodId) {
          paymentError.classList.remove('hidden');
          hasErrors = true;
        } else {
          paymentError.classList.add('hidden');
        }

        if (hasErrors) {
          console.log('❌ Validation failed');
          return false;
        }

        console.log('✅ Validation passed, returning:', {
          clientName,
          selectedPaymentMethod: selectedPaymentMethodId
        });

        return {
          clientName,
          selectedPaymentMethod: selectedPaymentMethodId
        };
      }
    };

    showModal();
  }, [isOpen, paymentMethods, initialClientName, initialPaymentMethod, theme, title, confirmText, clientRequired, onClose, onConfirm]);

  // Este componente no renderiza nada visualmente, usa SweetAlert2
  return null;
}

// ✅ FUNCIÓN HELPER PARA ICONOS DE MÉTODOS DE PAGO
function getPaymentMethodIcon(methodName) {
  const name = methodName.toLowerCase();
  if (name.includes('efectivo')) return '💵';
  if (name.includes('tarjeta')) return '💳';
  if (name.includes('clabe') || name.includes('transfer')) return '🏦';
  if (name.includes('qr')) return '📱';
  if (name.includes('link')) return '🔗';
  return '💵'; // Fallback
}

export default ClientPaymentModal;