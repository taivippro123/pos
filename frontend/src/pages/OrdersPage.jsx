import React, { useState, useEffect } from 'react';
import { Eye, Search, X } from 'lucide-react';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách đơn hàng');
      }
      
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOrder = async (order) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/orders/${order.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Không thể lấy chi tiết đơn hàng');
      }

      const orderDetails = await response.json();
      setSelectedOrder(orderDetails);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Lỗi:', error);
      alert('Có lỗi xảy ra khi lấy chi tiết đơn hàng');
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-50 text-gray-600';
    
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
    if (!status) return 'N/A';
    
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customer_phone && order.customer_phone.includes(searchTerm)) ||
      (order.id && order.id.toString().includes(searchTerm));
    
    const matchesStatus = filterStatus === 'all' || 
      (order.payment_status && order.payment_status.toLowerCase() === filterStatus.toLowerCase());
    
    return matchesSearch && matchesStatus;
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Đơn hàng</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <input
              type="text"
              placeholder="Tìm kiếm đơn hàng..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày đặt</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số sản phẩm</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">#{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{order.customer_phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.product_count || 0} sản phẩm
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatPrice(order.total_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-sm rounded-full inline-flex items-center ${getStatusColor(order.payment_status)}`}>
                      {getStatusText(order.payment_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Order Modal */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Chi tiết đơn hàng #{selectedOrder.order_id}</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50/50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Thông tin khách hàng</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Họ tên:</span> {selectedOrder.customer.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Số điện thoại:</span> {selectedOrder.customer.phone || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Thông tin đơn hàng</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Ngày đặt:</span> {formatDate(selectedOrder.created_at)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Trạng thái:</span>
                      <span className={`ml-2 px-2 py-0.5 text-sm rounded-full ${getStatusColor(selectedOrder.payment_status)}`}>
                        {getStatusText(selectedOrder.payment_status)}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phương thức thanh toán:</span> {selectedOrder.payment_method || 'N/A'}
                    </p>
                  </div>
                  {selectedOrder.note && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700">
                        <span className="font-medium">Ghi chú:</span> {selectedOrder.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-lg overflow-hidden">
                <h3 className="font-medium text-gray-900 p-4 bg-gray-100/50 border-b border-gray-200">
                  Chi tiết sản phẩm
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.products?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatPrice(item.price)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatPrice(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Tổng cộng</span>
                  <span className="text-lg font-medium text-blue-600">{formatPrice(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage; 