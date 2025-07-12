import {
  ClockIcon,
  PlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import {
  FireIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import { formatPrice, getPaymentMethodIcon } from '../../utils/helpers';

/**
 * Componente que renderiza una tarjeta individual de orden
 */
function OrderCard({
  order,
  theme,
  urgency,
  orderTotal,
  cardTheme, // ✅ Nueva prop con colores temáticos
  getTimeElapsed,
  calculateOrderItemPrice,
  handleNextStatus,
  handleAddProductToOrder,
  handleEditOrderData,
  handleDeleteOrderFull,
  handleEditOrderItem,
  handleDeleteOrderItem
}) {
  // ✅ Valores por defecto para cardTheme
  const safeCardTheme = cardTheme || {
    bgColor: theme === 'dark' ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.02)',
    borderColor: theme === 'dark' ? '#64748b' : '#94a3b8',
    accentColor: theme === 'dark' ? '#64748b' : '#94a3b8',
    headerBg: theme === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.04)',
    statusColor: theme === 'dark' ? '#94a3b8' : '#64748b',
    statusIcon: '📋'
  };
  // Determinar el botón de siguiente estado con colores temáticos
  let nextStatusButton = null;
  if (order.status === 'RECEIVED') {
    nextStatusButton = (
      <button
        onClick={() => handleNextStatus(order)}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl font-black text-lg text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
        style={{
          backgroundColor: safeCardTheme.accentColor,
          boxShadow: `0 4px 6px -1px ${safeCardTheme.accentColor}25`
        }}
        title="Mover a 'En Preparación'"
      >
        <FireIcon className="w-6 h-6" />
        <span>INICIAR PREPARACIÓN</span>
      </button>
    );
  } else if (order.status === 'ATTENDING') {
    {{safeCardTheme.bgColor = 'rgb(255, 251, 235)'}}
    nextStatusButton = (
      <button
        onClick={() => handleNextStatus(order)}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl font-black text-lg text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
        style={{
          backgroundColor: safeCardTheme.accentColor,
          boxShadow: `0 4px 6px -1px ${safeCardTheme.accentColor}25`
        }}
        title="Mover a 'Completada'"
      >
        <CheckBadgeIcon className="w-6 h-6" />
        <span>MARCAR COMO COMPLETADA</span>
      </button>
    );
  } else if (order.status === 'COMPLETED') {
    {{safeCardTheme.bgColor = 'rgb(240, 255, 244)'}}
  }

  // Función para obtener el color de urgencia (sobrescribe colores temáticos)
  const getUrgencyStyle = () => {
    if (urgency === 'urgent') {
      return {
        borderColor: '#ef4444',
        bgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 242, 242, 1)',
        shadowColor: 'rgba(239, 68, 68, 0.2)'
      };
    }
    if (urgency === 'warning') {
      return {
        borderColor: '#f59e0b',
        bgColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 251, 235, 1)',
        shadowColor: 'rgba(245, 158, 11, 0.2)'
      };
    }
    return {};
  };

  const urgencyStyle = getUrgencyStyle();

  return (
    <div
      className={`rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl ${
        theme === 'dark' ? 'border border-gray-700/30' : 'border border-gray-200/60'
      }`}
      style={{
        backgroundColor: urgencyStyle.bgColor || safeCardTheme.bgColor,
        borderLeftWidth: '6px',
        borderLeftColor: urgencyStyle.borderColor || safeCardTheme.borderColor,
        boxShadow: urgencyStyle.shadowColor ?
          `0 4px 6px -1px ${urgencyStyle.shadowColor}, 0 2px 4px -1px ${urgencyStyle.shadowColor}` :
          undefined
      }}
    >
      {/* Header de la orden con colores temáticos */}
      <div
        className="p-4 rounded-t-xl border-b"
        style={{
          backgroundColor: safeCardTheme.headerBg,
          borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        }}
      >
        <div className="flex items-start justify-between mb-5">
          {/* Info principal */}
          <div className="flex items-center gap-4">
            <div
              className="text-3xl font-black px-4 py-2 rounded-xl shadow-lg text-white"
              style={{
                backgroundColor: urgency === 'urgent' ? '#ef4444' :
                                urgency === 'warning' ? '#f59e0b' :
                                safeCardTheme.accentColor
              }}
            >
              #{order.id_order}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-lg font-medium"
                  style={{ color: safeCardTheme.statusColor }}
                >
                  {safeCardTheme.statusIcon}
                </span>
                <h3 className={`font-black text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} leading-tight`}>
                  {order.client_name || 'Sin nombre'}
                </h3>

                {/* Indicadores de urgencia */}
                {urgency === 'urgent' && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700">
                    <FireIcon className="w-3 h-3" />
                    <span className="text-xs font-bold">URGENTE</span>
                  </div>
                )}
                {urgency === 'warning' && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    <ClockIcon className="w-3 h-3" />
                    <span className="text-xs font-bold">ATENCIÓN</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-5 text-base mt-1">
                <span className={`flex items-center gap-2 font-bold ${
                  urgency === 'urgent' ? 'text-red-700 dark:text-red-400' :
                  urgency === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <ClockIcon className="w-5 h-5" />
                  {getTimeElapsed(order.created_at)}
                </span>
                <span className={`flex items-center gap-2 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {getPaymentMethodIcon(order.payment_name)} {order.payment_name}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones y total */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div
                className="text-2xl p-1 mt-10 rounded-xl shadow-lg text-white font-bold"
                style={{ backgroundColor: safeCardTheme.accentColor }}
              >
                {formatPrice(parseFloat(orderTotal))}
              </div>
              <div className={`text-base font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {order.items?.length || 0} producto{order.items?.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleAddProductToOrder(order)}
                className={`p-3 rounded-lg transition-all border-2 ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700/50 text-gray-300 border-gray-600 hover:border-gray-500'
                    : 'hover:bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
                title="Agregar producto"
              >
                <PlusIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleEditOrderData(order)}
                className={`p-3 rounded-lg transition-all border-2 ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700/50 text-gray-300 border-gray-600 hover:border-gray-500'
                    : 'hover:bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
                title="Editar datos"
              >
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleDeleteOrderFull(order)}
                className="p-3 rounded-lg transition-all border-2 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-500"
                title="Eliminar orden completa"
              >
                <TrashIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido de la tarjeta */}
      <div className="p-4">
        {/* Productos */}
        <div className="space-y-4">
          {order.items?.map((item, index) => (
            <div key={index} className={`p-5 rounded-xl border-2 ${
              theme === 'dark' ? 'bg-gray-800/30 border-gray-700/30' : 'bg-gray-50/50 border-gray-200/30'
            } shadow-md`}>
              <div className="flex items-start justify-between">
                {/* Info del producto */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    {/* Imagen del producto */}
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-20 h-20 rounded-xl object-cover border-3 border-gray-300 dark:border-gray-600 shadow-md"
                        loading="lazy"
                      />
                    )}

                    <div className="flex-1">
                      {/* Nombre y cantidad destacados */}
                      <h4 className={`font-black text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} leading-tight`}>
                        {item.quantity > 1 && (
                          <span
                            className="text-white px-3 py-2 rounded-full text-lg mr-3 font-black"
                            style={{ backgroundColor: safeCardTheme.accentColor }}
                          >
                            {item.quantity}x
                          </span>
                        )}
                        {item.product_name}
                        {item.variant_name && (
                          <span
                            className="ml-3 text-lg font-bold px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: safeCardTheme.accentColor + '15',
                              color: safeCardTheme.accentColor
                            }}
                          >
                            {item.variant_name}
                          </span>
                        )}
                      </h4>

                      {/* Sabor destacado */}
                      {item.flavor && (
                        <div className="mt-2">
                          <span
                            className="inline-flex items-center px-3 py-2 rounded-full text-base font-bold border"
                            style={{
                              backgroundColor: safeCardTheme.accentColor + '10',
                              color: safeCardTheme.accentColor,
                              borderColor: safeCardTheme.accentColor + '30'
                            }}
                          >
                            🍋 {item.flavor.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extras y salsas */}
                  {(item.extras?.length > 0 || item.sauces?.length > 0) && (
                    <div className="space-y-3 ml-20">
                      {/* Extras */}
                      {item.extras && item.extras.length > 0 && (
                        <div>
                          <span className={`text-base font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                            ➕ EXTRAS:
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.extras.map((extra, extraIdx) => (
                              <span
                                key={extraIdx}
                                className={`inline-flex items-center px-4 py-2 rounded-full text-base font-bold border-2 ${
                                  theme === 'dark'
                                    ? 'bg-gray-700/50 text-gray-200 border-gray-600'
                                    : 'bg-gray-200/50 text-gray-800 border-gray-300'
                                }`}
                              >
                                {extra.name}
                                {extra.quantity > 1 && (
                                  <span
                                    className="ml-2 text-white px-2 py-1 rounded-full text-sm font-bold"
                                    style={{ backgroundColor: safeCardTheme.accentColor }}
                                  >
                                    ×{extra.quantity}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Salsas */}
                      {item.sauces && item.sauces.length > 0 && (
                        <div>
                          <span className={`text-base font-bold ${theme === 'dark' ? 'text-orange-200' : 'text-orange-800'}`}>
                            🌶️ SALSAS:
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.sauces.map((sauce, sauceIdx) => (
                              <span
                                key={sauceIdx}
                                className={`inline-flex items-center px-4 py-2 rounded-full text-base font-bold border-2 ${
                                  theme === 'dark'
                                    ? 'bg-red-900/20 text-red-300 border-red-600'
                                    : 'bg-red-100/50 text-red-800 border-red-300'
                                }`}
                              >
                                {sauce.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comentarios */}
                  {item.comment && (
                    <div
                      className={`mt-4 p-4 rounded-xl border-l-4 ${
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100/50'
                      }`}
                      style={{ borderLeftColor: safeCardTheme.accentColor }}
                    >
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        💬 INSTRUCCIONES ESPECIALES:
                      </span>
                      <p className={`text-lg font-bold mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'} leading-relaxed`}>
                        "{item.comment}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Precio y botones de acción */}
                <div className="flex items-start gap-4 ml-6">
                  <div className="text-right">
                    <div
                      className="font-black text-2xl"
                      style={{ color: safeCardTheme.accentColor }}
                    >
                      {formatPrice(calculateOrderItemPrice(item))}
                    </div>
                  </div>

                  {/* Botones de acción: Editar y Eliminar */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEditOrderItem(order, index)}
                      className={`p-4 rounded-xl transition-all border-2 ${
                        theme === 'dark'
                          ? 'hover:bg-gray-700/50 text-gray-300 border-gray-600 hover:border-gray-500'
                          : 'hover:bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                      title="Editar producto"
                    >
                      <PencilIcon className="w-6 h-6" />
                    </button>

                    {/* Botón eliminar */}
                    <button
                      onClick={() => handleDeleteOrderItem(order, index)}
                      className="p-4 rounded-xl transition-all border-2 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-500"
                      title="Eliminar producto"
                    >
                      <TrashIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón de siguiente estado */}
      {nextStatusButton && (
        <div className="p-4 border-t" style={{
          borderTopColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        }}>
          {nextStatusButton}
        </div>
      )}
    </div>
  );
}

// PropTypes para validación
OrderCard.propTypes = {
  order: PropTypes.object.isRequired,
  theme: PropTypes.oneOf(['dark', 'light']).isRequired,
  urgency: PropTypes.oneOf(['urgent', 'warning', 'normal']).isRequired,
  orderTotal: PropTypes.number.isRequired,
  cardTheme: PropTypes.object, // ✅ Opcional con valores por defecto
  getTimeElapsed: PropTypes.func.isRequired,
  calculateOrderItemPrice: PropTypes.func.isRequired,
  handleNextStatus: PropTypes.func.isRequired,
  handleAddProductToOrder: PropTypes.func.isRequired,
  handleEditOrderData: PropTypes.func.isRequired,
  handleDeleteOrderFull: PropTypes.func.isRequired,
  handleEditOrderItem: PropTypes.func.isRequired,
  handleDeleteOrderItem: PropTypes.func.isRequired,
};

export default OrderCard;