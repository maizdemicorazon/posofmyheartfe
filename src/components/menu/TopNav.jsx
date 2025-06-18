import { Bars3Icon } from '@heroicons/react/24/outline';
import BusinessHeader from './BusinessHeader';

function TopNav({ selectedCategory, onSelectCategory, onMenuClick }) {
  const categories = [
    { id: null, name: 'Todos' },
    { id: 1, name: 'Esquites' },      // id_category: 1
    { id: 2, name: 'Elotes' },        // id_category: 2
    { id: 3, name: 'Bebidas' },       // id_category: 3
    { id: 4, name: 'Especiales' },    // id_category: 4 (Maíz Puerco)
    { id: 5, name: 'Antojitos' }      // id_category: 5 (Tostitos/Doritos)
  ];

  return (
    <div className="w-full">
      <BusinessHeader />

      <div className="flex items-center gap-2 bg-green-600 py-2 px-3 shadow-sm border-t border-green-700">
        <button
          onClick={onMenuClick}
          className="mr-2 p-2 rounded bg-white hover:bg-yellow-300 transition-colors duration-200"
          aria-label="Menú"
        >
          <Bars3Icon className="w-7 h-7 text-red-600" />
        </button>

        <button
          className={`mr-1 px-3 py-1 rounded font-semibold border-2 transition-all duration-200 ${
            selectedCategory === null
              ? 'bg-yellow-300 border-yellow-300 text-gray-800 shadow-sm'
              : 'bg-white border-white text-gray-800 hover:bg-yellow-200 hover:shadow-sm'
          }`}
          onClick={() => onSelectCategory(null)}
        >
          Todos
        </button>

        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {categories
            .filter(cat => cat.id !== null)
            .map((cat) => (
              <button
                key={cat.id}
                className={`px-3 py-1 rounded font-semibold border-2 transition-all duration-200 whitespace-nowrap
                  ${selectedCategory === cat.id
                    ? 'bg-red-600 border-red-600 text-white shadow-sm'
                    : 'bg-white border-white text-gray-800 hover:bg-red-500 hover:text-white hover:shadow-sm'}
                `}
                onClick={() => onSelectCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default TopNav;