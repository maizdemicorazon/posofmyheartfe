import { useEffect, useMemo, useState, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl } from '../../utils/helpers';

// API real para productos
const fetchProductsApi = async () => {
  try {
    const response = await fetch('http://localhost:8081/api/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000) // ✅ 15 segundos timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
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
        console.log('🔍 Fetching products from API...');

        const response = await fetchProductsApi();
        console.log('📦 Products API response:', response);

        if (response.products && response.products.length > 0) {
          console.log('✅ Products loaded:', response.products.length);
          setProducts(response.products);
          setExtras(response.extras || []);
          setSauces(response.sauces || []);
          setMessage(null);
          hasFetched.current = true; // ✅ Marcar como cargado exitosamente
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
          errorMessage = 'No se puede conectar al servidor. Verifica que esté corriendo en http://localhost:8081';
        } else if (error.message.includes('HTTP error')) {
          errorMessage = `Error del servidor: ${error.message}`;
        }

        setMessage({
          text: errorMessage,
          type: 'error'
        });
      } finally {
        setLoading(false);
        isCurrentlyFetching.current = false;
      }
    };

    fetchData();

    // ✅ Solo incluir dependencias que realmente importan para el timing del fetch
    // Remover los setters que causan renders innecesarios
  }, [products.length]); // ✅ Solo products.length como dependencia

  // ✅ Función para refrescar datos manualmente (si necesitas)
  const refreshProducts = () => {
    hasFetched.current = false;
    isCurrentlyFetching.current = false;
    // Esto va a triggear el useEffect porque products.length cambiará
    setProducts([]);
  };

  // ✅ Filtrado optimizado con useMemo
  const filteredProducts = useMemo(() => {
    console.log('🔍 Filtering products. Category:', selectedCategory, 'Total products:', products.length);

    const filtered = selectedCategory
      ? products.filter((p) => p.id_category === selectedCategory)
      : products;

    console.log('✅ Filtered products:', filtered.length);
    return filtered;
  }, [products, selectedCategory]);

  // ✅ FUNCIÓN DE CLICK CORREGIDA
  const handleProductClick = (product) => {
    console.log('🎯 ProductGrid: Product clicked', product);

    if (typeof onProductClick === 'function') {
      onProductClick(product);
    } else {
      console.error('❌ onProductClick is not a function');
    }
  };

  // ✅ FUNCIÓN PARA OBTENER IMAGEN OPTIMIZADA con tema
  const getOptimizedImage = (product) => {
    const isDark = theme === 'dark';
    const optimizedUrl = optimizeGoogleDriveImageUrl(product.image, 300);
    return optimizedUrl || generatePlaceholderUrl(product.name, 300, isDark);
  };

  // ✅ Componente de imagen optimizado CON PREVENCIÓN DE LOOP INFINITO
  const ProductImage = ({ product, className }) => {
    const [imageState, setImageState] = useState({
      isLoading: true,
      hasError: false,
      currentSrc: getOptimizedImage(product),
      errorCount: 0
    });

    const handleImageLoadSuccess = () => {
      setImageState(prev => ({
        ...prev,
        isLoading: false,
        hasError: false
      }));
      console.log(`✅ Image loaded successfully for ${product.name}`);
    };

    const handleImageError = (e) => {
      setImageState(prev => {
        // ✅ PREVENIR LOOP INFINITO: Solo permitir un cambio a placeholder
        if (prev.errorCount >= 1) {
          console.log(`❌ Image failed multiple times for ${product.name}, stopping retries`);
          return {
            ...prev,
            isLoading: false,
            hasError: true
          };
        }

        const placeholderSrc = generatePlaceholderUrl(product.name, 300, theme === 'dark');
        console.log(`❌ Image failed for ${product.name}, using placeholder`);

        e.target.src = placeholderSrc;

        return {
          ...prev,
          isLoading: false,
          hasError: true,
          currentSrc: placeholderSrc,
          errorCount: prev.errorCount + 1
        };
      });
    };

    return (
      <div className={`relative ${className}`}>
        {/* Indicador de carga mejorado */}
        {imageState.isLoading && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center rounded-lg z-10">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* ✅ Imagen con manejo de estados mejorado */}
        <img
          src={imageState.currentSrc}
          alt={product.name}
          className="w-full h-full object-cover relative z-20 rounded-lg"
          onLoad={handleImageLoadSuccess}
          onError={handleImageError}
          loading="lazy"
          style={{
            display: imageState.isLoading ? 'none' : 'block'
          }}
        />

        {/* Estado de error persistente */}
        {imageState.hasError && imageState.errorCount >= 1 && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center rounded-lg z-30">
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
              {product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div
        className={
          isMobile
            ? "grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4"
            : "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5 p-4 lg:p-5"
        }
      >
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No hay productos para mostrar</h3>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              {selectedCategory
                ? 'No hay productos en esta categoría. Intenta con otra categoría.'
                : 'Intenta refrescar la página o verifica tu conexión.'
              }
            </p>
            {/* ✅ Botón para refrescar manualmente si hay error */}
            <button
              onClick={refreshProducts}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refrescar productos
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={`product-${product.id_product}`} // ✅ Key único corregido
              className={`aspect-square bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col cursor-pointer hover:ring-2 ring-blue-400 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 ${
                isMobile ? 'min-h-[140px]' : 'min-h-[180px]'
              }`}
              onClick={() => handleProductClick(product)}
            >
              {/* ✅ Contenedor de imagen mejorado */}
              <ProductImage
                product={product}
                className="w-full h-2/3 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
              />

              {/* ✅ Contenedor del texto mejorado */}
              <div className="h-1/3 flex items-center justify-center px-3 py-2 text-center">
                <span className={`font-semibold text-black dark:text-white ${
                  isMobile ? 'text-sm' : 'text-sm lg:text-base'
                } line-clamp-2 leading-tight`}>
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