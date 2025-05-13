function TopNav({ selectedCategory, onSelectCategory }) {
  const categories = [
    { id: null, name: 'Todos' },
    { id: 1, name: 'Elotes' },
    { id: 2, name: 'Esquites' },
    { id: 3, name: 'Bebidas' }
  ];

  return (
    <div className="overflow-x-auto whitespace-nowrap bg-gray-200 dark:bg-gray-800 px-4 py-2">
      <div className="inline-flex gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`px-4 py-2 rounded ${
              selectedCategory === cat.id
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white text-black dark:bg-gray-800 dark:text-white'
            }`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TopNav;
