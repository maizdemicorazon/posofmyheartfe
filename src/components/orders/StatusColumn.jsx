import { ShoppingBagIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';

/**
 * Componente que renderiza una columna para un estado de orden específico (ej. "Recibidas").
 * Muestra un título, un contador de órdenes y la lista de tarjetas de órdenes.
 * Incluye funcionalidad para colapsar/expandir la columna.
 *
 * @param {object} props - Propiedades del componente.
 * @param {string} props.title - El título que se mostrará en la cabecera de la columna.
 * @param {number} props.count - El número total de órdenes en esta columna.
 * @param {Array<object>} props.orders - El array de objetos de orden a renderizar.
 * @param {function(object): JSX.Element} props.renderOrderCard - Función que recibe una orden y retorna el JSX de la tarjeta.
 * @param {string} props.theme - El tema actual ('dark' o 'light').
 * @param {string} props.bgColor - Color de fondo para la cabecera.
 * @param {string} props.textColor - Color de texto para la cabecera.
 * @param {string} props.borderColor - Color del borde izquierdo de la cabecera.
 * @param {string} props.accentColor - Color de acento para elementos destacados.
 * @param {boolean} props.isCollapsed - Si la columna está colapsada o no.
 * @param {function} props.onToggleCollapse - Función para togglear el estado de colapso.
 */
function StatusColumn({
  title,
  count,
  orders,
  renderOrderCard,
  theme,
  bgColor,
  textColor,
  borderColor,
  accentColor,
  isCollapsed,
  onToggleCollapse
}) {
  return (
    <div className={`flex flex-col rounded-xl transition-all duration-300 h-full ${
      theme === 'dark'
        ? 'bg-gray-800/30 border border-gray-700/30'
        : 'bg-white border border-gray-200/60 shadow-sm'
    }`}>

      {/* --- Cabecera de la Columna (Mejorada con mejor contraste) --- */}
      <div
        className={`p-4 rounded-t-xl sticky top-0 z-10 cursor-pointer transition-all duration-200 ${
          theme === 'dark'
            ? 'hover:bg-gray-700/20 border-b border-gray-700/30'
            : 'hover:bg-gray-50/80 border-b border-gray-200/60'
        }`}
        style={{ backgroundColor: bgColor }}
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expandir columna' : 'Colapsar columna'}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icono de colapso/expansión con mejor visibilidad */}
            <div className={`flex-shrink-0 p-1 rounded-lg transition-all duration-200 ${
              theme === 'dark' ? 'hover:bg-gray-600/20' : 'hover:bg-gray-100/60'
            }`}>
              {isCollapsed ? (
                <ChevronRightIcon
                  className="w-5 h-5 transition-transform duration-200"
                  style={{ color: textColor }}
                />
              ) : (
                <ChevronDownIcon
                  className="w-5 h-5 transition-transform duration-200"
                  style={{ color: textColor }}
                />
              )}
            </div>

            {/* Indicador de borde sutil pero visible */}
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: borderColor }}
            />

            {/* Título con mejor tipografía */}
            <h2
              className={`font-bold transition-all duration-300 ${
                isCollapsed ? 'text-base' : 'text-lg'
              }`}
              style={{ color: textColor }}
            >
              {isCollapsed ? title.split(' ')[1] || title : title}
            </h2>
          </div>

          {/* Contador con mejor diseño */}
          <div className="flex items-center gap-2">
            {count > 0 && (
              <div
                className={`inline-flex items-center justify-center min-w-[2rem] h-8 px-3 rounded-full font-bold transition-all duration-300 ${
                  isCollapsed ? 'text-sm' : 'text-base'
                }`}
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: accentColor,
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
                }}
              >
                {count}
              </div>
            )}
          </div>
        </div>

        {/* Indicador visual mejorado cuando está colapsado */}
        {isCollapsed && count > 0 && (
          <div className="mt-3 flex items-center justify-center">
            <div className="flex space-x-1">
              {[...Array(Math.min(count, 4))].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: accentColor,
                    opacity: 0.7
                  }}
                />
              ))}
              {count > 4 && (
                <span
                  className="text-xs ml-2 font-medium"
                  style={{ color: textColor }}
                >
                  +{count - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Contenedor de Órdenes (Scrollable con animación mejorada) --- */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-full opacity-100'
      }`}>
        <div className="p-3 space-y-3 flex-grow overflow-y-auto">
          {orders.length > 0 ? (
            orders.map(order => renderOrderCard(order))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: `2px dashed ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
                }}
              >
                <ShoppingBagIcon
                  className="w-8 h-8"
                  style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                />
              </div>
              <p className={`font-medium text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No hay órdenes en esta sección
              </p>
              <p className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                Las nuevas órdenes aparecerán aquí
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Definición de PropTypes para validación y claridad
StatusColumn.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  orders: PropTypes.array.isRequired,
  renderOrderCard: PropTypes.func.isRequired,
  theme: PropTypes.oneOf(['dark', 'light']).isRequired,
  bgColor: PropTypes.string.isRequired,
  textColor: PropTypes.string.isRequired,
  borderColor: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
};

export default StatusColumn;