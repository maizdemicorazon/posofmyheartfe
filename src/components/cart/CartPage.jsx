import Cart from '../cart/Cart';
import BusinessHeader from '../menu/BusinessHeader';

function CartPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Cart
          onCloseCart={onBack}
          isMobile={false}
          showBackButton={true}
        />
      </div>
    </div>
  );
}

export default CartPage;