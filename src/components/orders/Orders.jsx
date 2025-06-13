import { useState, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';

function Orders({ onBack }) {
  const { orders } = useCart();
  const [filter, setFilter] = useState('today');
  const [sortByDate, setSortByDate] = useState(true);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    if (filter === 'today') {
      const today = new Date();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate.toDateString() === today.toDateString();
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.order_date);
      const dateB = new Date(b.order_date);
      return sortByDate ? dateB - dateA : dateA - dateB;
    });
  }, [orders, filter, sortByDate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header de la página */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1b7f2c] to-[#228B22] text-white rounded-lg hover:from-[#1a7329] hover:to-[#1f7a1f] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">Volver</span>
              </button>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis Pedidos</h1>
                <p className="text-gray-600 mt-1">Historial de tus órdenes</p>
              </div>
            </div>

            {orders.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">
                <span className="text-green-800 font-semibold">{orders.length} pedidos en total</span>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2 flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1" />
                Filtrar por:
              </span>
              {[
                { key: 'today', label: 'Hoy', icon: '📅' },
                { key: 'all', label: 'Todos', icon: '📊' }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    filter === option.key
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-300 shadow-sm'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <span>{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSortByDate(!sortByDate)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-all duration-200 text-sm font-medium text-gray-700"
            >
              <ClockIcon className="w-4 h-4" />
              {sortByDate ? "Más recientes" : "Más antiguos"}
            </button>
          </div>
        </div>

        {/* Lista de órdenes */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBagIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'today' ? 'No hay pedidos hoy' : 'No hay pedidos'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filter === 'today'
                ? 'Aún no has realizado pedidos hoy. ¡Es un buen momento para pedir algo delicioso!'
                : 'Tus pedidos aparecerán aquí una vez que realices tu primera orden.'
              }
            </p>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1b7f2c] to-[#228B22] text-white rounded-lg hover:from-[#1a7329] hover:to-[#1f7a1f] transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Hacer un pedido
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id_order} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{order.client_name}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {formatDate(order.order_date)}
                      </p>
                    </div>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Total: ${order.total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  {order.comment && (
                    <p className="text-sm text-gray-500 italic mt-2">"{order.comment}"</p>
                  )}
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-center space-y-2">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            Producto #{item.id_product}
                          </h4>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Cantidad:</span> {item.quantity}
                          </div>
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <span className="font-bold text-green-700">
                              ${item.price?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;