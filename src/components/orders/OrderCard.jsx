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
  getTimeElapsed,
  calculateOrderItemPrice,
  handleNextStatus,
  handleAddProductToOrder,
  handleEditOrderData,
  handleDeleteOrderFull,
  handleEditOrderItem,
  handleDeleteOrderItem
}) {
  // Determinar el botón de siguiente estado
  let nextStatusButton = null;
  if (order.status === 'RECEIVED') {
    nextStatusButton = (
      <button
        onClick={() => handleNextStatus(order)}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl font-black text-lg text-white bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
        title="Mover a 'En Preparación'"
      >
        <FireIcon className="w-6 h-6" />
        <span>INICIAR PREPARACIÓN</span>
      </button>
    );
  } else if (order.status === 'ATTENDING') {
    nextStatusButton = (
      <button
        onClick={() => handleNextStatus(order)}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl font-black text-lg text-white bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
        title="Mover a 'Completada'"
      >
        <CheckBadgeIcon className="w-6 h-6" />
        <span>MARCAR COMO COMPLETADA</span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-xl shadow-lg border-l-6 transition-all duration-200 hover:shadow-xl ${
        urgency === 'urgent'
          ? 'border-l-red-600 bg-red-50 dark:bg-red-900/20'
          : urgency === 'warning'
          ? 'border-l-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
          : 'border-l-green-800 bg-white dark:bg-green-700'
      } ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      {/* Header de la orden */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-5">
          {/* Info principal */}
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-black px-4 py-2 rounded-xl ${
              urgency === 'urgent'
                ? 'bg-red-600 text-white shadow-lg'
                : urgency === 'warning'
                ? 'bg-yellow-600 text-white shadow-lg'
                : 'bg-blue-600 text-white shadow-lg'
            }`}>
              #{order.id_order}
            </div>
            <div>
              <h3 className={`font-black text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} leading-tight`}>
                {order.client_name || 'Sin nombre'}
              </h3>
              <div className="flex items-center gap-5 text-base mt-1">
                <span className={`flex items-center gap-2 font-bold ${
                  urgency === 'urgent' ? 'text-red-700 dark:text-red-400' :
                  urgency === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                  'text-blue-700 dark:text-blue-400'
                }`}>
                  <ClockIcon className="w-5 h-5" />
                  {getTimeElapsed(order.order_date)}
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
              <div className="text-2xl p-1 mt-10 rounded-xl bg-blue-600 text-white shadow-lg">
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
                className="p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-600 transition-all hover:border-blue-400 dark:hover:border-blue-500"
                title="Agregar producto"
              >
                <PlusIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleEditOrderData(order)}
                className="p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 transition-all hover:border-slate-400 dark:hover:border-slate-500"
                title="Editar datos"
              >
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleDeleteOrderFull(order)}
                className="p-3 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg border-2 border-red-300 dark:border-red-600 transition-all hover:border-red-400 dark:hover:border-red-500"
                title="Eliminar orden completa"
              >
                <TrashIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="space-y-4">
          {order.items?.map((item, index) => (
            <div key={index} className={`p-5 rounded-xl border-2 ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
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
                          <span className="bg-slate-600 text-white px-3 py-2 rounded-full text-lg mr-3 font-black">
                            {item.quantity}x
                          </span>
                        )}
                        {item.product_name}
                        {item.variant_name && (
                          <span className={`ml-3 text-lg font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            • {item.variant_name}
                          </span>
                        )}
                      </h4>

                      {/* Sabor destacado */}
                      {item.flavor && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-base font-bold bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100 border border-slate-400">
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
                                className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 border-2 border-gray-400 dark:border-gray-500"
                              >
                                {extra.name}
                                {extra.quantity > 1 && (
                                  <span className="ml-2 bg-slate-600 text-white px-2 py-1 rounded-full text-sm font-bold">
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
                                className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100 border-2 border-orange-400 dark:border-orange-600"
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
                    <div className={`mt-4 p-4 rounded-xl border-l-4 border-slate-500 ${
                      theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
                    }`}>
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                        ⚠️ INSTRUCCIONES ESPECIALES:
                      </span>
                      <p className={`text-lg font-bold mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'} leading-relaxed`}>
                        "{item.comment}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Precio y botones de acción */}
                <div className="flex items-start gap-4 ml-6">
                  <div className="text-right">
                    <div className="font-black text-2xl text-green-600">
                      {formatPrice(calculateOrderItemPrice(item))}
                    </div>
                  </div>

                  {/* Botones de acción: Editar y Eliminar */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEditOrderItem(order, index)}
                      className={`p-4 rounded-xl transition-all border-2 ${
                        theme === 'dark'
                          ? 'text-blue-400 hover:bg-blue-900/20 border-blue-600 hover:border-blue-500'
                          : 'text-blue-600 hover:bg-blue-50 border-blue-300 hover:border-blue-400'
                      }`}
                      title="Editar producto"
                    >
                      <PencilIcon className="w-6 h-6" />
                    </button>

                    {/* Botón eliminar */}
                    <button
                      onClick={() => handleDeleteOrderItem(order, index)}
                      className={`p-4 rounded-xl transition-all border-2 ${
                        theme === 'dark'
                          ? 'text-red-400 hover:bg-red-900/20 border-red-600 hover:border-red-500'
                          : 'text-red-600 hover:bg-red-50 border-red-300 hover:border-red-400'
                      }`}
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
        <div className="p-4 border-gray-200 dark:border-gray-700">
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