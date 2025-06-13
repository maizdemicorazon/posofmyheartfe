import { useState, useMemo, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, ShoppingBagIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';

function Orders({ onBack }) {
  const { setLoading } = useLoading();
  const { setMessage } = useMessage();
  const { theme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('today');
  const [sortByDate, setSortByDate] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Función para obtener órdenes de la API
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch('http://localhost:8081/api/orders');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Orders API Response:', data);

      // Transformar datos de la API al formato esperado por el componente
      const transformedOrders = data.map(order => ({
        id_order: order.id_order,
        client_name: order.client_name || 'Cliente',
        order_date: order.order_date,
        total: order.bill,
        payment_method: order.payment_method,
        comment: order.comment,
        items: order.items.map(item => ({
          id_product: item.id_product,
          id_variant: item.id_variant,
          quantity: item.quantity || 1,
          price: item.price || 0,
          sauces: item.sauces || [],
          extras: item.extras || []
        }))
      }));

      setOrders(transformedOrders);
      setMessage(null); // Limpiar mensajes de error previos
    } catch (error) {
      console.error('Error fetching orders:', error);
      setMessage({
        text: 'Error al cargar las órdenes. Verificando conexión con el servidor...',
        type: 'error'
      });

      // Datos de ejemplo como fallback
      setOrders([
        {
          id_order: 1,
          client_name: "Cliente de ejemplo",
          order_date: new Date().toISOString(),
          total: 185.00,
          payment_method: 1,
          comment: "Datos de ejemplo - sin conexión al servidor",
          items: [
            {
              id_product: 1,
              quantity: 2,
              price: 185.00,
              sauces: [{ name: "Sin picante" }],
              extras: []
            }
          ]
        }
      ]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Cargar órdenes al montar el componente
  useEffect(() => {
    fetchOrders();
  }, []);

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

  // Obtener nombre del método de pago
  const getPaymentMethodName = (paymentMethodId) => {
    switch (paymentMethodId) {
      case 1:
        return 'Efectivo';
      case 2:
        return 'Tarjeta';
      case 3:
        return 'Transferencia';
      default:
        return `Método ${paymentMethodId}`;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <BusinessHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header de la página */}
        <div className={`rounded-xl shadow-sm border mb-6 p-6 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
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
                <h1 className={`text-2xl sm:text-3xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Mis Pedidos
                </h1>
                <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Historial de tus órdenes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {orders.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-700">
                  <span className={`font-semibold ${
                    theme === 'dark' ? 'text-green-300' : 'text-green-800'
                  }`}>
                    {orders.length} pedidos en total
                  </span>
                </div>
              )}

              <button
                onClick={fetchOrders}
                disabled={isLoadingOrders}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingOrders ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <ArrowPathIcon className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {isLoadingOrders ? 'Cargando...' : 'Actualizar'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className={`rounded-xl shadow-sm border mb-6 p-4 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <span className={`text-sm font-medium mr-2 flex items-center ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
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
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600 shadow-sm'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              {sortByDate ? "Más recientes" : "Más antiguos"}
            </button>
          </div>
        </div>

        {/* Lista de órdenes */}
        {isLoadingOrders ? (
          <div className={`rounded-xl shadow-sm border p-12 text-center ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Cargando pedidos...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={`rounded-xl shadow-sm border p-12 text-center ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <ShoppingBagIcon className={`w-10 h-10 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {filter === 'today' ? 'No hay pedidos hoy' : 'No hay pedidos'}
            </h3>
            <p className={`mb-6 max-w-md mx-auto ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
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
              <div key={order.id_order} className={`rounded-xl shadow-sm border overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`px-6 py-4 border-b ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                }`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`text-lg font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {order.client_name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          theme === 'dark'
                            ? 'bg-blue-900/30 text-blue-300'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          Orden #{order.id_order}
                        </span>
                      </div>
                      <p className={`text-sm flex items-center gap-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <ClockIcon className="w-4 h-4" />
                        {formatDate(order.order_date)}
                      </p>
                      <p className={`text-sm mt-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        💳 {getPaymentMethodName(order.payment_method)}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      theme === 'dark'
                        ? 'bg-green-900/30 text-green-300'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      Total: ${order.total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  {order.comment && (
                    <p className={`text-sm italic mt-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      💬 "{order.comment}"
                    </p>
                  )}
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className={`rounded-lg p-4 border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="text-center space-y-2">
                          <h4 className={`font-semibold text-sm ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            🍽️ Producto #{item.id_product}
                          </h4>

                          <div className={`text-xs space-y-1 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <div className="flex justify-between">
                              <span className="font-medium">Cantidad:</span>
                              <span>{item.quantity}</span>
                            </div>

                            {item.id_variant && (
                              <div className="flex justify-between">
                                <span className="font-medium">Variante:</span>
                                <span>#{item.id_variant}</span>
                              </div>
                            )}
                          </div>

                          {/* Salsas */}
                          {item.sauces && item.sauces.length > 0 && (
                            <div className="mt-2">
                              <p className={`text-xs font-medium mb-1 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                🌶️ Salsas:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {item.sauces.map((sauce, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className={`text-xs px-2 py-1 rounded ${
                                      theme === 'dark'
                                        ? 'bg-red-900/30 text-red-300'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {sauce.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Extras */}
                          {item.extras && item.extras.length > 0 && (
                            <div className="mt-2">
                              <p className={`text-xs font-medium mb-1 ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                ➕ Extras:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {item.extras.map((extra, eIdx) => (
                                  <span
                                    key={eIdx}
                                    className={`text-xs px-2 py-1 rounded ${
                                      theme === 'dark'
                                        ? 'bg-orange-900/30 text-orange-300'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}
                                  >
                                    {extra.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className={`border-t pt-2 mt-2 ${
                            theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                          }`}>
                            <span className={`font-bold ${
                              theme === 'dark' ? 'text-green-400' : 'text-green-700'
                            }`}>
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