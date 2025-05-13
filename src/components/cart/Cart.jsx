import { useCart } from '../../context/CartContext';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

function Cart() {
    const { cart, removeFromCart, startEditProduct, saveOrder } = useCart();

    const getProductTotal = (product) => {
        const optionsPrice = product.options
            ? product.options.reduce((sum, option) => sum + Number(option.price), 0)
            : 0;
        const extrasPrice = product.extras
            ? product.extras.reduce((sum, extra) => sum + Number(extra.price), 0)
            : 0;
        return (optionsPrice + extrasPrice) * product.quantity;
    };

    const total = cart.reduce((sum, product) => sum + getProductTotal(product), 0);

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Carrito</h1>
            {cart.length === 0 ? (
                <p>No hay productos en el carrito.</p>
            ) : (
                <div>
                    {cart.map((product, idx) => (
                        <div key={idx} className="border-b py-4">
                            <div className="font-semibold">{product.name}</div>
                            <div>
                                Opción: {product.options && product.options.length > 0
                                ? product.options.map(e => `${e.size} (+$${e.price})`).join(', ')
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
                            <div className="font-semibold mt-2">
                                Subtotal: ${getProductTotal(product).toFixed(2)}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                    onClick={() => removeFromCart(idx)}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                                <button
                                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                    onClick={() => startEditProduct(idx)}
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <div className="text-right text-xl font-bold mt-6">
                        Total: ${total.toFixed(2)}
                    </div>
                    <button
                        className="mt-6 w-full bg-green-600 text-white py-3 rounded hover:bg-green-700"
                        onClick={saveOrder}
                    >
                        Guardar
                    </button>
                </div>
            )}
        </div>
    );
}

export default Cart;
