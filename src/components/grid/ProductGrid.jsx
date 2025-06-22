import { useEffect, useMemo, useState, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext';
import { optimizeGoogleDriveImageUrl, generatePlaceholderUrl } from '../../utils/helpers';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import { getProducts } from '../../utils/api';
import { API_CONFIG } from '../../config/constants';

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
        console.log(`🔍 Fetching products from API: ${API_CONFIG.BASE_URL}`);

        // ✅ USAR LA NUEVA FUNCIÓN DE API
        const response = await getProducts();
        console.log('📦 Products API response:', response);

        if (response.products && response.products.length > 0) {
          console.log('✅ Products loaded:', response.products.length);

          // ✅ Log para debug de estructura de productos
          console.log('🔍 Product structure sample:', response.products[0]);

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
          errorMessage = `No se puede conectar al servidor. Verifica que esté corriendo en ${API_CONFIG.BASE_URL}`;
        } else if (error.message.includes('HTTP error')) {
          errorMessage = `Error del servidor: ${error.message}`;
        }

        setMessage({
          text: errorMessage,
          type: 'error'
        });
      } finally {
        setLoading(false);
        isCurrentlyFetching.current = false; // ✅ Liberar el flag
      }
    };

    // Solo cargar si no hay productos o si no se ha cargado exitosamente
    if (!hasFetched.current || products.length === 0) {
      fetchData();
    }
  }, [products.length, setProducts, setExtras, setSauces, setLoading, setMessage]);

  // ✅ Filtrado optimizado con useMemo - CORREGIDO
  const filteredProducts = useMemo(() => {
    console.log('🔍 Filtering products. Selected category:', selectedCategory, 'Total products:', products.length);

    // Si no hay categoría seleccionada o es null/todos, mostrar todos los productos
    if (!selectedCategory || selectedCategory === null || selectedCategory === 'all' || selectedCategory === 'Todos') {
      console.log('📦 Showing all products:', products.length);
      return products;
    }

    // ✅ FILTRADO CORREGIDO: Comparar IDs numéricos
    const filtered = products.filter(product => {
      // Log para debug
      console.log(`🔍 Product ${product.name}: id_category=${product.id_category}, category_name=${product.category_name}`);

      // Obtener el ID de categoría del producto
      const productCategoryId = product.id_category || product.category?.id || null;

      // Comparar IDs numéricos
      const match = Number(productCategoryId) === Number(selectedCategory);

      if (match) {
        console.log(`✅ Match found: Product "${product.name}" in category ${productCategoryId}`);
      }

      return match;
    });

    console.log(`📦 Filtered products for category ID "${selectedCategory}":`, filtered.length);
    console.log('📦 Filtered products:', filtered.map(p => ({ id: p.id_product, name: p.name, category: p.id_category })));

    return filtered;
  }, [products, selectedCategory]);

  // Estados para manejar imágenes por producto
  const [imageStates, setImageStates] = useState({});
  const imageRefs = useRef({});

  // ✅ FUNCIÓN PARA OPTIMIZAR IMAGEN DE PRODUCTO CON PROTECCIÓN ANTI-LOOP
  const getOptimizedProductImage = (product) => {
    const isDark = theme === 'dark';
    if (!product?.image) {
      return generatePlaceholderUrl(product?.name || 'Producto', 400, isDark);
    }
    return optimizeGoogleDriveImageUrl(product.image, 400) || generatePlaceholderUrl(product.name, 400, isDark);
  };

  const handleImageError = (productId, productName) => {
    setImageStates(prev => {
      // Prevenir loop infinito
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

  // ✅ Mensaje cuando no hay productos en la categoría
  if (filteredProducts.length === 0 && products.length > 0) {
    // Buscar el nombre de la categoría seleccionada
    const categoryNames = {
      1: 'Esquites',
      2: 'Elotes',
      3: 'Bebidas',
      4: 'Especiales',
      5: 'Antojitos'
    };

    const categoryName = categoryNames[selectedCategory] || `categoría ${selectedCategory}`;

    return (
      <div className={`flex flex-col items-center justify-center min-h-[50vh] p-8 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No hay productos en esta categoría</h3>
        <p className="text-center max-w-md">
          No se encontraron productos para "{categoryName}".
          Intenta seleccionar otra categoría.
        </p>
      </div>
    );
  }

  // ✅ Mensaje cuando no hay productos cargados
  if (products.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[50vh] p-8 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className="text-6xl mb-4 animate-pulse">⏳</div>
        <h3 className="text-xl font-semibold mb-2">Cargando productos...</h3>
        <p className="text-center max-w-md">
          Por favor espera mientras cargamos el catálogo de productos.
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
          className={`rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="relative">
            {/* ✅ Imagen del producto CORREGIDA con protección anti-loop */}
            <img
              ref={el => imageRefs.current[product.id_product] = el}
              src={getOptimizedProductImage(product)}
              alt={product.name}
              className="w-full h-40 object-cover rounded-t-lg"
              loading="lazy"
              onError={() => handleImageError(product.id_product, product.name)}
            />

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

          <div className="p-3">
            <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {product.name}
            </h3>

            {product.description && (
              <p className={`text-xs mb-2 line-clamp-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {product.description}
              </p>
            )}

            <div className="flex justify-between items-center">
              <span className="font-bold text-green-600">
                {product.price ? `$${product.price}` : 'Ver opciones'}
              </span>

              {product.category_name && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {product.category_name}
                </span>
              )}
            </div>

            {/* ✅ Badge de ID de categoría para debug (puedes quitar esto en producción) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-1 text-xs text-gray-500">
                Cat ID: {product.id_category || 'N/A'}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductGrid;