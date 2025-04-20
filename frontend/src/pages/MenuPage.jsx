import React, { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import ProductCategory from "../components/ProductCategory";
import ProductItem from "../components/ProductItem";
import OrderSummary from "../components/OrderSummary";

const API_URL = import.meta.env.VITE_API_URL;

const MenuPage = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        throw new Error('Không thể tải danh mục');
      }
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err.message);
      console.error('Lỗi khi tải danh mục:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        throw new Error('Không thể tải sản phẩm');
      }
      
      const data = await response.json();
      setProducts(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Lỗi khi tải sản phẩm:', err);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (query) => {
    setSearchQuery(query.toLowerCase());
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery) ||
      (product.description && product.description.toLowerCase().includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Search bar */}
      <SearchBar onSearch={handleSearch} />

      <div className="flex flex-1 overflow-hidden">
        {/* Product section */}
        <div className="flex-1 p-6 overflow-y-auto">
          <ProductCategory 
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductItem 
                  key={product.id} 
                  product={product}
                  onAddToOrder={(item) => {
                    // This will be handled by OrderSummary
                    const event = new CustomEvent('addToOrder', { detail: item });
                    window.dispatchEvent(event);
                  }}
                />
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 py-8">
                Không tìm thấy sản phẩm nào phù hợp
              </div>
            )}
          </div>
        </div>

        {/* Order summary */}
        <OrderSummary />
      </div>
    </div>
  );
};

export default MenuPage; 