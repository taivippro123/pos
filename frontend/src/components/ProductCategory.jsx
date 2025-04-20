import React from "react";

const ProductCategory = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
      <button 
        onClick={() => onSelectCategory(null)}
        className={`px-4 py-2 rounded-lg border ${
          selectedCategory === null 
            ? 'bg-green-50 border-green-200 text-green-600' 
            : 'border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-600'
        } font-medium transition-colors whitespace-nowrap`}
      >
        Tất cả
      </button>
      {categories.map((category) => (
        <button 
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`px-4 py-2 rounded-lg border ${
            selectedCategory === category.id 
              ? 'bg-green-50 border-green-200 text-green-600' 
              : 'border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-600'
          } font-medium transition-colors whitespace-nowrap`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default ProductCategory;
