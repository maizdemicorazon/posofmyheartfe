// src/components/StatusColumn.jsx

import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';

/**
 * Componente que renderiza una columna para un estado de orden específico (ej. "Recibidas").
 * Muestra un título, un contador de órdenes y la lista de tarjetas de órdenes.
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
 */
function StatusColumn({ title, count, orders, renderOrderCard, theme, bgColor, textColor, borderColor }) {
  return (
    <div className={`flex flex-col rounded-xl shadow-md ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100/50'} h-full`}>
      {/* --- Cabecera de la Columna (Sticky) --- */}
      <div className="p-3 rounded-t-lg sticky top-0 z-10" style={{ backgroundColor: bgColor }}>
        <div className="flex items-center justify-between" style={{ color: textColor, borderLeft: `5px solid ${borderColor}`, paddingLeft: '12px' }}>
          <h2 className="text-xl font-black">{title}</h2>
          <span className="text-lg font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {count}
          </span>
        </div>
      </div>

      {/* --- Contenedor de Órdenes (Scrollable) --- */}
      <div className="p-4 space-y-4 flex-grow overflow-y-auto">
        {orders.length > 0 ? (
          orders.map(order => renderOrderCard(order))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4">
            <ShoppingBagIcon className={`w-12 h-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              No hay órdenes en esta sección
            </p>
          </div>
        )}
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
};

export default StatusColumn;