import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Package, Clock, XCircle, Users, Wallet, Smartphone } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ReportPage = () => {
  const [orderReport, setOrderReport] = useState({
    overview: {
      total_orders: 0,
      total_revenue: 0,
      paid_orders: 0,
      pending_orders: 0,
      cancelled_orders: 0,
      paid_revenue: 0,
      pending_revenue: 0,
      unique_customers: 0,
      cash_orders: 0,
      zalopay_orders: 0
    },
    dailyRevenue: [],
    topProducts: [],
    categoryRevenue: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderReport();
  }, []);

  const fetchOrderReport = async () => {
    try {
      const response = await fetch(`${API_URL}/report/orders`);
      const data = await response.json();
      setOrderReport(data);
    } catch (error) {
      console.error('Error fetching order report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Báo cáo doanh thu</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <DollarSign size={24} className="text-blue-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Tổng doanh thu</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(orderReport.overview.total_revenue || 0)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Đã thanh toán: {formatCurrency(orderReport.overview.paid_revenue || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <TrendingUp size={24} className="text-green-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Tổng đơn hàng</div>
              <div className="text-2xl font-bold text-gray-900">
                {orderReport.overview.total_orders || 0}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {orderReport.overview.unique_customers || 0} khách hàng
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-full">
              <CreditCard size={24} className="text-purple-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Giá trị trung bình</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  orderReport.overview.total_orders
                    ? orderReport.overview.total_revenue / orderReport.overview.total_orders
                    : 0
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Wallet size={24} className="text-green-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Tiền mặt</div>
              <div className="text-2xl font-bold text-green-600">
                {orderReport.overview.cash_orders || 0} đơn
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Smartphone size={24} className="text-blue-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">ZaloPay</div>
              <div className="text-2xl font-bold text-blue-600">
                {orderReport.overview.zalopay_orders || 0} đơn
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-full">
              <Users size={24} className="text-purple-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Khách hàng mới</div>
              <div className="text-2xl font-bold text-purple-600">
                {orderReport.overview.unique_customers || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Package size={24} className="text-green-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Đơn đã thanh toán</div>
              <div className="text-2xl font-bold text-green-600">
                {orderReport.overview.paid_orders || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-full">
              <Clock size={24} className="text-yellow-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Đơn chờ thanh toán</div>
              <div className="text-2xl font-bold text-yellow-600">
                {orderReport.overview.pending_orders || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-full">
              <XCircle size={24} className="text-red-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Đơn đã hủy</div>
              <div className="text-2xl font-bold text-red-600">
                {orderReport.overview.cancelled_orders || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Revenue */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Doanh thu theo danh mục</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số khách</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SL bán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orderReport.categoryRevenue?.map((category) => (
                <tr key={category.category_id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {category.category_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{category.order_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{category.customer_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{category.total_quantity}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(category.total_revenue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(category.avg_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Revenue */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Doanh thu theo ngày</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã TT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chờ TT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã hủy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KH mới</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orderReport.dailyRevenue?.map((day) => (
                <tr key={day.date}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(day.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{day.order_count}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(day.daily_revenue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-600">{day.paid_count}</td>
                  <td className="px-6 py-4 text-sm text-yellow-600">{day.pending_count}</td>
                  <td className="px-6 py-4 text-sm text-red-600">{day.cancelled_count}</td>
                  <td className="px-6 py-4 text-sm text-blue-600">{day.unique_customers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Top sản phẩm bán chạy</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SL bán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá TB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giảm giá TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orderReport.topProducts?.map((product) => (
                <tr key={product.product_id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {product.product_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.category_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.total_quantity}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(product.total_revenue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.order_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(product.avg_price)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {Math.round(product.avg_discount)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportPage; 