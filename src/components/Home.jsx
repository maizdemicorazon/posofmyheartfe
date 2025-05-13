import TopNav from './menu/TopNav';
import ProductGrid from './grid/ProductGrid';
import { useState } from 'react';

function Home() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <>
      <TopNav
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <ProductGrid selectedCategory={selectedCategory} />
    </>
  );
}

export default Home;
