import { useCart } from '../../context/CartContext';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function Orders() {
  const { orders } = useCart();

  if (orders.length === 0) {
    return <div className="max-w-2xl mx-auto p-4">No hay pedidos guardados.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Mis pedidos</h1>
      {orders.map(order => (
        <div key={order.id} className="mb-8 border-b pb-4">
          <div className="font-semibold mb-2">
            Pedido guardado el: {formatDate(order.date)}
          </div>
          {order.items.map((product, idx) => (
            <div key={idx} className="mb-2">
              <div className="font-semibold">{product.name}</div>
              <div>
                Opción: {product.options && product.options.length > 0
                  ? product.options.map(e => `${e.size} (+$${e.price})`).join(', ')
                  : product.option
                    ? `${product.option.size} (+$${product.option.price})`
                    : 'Ninguno'}
              </div>
              <div>
                Cantidad: {product.quantity}
              </div>
              <div>
                Extras: {product.extras && product.extras.length > 0
                  ? product.extras.map(e => `${e.name} (+$${e.price})`).join(', ')
                  : 'Ninguno'}
              </div>
              <div>
                Comentario: {product.comment || 'Sin comentario'}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Orders;