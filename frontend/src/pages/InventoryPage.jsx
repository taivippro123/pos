import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash, Image as ImageIcon, Search, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_URL = import.meta.env.VITE_API_URL;

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProduct, setNewProduct] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    discount_percent: 0,
    image_url: '',
    manage_stock: false,
    stock_quantity: null
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'category' or 'product'

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Không thể tải danh sách sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Không thể tải danh sách danh mục');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
  
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('api_key', CLOUDINARY_API_KEY);
        formData.append('folder', 'products');
  
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );
  
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Cloudinary upload error:', errorData);
          throw new Error('Failed to upload image');
        }
  
        const data = await response.json();
        if (data.secure_url) {
          setNewProduct({ ...newProduct, image_url: data.secure_url });
          toast.success('Tải ảnh lên thành công');
        } else {
          throw new Error('No secure URL returned from Cloudinary');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Lỗi upload ảnh: Failed to upload image. Please try lại.');
      }
    }
  };
  
  const handleAddProduct = async () => {
    try {
      setIsLoading(true);
      if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
        toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }
  
      if (newProduct.manage_stock && !newProduct.stock_quantity) {
        toast.warning('Vui lòng nhập số lượng tồn kho');
        return;
      }
  
      if (!newProduct.image_url) {
        toast.warning('Vui lòng tải ảnh sản phẩm');
        return;
      }
  
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });
  
      if (response.ok) {
        await fetchProducts();
        setIsAddModalOpen(false);
        resetForm();
        toast.success('Thêm sản phẩm thành công');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Lỗi khi thêm sản phẩm');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Lỗi khi thêm sản phẩm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddCategory = async () => {
    try {
      setIsLoading(true);
      if (!newCategory.name) {
        toast.warning('Vui lòng nhập tên danh mục');
        return;
      }
  
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });
  
      if (response.ok) {
        await fetchCategories();
        setIsCategoryModalOpen(false);
        setNewCategory({ name: '', description: '' });
        toast.success('Thêm danh mục thành công');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Lỗi khi thêm danh mục');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Lỗi khi thêm danh mục. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateCategory = async () => {
    try {
      setIsLoading(true);
      if (!selectedCategory.name) {
        toast.warning('Vui lòng nhập tên danh mục');
        return;
      }
  
      const response = await fetch(`${API_URL}/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedCategory.name,
          description: selectedCategory.description
        }),
      });
  
      if (response.ok) {
        await fetchCategories();
        setIsEditCategoryModalOpen(false);
        setSelectedCategory(null);
        toast.success('Cập nhật danh mục thành công');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Lỗi khi cập nhật danh mục');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Lỗi khi cập nhật danh mục. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteCategory = async (categoryId) => {
    setItemToDelete(categoryId);
    setDeleteType('category');
    setIsDeleteModalOpen(true);
  };
  
  const handleDeleteProduct = async (productId) => {
    setItemToDelete(productId);
    setDeleteType('product');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
      const endpoint = deleteType === 'category' ? 'categories' : 'products';
      const response = await fetch(`${API_URL}/${endpoint}/${itemToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        if (deleteType === 'category') {
          await fetchCategories();
        } else {
          await fetchProducts();
        }
        toast.success(`Xóa ${deleteType === 'category' ? 'danh mục' : 'sản phẩm'} thành công`);
      } else {
        const data = await response.json();
        toast.error(data.message || `Lỗi khi xóa ${deleteType === 'category' ? 'danh mục' : 'sản phẩm'}`);
      }
    } catch (error) {
      console.error(`Error deleting ${deleteType}:`, error);
      toast.error(`Lỗi khi xóa ${deleteType === 'category' ? 'danh mục' : 'sản phẩm'}. Vui lòng thử lại.`);
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setDeleteType(null);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const resetForm = () => {
    setNewProduct({
      category_id: '',
      name: '',
      description: '',
      price: '',
      discount_percent: 0,
      image_url: '',
      manage_stock: false,
      stock_quantity: null
    });
    setImagePreview(null);
    setIsEditMode(false);
    setSelectedProduct(null);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setNewProduct({
      ...product,
      price: product.price.toString(),
      stock_quantity: product.manage_stock ? product.stock_quantity.toString() : null,
      discount_percent: product.discount_percent || 0
    });
    setImagePreview(product.image_url);
    setIsEditMode(true);
    setIsAddModalOpen(true);
  };
  
  const handleSubmitProduct = async () => {
    try {
      setIsLoading(true);
      if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
        toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }
  
      if (newProduct.manage_stock && (!newProduct.stock_quantity && newProduct.stock_quantity !== 0)) {
        toast.warning('Vui lòng nhập số lượng tồn kho');
        return;
      }
  
      const productToSubmit = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock_quantity: newProduct.manage_stock ? parseInt(newProduct.stock_quantity) : null,
        discount_percent: parseInt(newProduct.discount_percent) || 0
      };
  
      const url = isEditMode 
        ? `${API_URL}/products/${selectedProduct.id}`
        : `${API_URL}/products`;
      
      const method = isEditMode ? 'PUT' : 'POST';
  
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productToSubmit),
      });
  
      if (response.ok) {
        await fetchProducts();
        setIsAddModalOpen(false);
        resetForm();
        setIsEditMode(false);
        setSelectedProduct(null);
        toast.success(isEditMode ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Lỗi khi lưu sản phẩm');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Lỗi khi lưu sản phẩm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || 
      product.category_id.toString() === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50/30 min-h-screen">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Quản lý kho hàng</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all bg-white"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Danh mục
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Thêm sản phẩm
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình ảnh</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá bán</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảm giá</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <img
                      src={product.image_url || 'placeholder.jpg'}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.description}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {categories.find(c => c.id === product.category_id)?.name}
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {product.discount_percent}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.manage_stock ? (
                      <span className="text-gray-900">{product.stock_quantity}</span>
                    ) : (
                      <span className="text-gray-500">Không theo dõi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Xóa"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">
                {isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên sản phẩm *
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Danh mục *
                    </label>
                    <select
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={newProduct.category_id}
                      onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả
                    </label>
                    <textarea
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      rows="3"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá bán *
                    </label>
                    <input
                      type="number"
                      step="1000"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hình ảnh sản phẩm *
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                      <div className="space-y-1 text-center">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="mx-auto h-32 w-32 object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon
                            className="mx-auto h-12 w-12 text-gray-400"
                            aria-hidden="true"
                          />
                        )}
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Tải ảnh lên</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        </div>
                        {newProduct.image_url && (
                          <p className="text-xs text-gray-500 mt-2">
                            Đã tải ảnh lên thành công
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phần trăm giảm giá
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={newProduct.discount_percent}
                      onChange={(e) => setNewProduct({...newProduct, discount_percent: e.target.value})}
                    />
                  </div>

                  <div className="bg-gray-50/50 p-4 rounded-lg space-y-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newProduct.manage_stock}
                        onChange={(e) => setNewProduct({...newProduct, manage_stock: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Theo dõi tồn kho</span>
                    </label>

                    {newProduct.manage_stock && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số lượng tồn kho *
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                          value={newProduct.stock_quantity || ''}
                          onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value ? e.target.value : '0'})}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  {isEditMode ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Quản lý danh mục</h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="bg-gray-50/50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Thêm danh mục mới</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên danh mục *
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Thêm danh mục
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden border border-gray-100">
                <h3 className="text-lg font-medium p-4 bg-gray-50/50 border-b border-gray-100">
                  Danh sách danh mục
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên danh mục</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{category.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(category.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setIsEditCategoryModalOpen(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Chỉnh sửa"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(category.id)}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Xóa"
                              >
                                <Trash size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isEditCategoryModalOpen && selectedCategory && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Chỉnh sửa danh mục</h2>
              <button
                onClick={() => {
                  setIsEditCategoryModalOpen(false);
                  setSelectedCategory(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên danh mục *
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={selectedCategory.name}
                    onChange={(e) => setSelectedCategory({...selectedCategory, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={selectedCategory.description}
                    onChange={(e) => setSelectedCategory({...selectedCategory, description: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setIsEditCategoryModalOpen(false);
                      setSelectedCategory(null);
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleUpdateCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Cập nhật
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Xác nhận xóa</h2>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                  setDeleteType(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn xóa {deleteType === 'category' ? 'danh mục' : 'sản phẩm'} này?
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                    setDeleteType(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage; 