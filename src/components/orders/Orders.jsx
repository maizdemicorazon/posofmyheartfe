import { useEffect, useState, useMemo } from 'react';
import { useLoading } from '../../context/LoadingContext';

function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}

function formatKeyByFilter(dateStr, filter) {
  const date = new Date(dateStr);
  if (filter === 'day') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (filter === 'month') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  if (filter === 'year') {
    return `${date.getFullYear()}`;
  }
  return dateStr;
}

function getExtraInfo(id_extra) {
  try {
    const extras = JSON.parse(sessionStorage.getItem('extras') || '[]');
    return extras.find(e => e.id_extra === id_extra) || {};
  } catch {
    return {};
  }
}
function getSauceInfo(id_sauce) {
  try {
    const sauces = JSON.parse(sessionStorage.getItem('sauces') || '[]');
    return sauces.find(e => e.id_sauce === id_sauce) || {};
  } catch {
    return {};
  }
}
function getProductInfo(id_product) {
  try {
    const products = JSON.parse(sessionStorage.getItem('products') || '[]');
    return products.find(p => p.id_product === id_product) || {};
  } catch {
    return {};
  }
}
function getVariantInfo(product, id_variant) {
  if (!product || !product.options) return {};
  return product.options.find(opt => opt.id_variant === id_variant) || {};
}

const getProductTotal = (product) => {
  const productInfo = getProductInfo(product.id_product);
  const variant = getVariantInfo(productInfo, product.id_variant);
  const optionPrice = Number(variant.price || 0);
  
  // Extras
  let extrasPrice = 0;
  if (Array.isArray(product.extras)) {
    extrasPrice = product.extras.reduce((sum, extra) => {
      const extraInfo = getExtraInfo(extra.id_extra);
      return sum + Number(extraInfo.price || 0) * Number(extra.quantity || 1);
    }, 0);
  }

  // Salsas (si tienen precio)
  let saucesPrice = 0;
  if (Array.isArray(product.sauces)) {
    saucesPrice = product.sauces.reduce((sum, sauce) => {
      const sauceInfo = getSauceInfo(sauce.id_sauce);
      return sum + Number(sauceInfo.price || 0);
    }, 0);
  }

  // Cantidad (si existe)
  const quantity = Number(product.quantity || 1);

  return (optionPrice + extrasPrice + saucesPrice) * quantity;
};

const getOrderTotal = (order) => {
  return order.items.reduce((sum, item) => sum + getProductTotal(item), 0);
};

function Orders() {
  const [orders, setOrders] = useState([]);
  const { setLoading } = useLoading();
  const [filter, setFilter] = useState('day');
  const [sortByDate, setSortByDate] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const url_base = 'https://posofmyheart-develop.up.railway.app/';
        const endpoint = 'api/orders';
        const res = await fetch(url_base + endpoint);
        if (!res.ok) throw new Error('Error al obtener pedidos');
        const data = await res.json();
        console.log(data);
        setOrders(data || []);
      } catch (error) {
        setOrders([]);
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const groupedOrders = useMemo(() => {
    const groups = {};
    const groupTotals = {};
    for (const order of orders) {
      const key = formatKeyByFilter(order.order_date, filter);
      if (!groups[key]) {
        groups[key] = [];
        groupTotals[key] = 0;
      }
      groups[key].push(order);
      groupTotals[key] += getOrderTotal(order);
    }
    let sortedEntries;
    if (sortByDate) {
      sortedEntries = Object.entries(groups).sort(([a], [b]) => new Date(b) - new Date(a));
    } else {
      sortedEntries = Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b));
    }
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
        {Object.entries(groupedOrders.groups).map(([groupKey, ordersInGroup]) => {
          const sortedOrders = [...ordersInGroup].sort((a, b) => {
            if (sortByDate) {
              // Más recientes primero
              return new Date(b.order_date) - new Date(a.order_date);
            } else {
              // Más antiguos primero
              return new Date(a.order_date) - new Date(b.order_date);
            }
          });
          return (
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
              {sortedOrders.map((order) => (
                <div key={order.id_order} className="border border-gray-300 rounded mb-6">
                  <div className="border-b border-gray-300 p-3 bg-gray-50 title-card-order">
                    <div className="font-medium text-title-order">
                      Pedido guardado el: {formatFullDate(order.order_date)}
                    </div>
                    <div className="text-xs text-gray-600">Cliente: {order.client_name}</div>
                    <div className="text-xs text-gray-600">Comentario: {order.comment}</div>
                  </div>
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
                        {order.items.map((product, idx) => {
                          const productInfo = getProductInfo(product.id_product);
                          const variant = getVariantInfo(productInfo, product.id_variant);
                          return (
                            <div
                              key={idx}
                              className="min-w-[200px] max-w-[200px] border border-gray-300 rounded p-3 flex-shrink-0"
                            >
                              <div className="flex justify-center mb-2">
                                <div className="w-16 h-16 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={productInfo.image || '/api/placeholder/64/64'}
                                    alt="product"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                              <div className="text-sm">
                                <div className="font-medium text-center mb-1">{productInfo.name || 'Producto'}</div>
                                <div className="text-xs text-option-details mb-1">
                                  <span className="font-medium">Tamaño: </span>
                                  {variant.size
                                    ? `${variant.size} +$${variant.price}`
                                    : 'N/A'}
                                </div>
                                <div className="text-xs text-option-details mb-1">
                                  <span className="font-medium">Extras: </span>
                                  {product.extras && product.extras.length > 0 ? (
                                    <div className="mt-1">
                                      {product.extras.map((e, i) => {
                                        const extraInfo = getExtraInfo(e.id_extra);
                                        return (
                                          <span
                                            key={i}
                                            className="px-1 py-0.5 rounded border border-green-400 text-xs mr-1 inline-block mb-1"
                                          >
                                            {extraInfo.name || 'Extra'} +${extraInfo.price || 0} x{e.quantity}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    'Ninguno'
                                  )}
                                </div>
                                <div className="text-xs text-option-details mb-1">
                                  <span className="font-medium">Salsas: </span>
                                  {product.sauces && product.sauces.length > 0 ? (
                                    <div className="mt-1">
                                      {product.sauces.map((e, i) => {
                                        const sauceInfo = getSauceInfo(e.id_sauce);
                                        return (
                                          <span
                                            key={i}
                                            className="px-1 py-0.5 rounded border border-blue-400 text-xs mr-1 inline-block mb-1"
                                          >
                                            {sauceInfo.name || e.name || 'Salsa'}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    'Ninguno'
                                  )}
                                </div>
                                <div className="text-xs text-option-details mb-1">
                                  <span className="font-medium">Cantidad: </span>
                                  {product.quantity || 1}
                                </div>
                                <div className="text-xs text-option-details mb-2">
                                  <span className="font-medium">Comentario: </span>
                                  {product.comment || 'Sin comentario'}
                                </div>
                                <div className="text-right font-semibold text-sm border-t pt-1 mt-2">
                                  Total: ${getProductTotal(product).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 p-3 text-right bg-gray-50">
                    <div className="font-bold text-lg text-total-order">
                      Total del pedido: ${getOrderTotal(order).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Orders;