import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = import.meta.env.VITE_API_URL;

const OrderSummary = () => {
  const [orderItems, setOrderItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [zalopayQR, setZalopayQR] = useState(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [currentAppTransId, setCurrentAppTransId] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handleAddToOrder = (event) => {
      const item = event.detail;
      setOrderItems((prevItems) => {
        const existingItem = prevItems.find((i) => i.id === item.id);
        if (existingItem) {
          // Kiểm tra số lượng tồn kho nếu sản phẩm có quản lý tồn kho
          if (
            item.manage_stock &&
            existingItem.quantity + item.quantity > item.stock_quantity
          ) {
            alert("Số lượng sản phẩm không đủ");
            return prevItems;
          }
          return prevItems.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
        }
        return [...prevItems, item];
      });
    };

    window.addEventListener("addToOrder", handleAddToOrder);
    return () => window.removeEventListener("addToOrder", handleAddToOrder);
  }, []);

  useEffect(() => {
    let interval;
    
    if (currentOrderId && paymentMethod === "zalopay") {
      // Kiểm tra trạng thái thanh toán mỗi 3 giây
      interval = setInterval(async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_URL}/orders/${currentOrderId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error("Không thể kiểm tra trạng thái đơn hàng");
          }

          const order = await response.json();
          
          if (order.payment_status === "paid") {
            // Phát sự kiện thanh toán thành công
            const event = new CustomEvent("payment_success", {
              detail: { amount: order.total_amount }
            });
            window.dispatchEvent(event);

            // Định dạng số tiền theo VNĐ
            const formattedAmount = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND'
            }).format(order.total_amount);

            setSuccessMessage(`Đã nhận ${formattedAmount}`);
            setShowSuccess(true);
            
            // Tự động ẩn thông báo sau 5 giây
            setTimeout(() => {
              setShowSuccess(false);
              // Reset form sau khi thanh toán thành công
              setOrderItems([]);
              setCustomerName("");
              setCustomerPhone("");
              setNote("");
              setIsNewCustomer(false);
              setZalopayQR(null);
              setCurrentOrderId(null);
            }, 5000);
            
            // Dừng kiểm tra khi đã thanh toán thành công
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Lỗi khi kiểm tra trạng thái thanh toán:", error);
        }
      }, 3000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentOrderId, paymentMethod]);

  const handlePhoneChange = async (phone) => {
    setCustomerPhone(phone);
    if (phone.length >= 7) {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/users?phone=${phone}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Lỗi khi tìm kiếm khách hàng");
        }

        const users = await response.json();
        setSuggestedUsers(users);
        setShowSuggestions(users.length > 0);
        
        // Nếu có khách hàng khớp chính xác, tự động chọn
        const exactMatch = users.find(user => user.phone === phone);
        if (exactMatch) {
          handleSelectCustomer(exactMatch);
        } else {
          setCustomerName("");
          setIsNewCustomer(true);
        }
      } catch (error) {
        console.error("Lỗi:", error);
        setCustomerName("");
        setIsNewCustomer(true);
        setSuggestedUsers([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      setCustomerName("");
      setIsNewCustomer(false);
      setSuggestedUsers([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectCustomer = (user) => {
    setCustomerName(user.name);
    setCustomerPhone(user.phone);
    setIsNewCustomer(false);
    setSuggestedUsers([]);
    setShowSuggestions(false);
  };

  const handleRemoveItem = (itemId) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.id !== itemId)
    );
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setOrderItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((total, item) => {
      const price = item.price * (1 - (item.discount_percent || 0) / 100);
      return total + price * item.quantity;
    }, 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const resetOrderState = () => {
    setOrderItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setNote("");
    setIsNewCustomer(false);
    setZalopayQR(null);
    setCurrentOrderId(null);
    setCurrentAppTransId(null);
    setPaymentMethod('cash');
    setIsLoadingQR(false);
    setIsCancelling(false);
  };

  const handlePlaceOrder = async () => {
    if (!customerPhone) {
      alert("Vui lòng nhập số điện thoại");
      return;
    }

    if (isNewCustomer && !customerName) {
      alert("Vui lòng nhập tên khách hàng");
      return;
    }

    setIsLoadingQR(true);
    try {
      const token = localStorage.getItem("token");

      // Tạo đơn hàng trước
      const createOrderResponse = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: null,
          phone: customerPhone,
          name: customerName,
          role: "customer",
          total_amount: calculateSubtotal(),
          payment_method: paymentMethod,
          payment_status: paymentMethod === "zalopay" ? "pending" : "paid",
          note: note,
          products: orderItems.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price_at_order: item.price,
            discount_percent_at_order: item.discount_percent,
          })),
        }),
      });

      const orderData = await createOrderResponse.json();

      if (!createOrderResponse.ok) {
        throw new Error(orderData.message || "Không thể tạo đơn hàng");
      }

      const orderId = orderData.orderId || orderData.id;
      console.log("Order ID:", orderId);
      setCurrentOrderId(orderId);

      if (paymentMethod === "zalopay") {
        // Sau khi có orderId -> tạo thanh toán ZaloPay
        const zalopayResponse = await fetch(
          `${API_URL}/zalopay/create-order`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: orderId,
              amount: calculateSubtotal(),
              description: `Thanh toán đơn hàng ${orderId} cho ${
                customerName || customerPhone
              }`,
              products: orderItems.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })),
            }),
          }
        );

        const zalopayData = await zalopayResponse.json();

        if (!zalopayResponse.ok) {
          throw new Error(zalopayData.message || "Không thể tạo đơn ZaloPay");
        }

        // Lưu URL thanh toán để hiển thị QR code
        setZalopayQR(zalopayData.order_url);
        setCurrentAppTransId(zalopayData.app_trans_id);
      } else {
        // Reset form ONLY if it's cash payment
        resetOrderState();
        toast.success(`Đơn hàng ${orderId} (Tiền mặt) đã được tạo thành công!`);
      }

    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      toast.error(error.message || "Có lỗi xảy ra khi tạo đơn hàng");
      setCurrentOrderId(null);
    } finally {
      setIsLoadingQR(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrderId) return;

    setIsCancelling(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/orders/${currentOrderId}/cancel`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Không thể hủy đơn hàng");
      }

      toast.success(`Đơn hàng ${currentOrderId} đã được hủy.`);
      resetOrderState();

    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng:", error);
      toast.error(error.message || "Có lỗi xảy ra khi hủy đơn hàng");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="w-[350px] border-l border-gray-200 bg-white p-6 flex flex-col h-full">
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
      <div className="mb-6">
        <div className="space-y-2 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Số điện thoại"
              value={customerPhone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 10 && (value === '' || value.startsWith('0'))) {
                  handlePhoneChange(value);
                }
              }}
              className="w-full px-3 py-1 border border-gray-200 rounded-lg text-sm"
              maxLength={10}
              pattern="[0-9]*"
              inputMode="numeric"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            )}
            {showSuggestions && suggestedUsers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestedUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectCustomer(user)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-gray-500">{user.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isNewCustomer ? (
            <input
              type="text"
              placeholder="Tên khách hàng mới"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-1 border border-gray-200 rounded-lg text-sm"
            />
          ) : customerName ? (
            <div className="text-sm text-gray-600">
              Khách hàng: {customerName}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {["cash", "zalopay"].map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`border px-2 py-1 text-xs rounded transition-colors ${
                paymentMethod === method
                  ? "bg-green-50 border-green-200 text-green-600"
                  : "border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
              }`}
            >
              {method === "cash" ? "Tiền mặt" : "ZaloPay"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 text-sm">
        {orderItems.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center border-b border-gray-100 pb-3"
          >
            <div>
              <div className="font-medium text-gray-800">{item.name}</div>
              <div className="text-xs text-gray-500">
                {formatPrice(item.price)}
                {item.discount_percent > 0 && (
                  <span className="ml-1 text-green-500">
                    (-{item.discount_percent}%)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                className="px-2 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                -
              </button>
              <span className="text-gray-700">{item.quantity}</span>
              <button
                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                className="px-2 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4 mt-4 text-sm">
        <div className="flex justify-between mb-2 text-gray-600">
          <span>Tổng cộng</span>
          <span>{formatPrice(calculateSubtotal())}</span>
        </div>
      </div>

      <div className="mt-4">
        <textarea
          placeholder="Ghi chú"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4"
          rows={2}
        />
      </div>

      {paymentMethod === "zalopay" && zalopayQR && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Quét mã QR để thanh toán (Đơn #{currentOrderId})
          </h3>
          <div className="flex justify-center">
            <QRCodeSVG
              value={zalopayQR}
              size={200}
              level="H"
              includeMargin={true}
              className="rounded-lg"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Hoặc mở ZaloPay và quét mã QR
          </p>
        </div>
      )}

      {isLoadingQR && !zalopayQR && (
        <div className="flex justify-center items-center mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-600">Đang tạo mã QR...</span>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-gray-100">
        {paymentMethod === 'zalopay' && zalopayQR ? (
          <button
            onClick={handleCancelOrder}
            disabled={isCancelling}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-lg text-sm font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Hủy đơn hàng #{currentOrderId}
          </button>
        ) : (
          <button
            onClick={handlePlaceOrder}
            disabled={
              orderItems.length === 0 ||
              !customerPhone ||
              (isNewCustomer && !customerName) ||
              isLoadingQR
            }
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg text-sm font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            { isLoadingQR ? 'Đang xử lý...' : 'Tạo đơn hàng' }
          </button>
        )}
      </div>

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-white mx-auto" />
            </div>
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Thanh toán thành công!
              </h3>
              <p className="text-gray-600 mb-6">
                {successMessage}
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSummary;
