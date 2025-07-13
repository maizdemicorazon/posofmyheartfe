import { useEffect, useMemo, useState, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useLoading } from '../../context/LoadingContext';
import { useTheme } from '../../context/ThemeContext';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl } from '../../utils/helpers';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import { getProducts, getImageById } from '../../utils/api';
import { API_CONFIG } from '../../config/config.server';

function ProductGrid({ selectedCategory, onProductClick, isMobile }) {
  const { products, setProducts, setExtras, setSauces, setPaymentMethods } = useCart();
  const { setLoading } = useLoading();
  const { theme } = useTheme();

  // ✅ Usar useRef para evitar dobles peticiones
  const hasFetched = useRef(false);
  const isCurrentlyFetching = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      // ✅ Prevenir múltiples llamadas simultáneas
      if (isCurrentlyFetching.current) {
        console.log('🚫 Ya hay una petición en curso, saltando...');
        return;
      }

      // ✅ Si ya se cargaron productos y hay data, no volver a cargar
      if (hasFetched.current && products.length > 0) {
        console.log('✅ Productos ya cargados, saltando fetch');
        return;
      }

      isCurrentlyFetching.current = true;
      setLoading(true);

      try {
        console.log(`🔍 Fetching products from API: ${API_CONFIG.BASE_URL}`);

        // ✅ USAR LA NUEVA FUNCIÓN DE API
        const response = await getProducts();
        console.log('📦 Products API response:', response);

        if (response.products && response.products.length > 0) {
          console.log('✅ Products loaded:', response.products.length);
          setProducts(response.products);
          setExtras(response.extras || []);
          setSauces(response.sauces || []);
          setPaymentMethods(response.payment_methods || []);
          hasFetched.current = true;
        } else {
          throw new Error('No se recibieron productos');
        }
      } catch (error) {
        console.error('❌ Error al obtener los productos:', error);
        hasFetched.current = false; // ✅ Permitir retry en caso de error

        let errorMessage = 'Error de conexión con el servidor.';

        if (error.name === 'TimeoutError') {
          errorMessage = 'Tiempo de espera agotado. Verifica que el backend esté corriendo.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `No se puede conectar al servidor. Verifica que esté corriendo en ${API_CONFIG.BASE_URL}`;
        } else if (error.message.includes('HTTP error')) {
          errorMessage = `Error del servidor: ${error.message}`;
        }
        showError(
            errorMessage
        );
      } finally {
        setLoading(false);
        isCurrentlyFetching.current = false;
      }
    };

    // Solo cargar si no hay productos o si no se ha cargado exitosamente
    if (!hasFetched.current || products.length === 0) {
      fetchData();
    }
  }, [products.length, setProducts, setExtras, setSauces, setLoading]);

  // ✅ Filtrado optimizado con useMemo
  const filteredProducts = useMemo(() => {
    console.log('🔍 Filtering products. Selected category:', selectedCategory, 'Total products:', products.length);

    if (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'Todos') {
      console.log('📦 Showing all products:', products.length);
      return products;
    }

    const filtered = products.filter(product => {
      const productCategory = product.id_category || product.id_category || '';
      const match = productCategory === selectedCategory;
      return match;
    });

    console.log(`📦 Filtered products for "${selectedCategory}":`, filtered.length);
    return filtered;
  }, [products, selectedCategory]);

  // Estados para manejar imágenes por producto
  const [imageStates, setImageStates] = useState({});
  const imageRefs = useRef({});

  // ✅ FUNCIÓN PARA OPTIMIZAR IMAGEN DE PRODUCTO CON PROTECCIÓN ANTI-LOOP
  const getOptimizedProductImage = (product) => {
    const isDark = theme === 'dark';
    if (!product?.name) {
      return generatePlaceholderUrl(product?.name || 'Producto', 400, isDark);
    }
    return optimizeGoogleDriveImageUrl(product.image, 400) || generatePlaceholderUrl(product.name, 400, isDark);
  };

  const handleImageError = (productId, productName) => {
    setImageStates(prev => {
      if (prev[productId]?.errorCount >= 1) {
        console.log(`❌ Product image failed multiple times for ${productName}, stopping retries`);
        return prev;
      }

      const placeholderSrc = generatePlaceholderUrl(productName, 400, theme === 'dark');
      console.log(`❌ Product image failed for ${productName}, using SVG placeholder`);

      // Cambiar la src del elemento img
      if (imageRefs.current[productId]) {
        imageRefs.current[productId].src = placeholderSrc;
      }

      return {
        ...prev,
        [productId]: {
          hasError: true,
          errorCount: (prev[productId]?.errorCount || 0) + 1
        }
      };
    });
  };

  if (filteredProducts.length === 0 && products.length > 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[50vh] p-8 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No hay productos en esta categoría</h3>
        <p className="text-center max-w-md">
          No se encontraron productos para "{selectedCategory}".
          Intenta seleccionar otra categoría.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${
      isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    } p-4`}>
      {filteredProducts.map((product) => (
        <div
          key={product.id_product}
          onClick={() => onProductClick && onProductClick(product)}
          className={`rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg cinzel-decorative-regular
              bg-gradient-to-br from-green-600 via-green-300 to-green-600 shadow-lg ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="relative">
            <div className={`w-full h-60 rounded-t-lg overflow-hidden ${
              theme === 'dark' ? 'bg-gray-100' : 'bg-gray-50'
            }`}>
              <img
                ref={el => imageRefs.current[product.id_product] = el}
                src={getImageById(product.id_image)}
                alt={product.name}
                className="w-full h-full object-cover rounded-t-lg"
                loading="lazy"
                onError={() => handleImageError(product.id_product, product.name)}
              />
            </div>

            {/* Overlay con error de imagen */}
            {imageStates[product.id_product]?.hasError && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded-t-lg flex flex-col items-center justify-center">
                <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <span className="text-xs text-gray-500 text-center px-2">{product.name}</span>
              </div>
            )}
          </div>

          <div className="p-2">
            <h3 className={`text-center ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {product.name}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductGrid;