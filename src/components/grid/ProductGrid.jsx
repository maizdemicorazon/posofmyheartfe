import { useEffect, useState } from 'react';
import ProductOptionsModal from './ProductOptionsModal';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';

function ProductGrid({ selectedCategory }) {
    const [products, setProducts] = useState([]);
    const [showOptions, setShowOptions] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { loading, setLoading } = useLoading();
    const { message, setMessage } = useMessage();

    useEffect(() => {

        const fetchData = async () => {
            let urlBase = "https://posofmyheart-develop.up.railway.app/"
            let endponitApiProducts = "api/products";
            let urlGetApiProducts = urlBase + endponitApiProducts;
            setLoading(true);

            try {
                const res = await fetch(urlGetApiProducts);
                if (!res.status === "error") throw new Error('Respuesta Fail');
                const response = await res.json();

                if (response.products && response.products.length > 0) {
                    let productsList = response.products || [];
                    let extrasList = response.extras || [];
                    let saucesList = response.sauces || [];
                    let paymentMethodsList = response.paymentMethods || [];
                    sessionStorage.setItem('products', JSON.stringify(productsList));
                    sessionStorage.setItem('extras', JSON.stringify(extrasList));
                    sessionStorage.setItem('sauces', JSON.stringify(saucesList));
                    sessionStorage.setItem('payment_methods', JSON.stringify(paymentMethodsList));
                    setProducts(productsList);
                    setMessage('');
                } else {
                    throw new Error('No se recibieron productos');
                }
            } catch (error) {
                console.log('Error al obtener los productos:', error);
                const storedProducts = sessionStorage.getItem('products');
                const storedExtras = sessionStorage.getItem('extras');
                const storedSauces = sessionStorage.getItem('sauces');
                const storedPaymentMethods = sessionStorage.getItem('payment_methods');
                if (storedProducts) {
                    sessionStorage.setItem('extras', storedExtras);
                    sessionStorage.setItem('sauces', storedSauces);
                    sessionStorage.setItem('payment_methods', storedPaymentMethods);
                    setProducts(storedProducts ? JSON.parse(storedProducts) : []);
                    setMessage({ text: 'No se pudo actualizar, mostrando productos guardados.', type: 'info' });
                } else {
                    setMessage({ text: 'No hay productos disponibles.', type: 'error' });
                }
            }
            setLoading(false);
        };

        fetchData();
    }, [setLoading, setMessage]);

    const filtered = selectedCategory
        ? products.filter((p) => p.idCategory === selectedCategory)
        : products;

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        setShowOptions(true);
    };

    return (
        <div>
            <div className="grid grid-cols-3 gap-4 p-4">
                {filtered.length === 0 ? (
                    <div className="col-span-3 text-center text-gray-500">
                        No hay productos para mostrar.
                    </div>
                ) : (
                    filtered.map((product) => (
                        <div
                            key={product.idProduct}
                            className="aspect-square bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col"
                            onClick={() => handleProductClick(product)}
                        >
                            <img
                                src={product.image || 'https://via.placeholder.com/150'}
                                alt={product.name}
                                className="w-full h-2/3 object-cover"
                            />
                            <div className="h-1/3 flex items-center justify-center px-2 text-center text-sm font-semibold text-black dark:text-white">
                                {product.name}
                            </div>
                        </div>
                    ))
                )}
            </div>
            <ProductOptionsModal
                isOpen={showOptions}
                onClose={() => setShowOptions(false)}
                product={selectedProduct}
                loading={loading}
                message={message}
            />
        </div>
    );
}

export default ProductGrid;
