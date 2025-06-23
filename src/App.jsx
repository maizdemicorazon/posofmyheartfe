import { useState } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import { MessageProvider } from './context/MessageContext';
import Layout from './Layouts/Layout';
import Home from './components/Home';
import CartPage from './components/cart/CartPage';
import ProductOptionsModal from './components/grid/ProductOptionsModal';
import Orders from './components/orders/Orders';
import DailyEarnings from './components/metrics/DailyEarnings';
import EarningsChart from './components/metrics/EarningsChart';
import SalesReport from './components/reports/SalesReport';

function AppContent() {
  const { editingProduct, saveEditProduct, cancelEditProduct, products } = useCart();
  const [view, setView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // ✅ FUNCIÓN HELPER PARA OBTENER EL PRODUCTO ORIGINAL PARA EDICIÓN
  const getOriginalProductForEditing = (cartItem) => {
    console.log('🔍 Looking for original product:', {
      cartItem,
      cartItemType: typeof cartItem,
      isNumber: typeof cartItem === 'number',
      products: products?.length || 0
    });

    // ✅ VERIFICAR SI ES UN NÚMERO (ÍNDICE) - ERROR COMÚN
    if (typeof cartItem === 'number') {
      console.error('❌ ERROR: Received index instead of cart item object:', cartItem);
      return null;
    }

    if (!cartItem || !products) {
      console.warn('❌ Missing cartItem or products array');
      return null;
    }

    // Buscar el producto original por ID
    const originalProduct = products.find(p => {
      const match = p.id_product === cartItem.id_product ||
                   p.id_product === cartItem.product?.id_product;

      if (match) {
        console.log('✅ Found matching product:', {
          productId: p.id_product,
          productName: p.name,
          cartItemId: cartItem.id_product
        });
      }

      return match;
    });

    if (!originalProduct) {
      console.warn('❌ Original product not found for cart item:', {
        cartItem,
        searchingFor: cartItem.id_product || cartItem.product?.id_product,
        availableProducts: products.map(p => ({ id: p.id_product, name: p.name }))
      });
      return null;
    }

    return originalProduct;
  };

  // ✅ FUNCIÓN HELPER PARA MAPEAR DATOS INICIALES DEL CARRITO AL MODAL
  const mapCartItemToInitialValues = (cartItem) => {
    console.log('🗂️ Mapping cart item to initial values:', cartItem);

    if (!cartItem) return {};

    const mapped = {
      // Cantidad
      initialQuantity: cartItem.quantity || 1,

      // ✅ OPCIÓN SELECCIONADA - Buscar en múltiples ubicaciones
      initialOptions: (() => {
        if (cartItem.selectedOption) return [cartItem.selectedOption];
        if (cartItem.variant) return [cartItem.variant];

        // Si no hay selectedOption, crear uno desde los datos del carrito
        if (cartItem.id_variant && cartItem.variant_name) {
          return [{
            id_variant: cartItem.id_variant,
            size: cartItem.variant_name,
            price: cartItem.product?.options?.find(opt => opt.id_variant === cartItem.id_variant)?.price || 0
          }];
        }

        return [];
      })(),

      // ✅ SABOR SELECCIONADO - Buscar en múltiples ubicaciones y crear estructura consistente
      initialFlavors: (() => {
        if (cartItem.selectedFlavor) {
          console.log('🍋 Using selectedFlavor:', cartItem.selectedFlavor);
          return [cartItem.selectedFlavor];
        }
        if (cartItem.flavor) {
          console.log('🍋 Using flavor:', cartItem.flavor);
          return [cartItem.flavor];
        }
        console.log('🍋 No flavor found in cart item');
        return [];
      })(),

      // ✅ EXTRAS SELECCIONADOS - Mapear correctamente la estructura
      initialExtras: (() => {
        const extras = cartItem.selectedExtras || cartItem.extras || [];
        console.log('🔧 Mapping extras:', extras);
        return Array.isArray(extras) ? extras : [];
      })(),

      // ✅ SALSAS SELECCIONADAS - Mapear correctamente la estructura
      initialSauces: (() => {
        const sauces = cartItem.selectedSauces || cartItem.sauces || [];
        console.log('🌶️ Mapping sauces:', sauces);
        return Array.isArray(sauces) ? sauces : [];
      })(),

      // Comentario
      initialComment: cartItem.comment || ''
    };

    console.log('🗂️ Mapped initial values:', mapped);
    return mapped;
  };

  // ✅ DEBUG: Log para verificar estructura del editingProduct
  if (editingProduct) {
    console.log('🔄 EditingProduct received:', {
      editingProduct,
      type: typeof editingProduct,
      isNumber: typeof editingProduct === 'number',
      isObject: typeof editingProduct === 'object',
      hasId: editingProduct?.id,
      hasIdProduct: editingProduct?.id_product,
      originalProduct: getOriginalProductForEditing(editingProduct),
      productsLength: products?.length || 0
    });
  }

  return (
    <Layout
      view={view}
      setView={setView}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
    >
      {/* Renderizar solo según la vista actual */}
      {view === 'home' && <Home selectedCategory={selectedCategory} />}
      {view === 'cart' && <CartPage onBack={() => setView('home')} />}
      {view === 'orders' && <Orders onBack={() => setView('home')} />}
      {view === 'metrics' && <DailyEarnings onBack={() => setView('home')} />}
      {view === 'earnings-chart' && <EarningsChart onBack={() => setView('home')} />}
      {view === 'sales-report' && <SalesReport onBack={() => setView('home')} />}

      {/* ✅ MODAL DE EDICIÓN DE PRODUCTO CORREGIDO */}
      {editingProduct && (() => {
        console.log('🎭 Modal rendering with editingProduct:', editingProduct);

        // ✅ VERIFICAR SI ES UN NÚMERO (ERROR COMÚN)
        if (typeof editingProduct === 'number') {
          console.error('❌ CRITICAL ERROR: editingProduct is a number (index), not an object!');
          console.error('This means Cart.jsx is still passing the index instead of the product object.');
          cancelEditProduct(); // Cancelar para evitar errores
          return null;
        }

        const originalProduct = getOriginalProductForEditing(editingProduct);
        const initialValues = mapCartItemToInitialValues(editingProduct);

        console.log('🎭 Modal data prepared:', {
          originalProduct: !!originalProduct,
          initialValues,
          productName: originalProduct?.name || 'No encontrado'
        });

        // Si no se encuentra el producto original, mostrar error y cancelar
        if (!originalProduct) {
          console.error('❌ Cannot edit product: original product not found');
          console.error('Available products:', products?.map(p => ({ id: p.id_product, name: p.name })));

          // Mostrar alerta al usuario
          setTimeout(() => {
            alert('Error: No se puede editar este producto. El producto original no se encontró en el catálogo.');
            cancelEditProduct();
          }, 100);

          return null;
        }

        return (
          <ProductOptionsModal
            isOpen={true}
            onClose={cancelEditProduct}
            product={originalProduct} // ✅ Producto original con todas sus opciones
            {...initialValues} // ✅ Valores iniciales mapeados correctamente
            onSave={saveEditProduct}
            isEditing={true}
          />
        );
      })()}
    </Layout>
  );
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <LoadingProvider>
          <MessageProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </MessageProvider>
        </LoadingProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;