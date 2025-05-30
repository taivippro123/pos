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
  }).sort((a, b) => {
    // Sắp xếp theo giảm giá trước (từ cao đến thấp)
    if (a.discount_percent !== b.discount_percent) {
      return (b.discount_percent || 0) - (a.discount_percent || 0);
    }
    // Nếu giảm giá bằng nhau, sắp xếp theo số lượng đã bán
    return (b.total_sold || 0) - (a.total_sold || 0);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
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
    <div className="flex-1 flex flex-col h-screen">
      {/* Search bar */}
      <SearchBar onSearch={handleSearch} />

      <div className="flex flex-1 overflow-hidden">
        {/* Product section - scrollable */}
        <div className="flex-1 p-6 overflow-y-auto">
          <ProductCategory 
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
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

        {/* Order summary - fixed */}
        <div className="w-[400px] border-l border-gray-200">
          <OrderSummary />
        </div>
      </div>
    </div>
  );
};

export default MenuPage; 