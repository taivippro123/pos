import React, { useState, useEffect } from 'react';
import { Phone, Mail, ShoppingBag, Search, X } from 'lucide-react';
import ChatBot from '../components/ChatBot';

const API_URL = import.meta.env.VITE_API_URL;

const CustomerPage = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderCounts, setOrderCounts] = useState({});
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách khách hàng');
      }
      
      const data = await response.json();
      const customerList = data.filter(user => user.role === 'customer');
      setCustomers(customerList);

      const counts = {};
      for (const customer of customerList) {
        const ordersResponse = await fetch(`${API_URL}/users/${customer.id}/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          counts[customer.id] = orders.length;
        } else {
          counts[customer.id] = 0;
        }
      }
      setOrderCounts(counts);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const ordersListResponse = await fetch(`${API_URL}/users/${customerId}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!ordersListResponse.ok) {
        throw new Error('Không thể lấy danh sách đơn hàng');
      }
      
      const ordersList = await ordersListResponse.json();

      const ordersWithDetails = await Promise.all(
        ordersList.map(async (order) => {
          const detailResponse = await fetch(`${API_URL}/orders/${order.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (detailResponse.ok) {
            return await detailResponse.json();
          }
          return order;
        })
      );
      
      setCustomerOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      alert('Có lỗi xảy ra khi lấy lịch sử đơn hàng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer.id);
    setIsViewModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const formatPrice = (price) => {
    if (!price) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-50 text-gray-600 border border-gray-200';
    
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const getStatusText = (status) => {
    
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Chờ thanh toán';
      case 'paid':
        return 'Đã thanh toán';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const filteredCustomers = customers.filter(customer => {
    return searchTerm === '' || 
      (customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.includes(searchTerm));
  });

  // Tính toán số trang và các khách hàng hiển thị
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

  // Xử lý chuyển trang
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Component điều hướng trang
  const Pagination = () => {
    return (
      <div className="flex justify-center items-center gap-2 mt-4 mb-6">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-lg ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Đầu
        </button>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-lg ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Trước
        </button>
        
        {[...Array(totalPages)].map((_, index) => {
          const pageNumber = index + 1;
          // Hiển thị 3 trang trước và sau trang hiện tại
          if (
            pageNumber === 1 ||
            pageNumber === totalPages ||
            (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
          ) {
            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`px-3 py-1 rounded-lg ${
                  currentPage === pageNumber
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {pageNumber}
              </button>
            );
          } else if (
            pageNumber === currentPage - 3 ||
            pageNumber === currentPage + 3
          ) {
            return <span key={pageNumber}>...</span>;
          }
          return null;
        })}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-lg ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Sau
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-lg ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Cuối
        </button>
      </div>
    );
  };

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
      <ChatBot />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Quản lý khách hàng</h1>
        <div className="relative flex-grow sm:flex-grow-0">
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thông tin liên hệ</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn hàng</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {currentItems.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Phone size={14} />
                        {customer.phone || 'N/A'}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={14} />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {orderCounts[customer.id] || 0} đơn hàng
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleCustomerClick(customer)}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                    >
                      Xem đơn hàng
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thêm phân trang */}
      {filteredCustomers.length > 0 && <Pagination />}

      {/* Order History Modal */}
      {isViewModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">
                Lịch sử đơn hàng - {selectedCustomer.name}
              </h2>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
              <div className="space-y-6">
                {customerOrders.slice().reverse().map((order) => (
                  <div key={order.id} className="bg-gray-50/50 rounded-lg overflow-hidden border border-gray-100">
                    {/* Thông tin cơ bản đơn hàng */}
                    <div className="p-4 bg-gray-100/50 border-b border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">Đơn hàng #{order.order_id || order.id}</span>
                        <span className="text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Thanh toán qua: </span>
                          <span className="font-medium capitalize">{order.payment_method || 'Chờ thanh toán'}</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.payment_status)}`}>
                            {getStatusText(order.payment_status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết sản phẩm */}
                    <div className="p-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase">
                            <th className="text-left pb-2">Sản phẩm</th>
                            <th className="text-right pb-2">Đơn giá</th>
                            <th className="text-right pb-2">Số lượng</th>
                            <th className="text-right pb-2">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {order.products?.map((item, index) => (
                            <tr key={index} className="text-sm">
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  {item.image_url && (
                                    <img 
                                      src={item.image_url} 
                                      alt={item.name}
                                      className="w-8 h-8 object-cover rounded"
                                    />
                                  )}
                                  <span className="text-gray-900">{item.name}</span>
                                </div>
                              </td>
                              <td className="text-right py-2 text-gray-600">
                                {formatPrice(item.price)}
                                {item.discount_percent > 0 && (
                                  <span className="text-xs text-rose-500 ml-1">
                                    -{item.discount_percent}%
                                  </span>
                                )}
                              </td>
                              <td className="text-right py-2 text-gray-600">{item.quantity}</td>
                              <td className="text-right py-2 font-medium text-gray-900">
                                {formatPrice(item.price * item.quantity * (1 - (item.discount_percent || 0) / 100))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-900">Tổng cộng:</span>
                          <span className="font-medium text-blue-600">{formatPrice(order.total_amount)}</span>
                        </div>
                      </div>

                      {order.note && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-700">
                            <span className="font-medium">Ghi chú:</span> {order.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {customerOrders.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    Chưa có đơn hàng nào
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPage; 