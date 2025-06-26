import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const CustomerDisplayPage = () => {
  const [order, setOrder] = useState({
    orderItems: [],
    paymentMethod: 'cash',
    customerName: '',
    customerPhone: '',
    note: '',
    zalopayQR: null,
    currentOrderId: null,
    total: 0,
  });

  useEffect(() => {
    // Use BroadcastChannel for real-time sync if available
    let channel;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('order-sync');
      channel.onmessage = (event) => {
        setOrder(event.data);
      };
    } else {
      // Fallback: poll localStorage
      const interval = setInterval(() => {
        const data = localStorage.getItem('customerDisplayOrder');
        if (data) setOrder(JSON.parse(data));
      }, 1000);
      return () => clearInterval(interval);
    }
    return () => channel && channel.close();
  }, []);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-screen-xl mx-auto gap-2 md:gap-8 p-1 md:p-8 overflow-y-auto" style={{height: '100vh'}}>
        {/* Order summary left */}
        <div className="flex-1 flex flex-col justify-center items-center max-w-[99vw] md:max-w-[700px] w-full">
          <h2 className="text-base md:text-3xl font-extrabold mb-2 md:mb-6 text-blue-700 drop-shadow-lg text-center">Đơn hàng của bạn</h2>
          <div className="w-full bg-white rounded-xl md:rounded-3xl shadow-2xl p-1 md:p-6">
            <div className="overflow-y-auto" style={{maxHeight: '220px'}}>
              <table className="w-full text-xs md:text-base">
                <thead>
                  <tr className="border-b-2 border-blue-200 font-bold bg-blue-50">
                    <th className="text-left pb-1 md:pb-2">Sản phẩm</th>
                    <th className="text-center pb-1 md:pb-2">SL</th>
                    <th className="text-right pb-1 md:pb-2">Đơn giá</th>
                    <th className="text-right pb-1 md:pb-2">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-1 md:py-2 font-semibold text-gray-800 whitespace-nowrap">
                        {item.name}
                        {item.discount_percent > 0 && (
                          <span className="ml-1 text-green-600 text-[10px] md:text-base">- {item.discount_percent}%</span>
                        )}
                      </td>
                      <td className="text-center py-1 md:py-2">{item.quantity}</td>
                      <td className="text-right py-1 md:py-2">{formatPrice(item.price)}</td>
                      <td className="text-right py-1 md:py-2 font-bold text-blue-700">
                        {formatPrice(item.price * item.quantity * (1 - (item.discount_percent || 0) / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-1 md:mt-6 text-base md:text-2xl font-bold text-green-700">
              <span>Tổng cộng:</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            {order.note && (
              <div className="mt-1 md:mt-4 text-xs md:text-lg text-amber-700 bg-amber-100 rounded-xl p-1 md:p-3">
                <span className="font-bold">Ghi chú: </span>{order.note}
              </div>
            )}
          </div>
        </div>
        {/* Payment options right */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-[99vw] md:max-w-[600px] w-full mt-2 md:mt-0">
          <div className="bg-white rounded-xl md:rounded-3xl shadow-2xl p-1 md:p-8 w-full flex flex-col items-center">
            <h2 className="text-base md:text-3xl font-extrabold mb-2 md:mb-6 text-green-700 drop-shadow-lg text-center">Thanh toán</h2>
            {order.paymentMethod === 'zalopay' && order.zalopayQR ? (
              <>
                <div className="mb-2 md:mb-6">
                  <QRCodeSVG value={order.zalopayQR} size={80} className="md:size-[240px]" level="H" includeMargin={true} />
                </div>
                <div className="text-xs md:text-lg text-gray-700 text-center">Quét mã QR bằng ZaloPay để thanh toán</div>
              </>
            ) : (
              <div className="text-xs md:text-lg text-gray-700 text-center">Vui lòng thanh toán tại quầy</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplayPage; 