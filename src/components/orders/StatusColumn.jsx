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
  isCollapsed,
  onToggleCollapse
}) {
  return (
    <div className={`flex flex-col rounded-xl shadow-md transition-all duration-300 h-full ${
      theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100/50'
    }`}>

      {/* --- Cabecera de la Columna (Sticky y Clickeable) --- */}
      <div
        className="p-3 rounded-t-lg sticky top-0 z-10 cursor-pointer hover:shadow-lg transition-all duration-200"
        style={{ backgroundColor: bgColor }}
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expandir columna' : 'Colapsar columna'}
      >
        <div className="flex items-center justify-between" style={{
          color: textColor,
          borderLeft: `5px solid ${borderColor}`,
          paddingLeft: '12px'
        }}>
          <div className="flex items-center gap-3">
            {/* Icono de colapso/expansión */}
            <div className="flex-shrink-0">
              {isCollapsed ? (
                <ChevronRightIcon className="w-6 h-6 transition-transform duration-200" />
              ) : (
                <ChevronDownIcon className="w-6 h-6 transition-transform duration-200" />
              )}
            </div>

            {/* Título */}
            <h2 className={`font-black transition-all duration-300 ${
              isCollapsed ? 'text-lg' : 'text-xl'
            }`}>
              {isCollapsed ? title.split(' ')[0] : title}
            </h2>
          </div>

          {/* Contador */}
          <span className={`font-bold px-3 py-1 rounded-full transition-all duration-300 ${
            isCollapsed ? 'text-sm' : 'text-lg'
          }`} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {count}
          </span>
        </div>

        {/* Indicador visual adicional cuando está colapsado */}
        {isCollapsed && count > 0 && (
          <div className="mt-2 flex items-center justify-center">
            <div className="flex space-x-1">
              {[...Array(Math.min(count, 5))].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full opacity-60"
                  style={{ backgroundColor: textColor }}
                />
              ))}
              {count > 5 && (
                <span className="text-xs ml-1" style={{ color: textColor }}>
                  +{count - 5}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Contenedor de Órdenes (Scrollable con animación de colapso) --- */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-full opacity-100'
      }`}>
        <div className="p-4 space-y-4 flex-grow overflow-y-auto">
          {orders.length > 0 ? (
            orders.map(order => renderOrderCard(order))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4">
              <ShoppingBagIcon className={`w-12 h-12 mx-auto mb-2 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={`font-medium ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
              }`}>
                No hay órdenes en esta sección
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