import { useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';

// API real para productos
const fetchProductsApi = async () => {
  try {
    const response = await fetch('http://localhost:8081/api/products');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

function ProductGrid({ selectedCategory, onProductClick, isMobile }) {
  const { products, setProducts, setExtras, setSauces } = useCart();
  const { setLoading } = useLoading();
  const { setMessage } = useMessage();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetchProductsApi();

        if (response.products && response.products.length > 0) {
          setProducts(response.products);
          setExtras(response.extras || []);
          setSauces(response.sauces || []);
          setMessage(null);
        } else {
          throw new Error('No se recibieron productos');
        }
      } catch (error) {
        console.error('Error al obtener los productos:', error);
        setMessage({
          text: 'Error de conexión con el servidor.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    if (products.length === 0) {
      fetchData();
    }
  }, [products.length, setProducts, setExtras, setSauces, setLoading, setMessage]);

  const filteredProducts = useMemo(() => {
    return selectedCategory
      ? products.filter((p) => p.id_category === selectedCategory)
      : products;
  }, [products, selectedCategory]);

  // Función mejorada para manejar errores de imagen
  const handleImageError = (e, product) => {
    const img = e.target;
    const originalSrc = img.src;

    if (img.dataset.errorHandled) {
      return;
    }

    console.log(`❌ Error loading image for ${product.name}:`, originalSrc);
    img.dataset.errorHandled = 'true';

    let fileId = null;
    if (originalSrc.includes('drive.google.com')) {
      const idMatch = originalSrc.match(/id=([^&]+)/);
      if (idMatch) {
        fileId = idMatch[1];
      }
    }

    if (fileId && originalSrc.includes('uc?export=view')) {
      img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w300-h300-c`;
    } else {
      const productName = encodeURIComponent(product.name.substring(0, 20));
      img.src = `https://via.placeholder.com/200x200/e0e0e0/666?text=${productName}`;
    }
  };

  const handleImageLoad = (product) => {
    console.log(`✅ Image loaded successfully for ${product.name}`);
  };

  // FUNCIÓN DE CLICK CORREGIDA
  const handleProductClick = (product) => {
    console.log('ProductGrid: Product clicked', product); // Debug
    if (typeof onProductClick === 'function') {
      onProductClick(product);
    } else {
      console.error('onProductClick is not a function');
    }
  };

  return (
    <div>
      <div
        className={
          isMobile
            ? "grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3"
            : "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4 p-3 lg:p-4"
        }
      >
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No hay productos para mostrar</h3>
            <p className="text-gray-500 text-sm">Intenta con otra categoría o verifica tu conexión.</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id_product}
              className="aspect-square bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col cursor-pointer hover:ring-2 ring-blue-400 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1"
              onClick={() => handleProductClick(product)}
            >
              <div className="w-full h-2/3 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                {/* Indicador de carga */}
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <img
                  src={product.image || `https://via.placeholder.com/200x200/e0e0e0/666?text=${encodeURIComponent(product.name.substring(0, 20))}`}
                  alt={product.name}
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => handleImageError(e, product)}
                  onLoad={() => handleImageLoad(product)}
                  loading="lazy"
                />
              </div>

              <div className="h-1/3 flex items-center justify-center px-2 text-center">
                <span className={`font-semibold text-black dark:text-white ${
                  isMobile ? 'text-sm' : 'text-sm lg:text-base'
                }`}>
                  {product.name}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProductGrid;