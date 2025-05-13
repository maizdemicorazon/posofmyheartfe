import { useEffect, useState } from 'react';
import ProductOptionsModal from './ProductOptionsModal';

function ProductGrid({ selectedCategory }) {
    const [products, setProducts] = useState([]);
    const [showOptions, setShowOptions] = useState(false);
    const [extras, setExtras] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {

        const fetchData = async () => {
            let urlBase = "https://posofmyheart-develop.up.railway.app/"
            let endponitApiProducts = "api/products";
            let urlGetApiProducts = urlBase + endponitApiProducts;

            try {
                const res = await fetch(urlGetApiProducts);
                if (!res.ok) throw new Error('Respuesta Fail');
                const response = await res.json();

                if (response.products && response.products.length > 0) {
                    sessionStorage.setItem('products', JSON.stringify(response.products));
                    setProducts(response.products);
                    sessionStorage.setItem('extras', JSON.stringify(response.extras));
                    setExtras(response.extras);
                    setErrorMsg('');
                } else {
                    throw new Error('No se recibieron productos');
                }
            } catch (error) {
                console.log('Error al obtener los productos:', error);
                const storedProducts = sessionStorage.getItem('products');
                const storedExtras = sessionStorage.getItem('extras');
                if (storedProducts) {
                    setProducts(JSON.parse(storedProducts));
                    setExtras(storedExtras ? JSON.parse(storedExtras) : []);
                    setErrorMsg('No se pudo actualizar, mostrando productos guardados.');
                } else {
                    setProducts([]);
                    setExtras([]);
                    setErrorMsg('No hay productos disponibles.');
                }
            }
        };

        fetchData();
    }, []);

    const filtered = selectedCategory
        ? products.filter((p) => p.idCategory === selectedCategory)
        : products;

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        setShowOptions(true);
    };

    return (
        <div>
            {errorMsg && (
                <div className="text-center text-red-600 font-semibold mb-2">
                    {errorMsg}
                </div>
            )}
            <div className="grid grid-cols-3 gap-4 p-4">
                {filtered.length === 0 ? (
                    <div className="col-span-3 text-center text-gray-500">
                        No hay productos para mostrar.
                    </div>
                ) : (
                    filtered.map((product) => (
                        <div
                            key={product.id}
                            className="aspect-square bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col"
                            onClick={() => handleProductClick(product)}
                        >
                            <img
                                src={product.image}
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
                extras={extras}
            />
        </div>
    );
}

export default ProductGrid;
