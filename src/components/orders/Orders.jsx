import { useCart } from '../../context/CartContext';
import { useState, useMemo } from 'react';

function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  // Formato: DD/M/YYYY HH:MM:SS a.m.
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12;
  hours = hours ? hours : 12; // Convertir 0 a 12
  
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}

function formatKeyByFilter(dateStr, filter) {
  const date = new Date(dateStr);
  
  if (filter === 'day') {
    // Formato YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  if (filter === 'month') {
    // Formato YYYY-MM
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  if (filter === 'year') {
    // Formato YYYY
    return `${date.getFullYear()}`;
  }
  
  return dateStr;
}

const getProductTotal = (product) => {
  const optionsPrice = Array.isArray(product.options)
    ? product.options.reduce((sum, option) => sum + Number(option?.price || 0), 0)
    : 0;

  const extrasPrice = Array.isArray(product.extras)
    ? product.extras.reduce((sum, extra) => sum + Number(extra?.price || 0), 0)
    : 0;

  const saucesPrice = Array.isArray(product.sauces)
    ? product.sauces.reduce((sum, sauce) => sum + Number(sauce?.price || 0), 0)
    : 0;

  return (optionsPrice + extrasPrice + saucesPrice) * Number(product.quantity || 0);
};

const getOrderTotal = (order) => {
  return order.items.reduce((sum, item) => sum + getProductTotal(item), 0);
};

function Orders() {
  const { orders } = useCart();
  const [filter, setFilter] = useState('day'); // 'day', 'month', 'year'
  const [sortByDate, setSortByDate] = useState(true); // true: más reciente primero, false: más viejo primero

  const groupedOrders = useMemo(() => {
    const groups = {};
    const groupTotals = {};
    
    // Agrupar pedidos por fecha según el filtro
    for (const order of orders) {
      const key = formatKeyByFilter(order.date, filter);
      if (!groups[key]) {
        groups[key] = [];
        groupTotals[key] = 0;
      }
      groups[key].push(order);
      // Sumar el total de este pedido al total del grupo
      groupTotals[key] += getOrderTotal(order);
    }

    // Ordenar las entradas según el criterio de ordenamiento por fecha
    let sortedEntries;
    if (sortByDate) {
      // Ordenar del más reciente al más viejo
      sortedEntries = Object.entries(groups).sort(([a], [b]) => new Date(b) - new Date(a));
    } else {
      // Ordenar del más viejo al más reciente
      sortedEntries = Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b));
    }
    
    // Devolver un objeto con los pedidos agrupados y los totales
    return {
      groups: Object.fromEntries(sortedEntries),
      totals: groupTotals
    };
  }, [orders, filter, sortByDate]);

  if (orders.length === 0) {
    return <div className="max-w-2xl mx-auto p-4">No hay pedidos guardados.</div>;
  }

  console.log('Grouped Orders:', groupedOrders);
  console.log('Orders:', orders);

  return (
    <div className="flex flex-col max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Mis Pedidos</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="flex gap-2 mr-4">
          <button
            onClick={() => setFilter('day')}
            className={`btn-filter-orders px-4 py-2 rounded border flex justify-start items-center flex-row ${
              filter === 'day' ? 'border-blue-800' : 'border-gray-500'
            }`}
          >
            Por Día
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`btn-filter-orders px-4 py-2 rounded border flex justify-start items-center flex-row ${
              filter === 'month' ? 'border-blue-800' : 'border-gray-500'
            }`}
          >
            Por Mes
          </button>
          <button
            onClick={() => setFilter('year')}
            className={`btn-filter-orders px-4 py-2 rounded border flex justify-start items-center flex-row ${
              filter === 'year' ? 'border-blue-800' : 'border-gray-500'
            }`}
          >
            Por Año
          </button>
        </div>
        
        <button
          onClick={() => setSortByDate(!sortByDate)}
          className="btn-filter-orders w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center"
          title={sortByDate ? "Ordenar del más viejo al más reciente" : "Ordenar del más reciente al más viejo"}
        >
          {sortByDate ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Agrupación */}
      <div className="space-y-8">
        {Object.entries(groupedOrders.groups).map(([groupKey, ordersInGroup]) => (
          <div key={groupKey} className="mb-8">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-semibold">
                {filter === 'day'
                  ? `Pedidos del ${groupKey}`
                  : filter === 'month'
                  ? `Pedidos de ${groupKey}`
                  : `Pedidos del año ${groupKey}`}
              </h2>
              <div className="text-lg font-semibold text-green-700">
                Total: ${groupedOrders.totals[groupKey].toFixed(2)}
              </div>
            </div>

            {ordersInGroup.map((order) => (
              <div key={order.id} className="border border-gray-300 rounded mb-6">
                <div className="border-b border-gray-300 p-3 bg-gray-50 title-card-order">
                  <div className="font-medium text-title-order">
                    Pedido guardado el: {formatFullDate(order.date)}
                  </div>
                </div>

                {/* Productos en slider horizontal */}
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
                      {order.items.map((product, idx) => (
                        <div
                          key={idx}
                          className="min-w-[200px] max-w-[200px] border border-gray-300 rounded p-3 flex-shrink-0"
                        >
                          <div className="flex justify-center mb-2">
                            <div className="w-16 h-16 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                              <img
                                src={product.image || '/api/placeholder/64/64'}
                                alt="product"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          <div className="text-sm">
                            <div className="font-medium text-center mb-1">{product.name}</div>
                            
                            <div className="text-xs text-option-details mb-1">
                              <span className="font-medium">Tamaño: </span>
                              {Array.isArray(product.options) && product.options.length > 0
                                ? product.options
                                    .filter(e => e && typeof e.size !== 'undefined' && typeof e.price !== 'undefined')
                                    .map(e => `${e.size} +${e.price}`)
                                    .join(', ')
                                : product.option
                                ? `${product.option.size} +${product.option.price}`
                                : 'Regular +$15'}
                            </div>

                            <div className="text-xs text-option-details mb-1">
                              <span className="font-medium">Extras: </span>
                              {product.extras && product.extras.length > 0 ? (
                                <div className="mt-1">
                                  {product.extras.map((e, i) => (
                                    <span
                                      key={i}
                                      className="px-1 py-0.5 rounded border border-green-400 text-xs mr-1 inline-block mb-1"
                                    >
                                      {e.name} +${e.price}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                'Ninguno'
                              )}
                            </div>

                            <div className="text-xs text-option-details mb-1">
                              <span className="font-medium">Salsas: </span>
                              {product.sauces && product.sauces.length > 0 ? (
                                <div className="mt-1">
                                  {product.sauces.map((e, i) => (
                                    <span
                                      key={i}
                                      className="px-1 py-0.5 rounded border border-blue-400 text-xs mr-1 inline-block mb-1"
                                    >
                                      {e.name} +${e.price}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                'Ninguno'
                              )}
                            </div>

                            <div className="text-xs text-option-details mb-1">
                              <span className="font-medium">Cantidad: </span>{product.quantity || 1}
                            </div>

                            <div className="text-xs text-option-details mb-2">
                              <span className="font-medium">Comentario: </span>{product.comment || 'Sin comentario'}
                            </div>

                            <div className="text-right font-semibold text-sm border-t pt-1 mt-2">
                              Total: ${getProductTotal(product).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total del pedido */}
                <div className="border-t border-gray-300 p-3 text-right bg-gray-50">
                  <div className="font-bold text-lg text-total-order">
                    Total del pedido: ${getOrderTotal(order).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Orders;