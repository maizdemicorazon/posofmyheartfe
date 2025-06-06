import { useCart } from '../../context/CartContext';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

function Cart({ onCloseCart }) {
    const { cart, removeFromCart, startEditProduct, saveOrder, clearCart } = useCart();

    const getProductTotal = (product) => {
        const optionsPrice = Array.isArray(product.options)
            ? product.options.reduce((sum, option) => sum + Number(option?.price || 0), 0)
            : 0;

        const extrasPrice = Array.isArray(product.extras)
            ? product.extras.reduce(
                (sum, extra) => sum + Number(extra?.price || 0) * Number(extra?.quantity || 1),
                0
            )
            : 0;

        return (optionsPrice + extrasPrice) * Number(product.quantity || 0);
    };

    const total = cart.reduce((sum, product) => sum + getProductTotal(product), 0);

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="header-cart flex justify-between flex-row">
                <h1 className="text-2xl font-bold mb-4">Carrito</h1>
                <div
                    className="clean_cart cursor-pointer"
                    onClick={() => clearCart(onCloseCart)}
                >
                    <TrashIcon className="w-5 h-5 text-gray-500" />
                </div>
            </div>
            {cart.length === 0 ? (
                <p>No hay productos en el carrito.</p>
            ) : (
                <div className="flex flex-col h-[80vh] border rounded shadow p-4">
                    {/* Contenedor scrollable */}
                    <div className="overflow-y-auto flex-1">
                        {cart.map((product, idx) => (
                            <div key={idx} className="flex items-start gap-4 border-b py-4">
                                {/* Imagen del producto */}
                                <img
                                    src={product.image || 'https://via.placeholder.com/64'}
                                    alt="product"
                                    className="w-16 h-16 rounded-full object-cover border"
                                />

                                {/* Información del producto */}
                                <div className="flex-1">
                                <div className="font-semibold text-lg">{product.name}</div>

                                <div className="text-sm font-medium">
                                    Tamaño:{' '}
                                    {Array.isArray(product.options) && product.options.length > 0 && product.options[0] != null
                                        ? product.options
                                            .filter(e => e && typeof e.size !== 'undefined' && typeof e.price !== 'undefined')
                                            .map(e => `${e.size} +$${e.price}`)
                                            .join(', ')
                                        : 'Ninguno'}
                                </div>

                                <div className="text-sm font-medium mb-1">
                                    Sabor: {' '}
                                    {Array.isArray(product.flavors) && product.flavors.length > 0 && product.flavors[0] != null
                                        ? product.flavors
                                            .filter(e => e && typeof e.name !== 'undefined')
                                            .map(e => `${e.name}`)
                                            .join(', ')
                                        : 'Ninguno'}
                                </div>

                                <div className="text-sm font-medium mb-1">
                                    Extras:{' '}
                                    {product.extras && product.extras.length > 0 ? (
                                        product.extras.map((e, i) => (
                                            <span key={i} className="border border-green-500 px-1 py-0.5 rounded text-sm mx-1 inline-block">
                                                {e.name} +${e.price}
                                                <p>qty: {e.quantity}</p>
                                            </span>
                                        ))
                                    ) : (
                                    '   Ninguno'
                                    )}
                                </div>

                                <div className="text-sm font-medium mb-1">
                                    Salsas:{' '}
                                    {product.sauces && product.sauces.length > 0 ? (
                                        product.sauces.map((e, i) => (
                                            <span key={i} className="border border-blue-500 px-1 py-0.5 rounded text-sm mx-1 inline-block">
                                                {e.name}
                                            </span>
                                        ))
                                    ) : (
                                        'Ninguno'
                                    )}
                                </div>

                                <div className="text-sm font-medium">Cantidad: {product.quantity}</div>
                                <div className="text-sm font-medium">Comentario: {product.comment || 'Sin comentario'}</div>
                                    {/* Botones de acción */}
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            className="border border-red-500 text-red px-3 py-1 rounded hover:border-red-600"
                                            onClick={() => removeFromCart(idx)}
                                        >
                                            <TrashIcon className="w-5 h-5 text-red-500" />
                                        </button>
                                        <button
                                            className="border border-blue-500 text-blue px-3 py-1 rounded hover:border-blue-600"
                                            onClick={() => startEditProduct(idx)}
                                        >
                                            <PencilIcon className="w-5 h-5 text-blue-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Subtotal */}
                                <div className="text-sm font-semibold text-right whitespace-nowrap">
                                    Total <br /> ${getProductTotal(product).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total final y botón */}
                    <div className="border-t pt-4 mt-4">
                        <div className="text-right text-xl font-bold mb-4">
                            total: ${total.toFixed(2)}
                        </div>
                        <button
                            className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700"
                            onClick={() => saveOrder(onCloseCart)}
                        >
                            guardar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cart;
