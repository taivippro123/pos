import React, { useState, useEffect } from "react";

const ProductItem = ({ product, onAddToOrder }) => {
  const [quantity, setQuantity] = useState(1);
  const [currentStock, setCurrentStock] = useState(product.stock_quantity);

  useEffect(() => {
    setCurrentStock(product.stock_quantity);
  }, [product.stock_quantity]);

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (!product.manage_stock || quantity < currentStock) {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToOrder = () => {
    if (product.manage_stock && quantity > currentStock) {
      alert("Số lượng sản phẩm không đủ");
      return;
    }

    onAddToOrder({
      id: product.id,
      name: product.name,
      price: product.price,
      discount_percent: product.discount_percent,
      quantity: quantity,
      manage_stock: product.manage_stock,
      stock_quantity: currentStock,
    });
    setQuantity(1);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
      <div className="relative h-40 mb-3 rounded-lg overflow-hidden">
        {product.discount_percent > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
            -{product.discount_percent}%
          </div>
        )}
        <img
          src={
            product.image_url ||
            "https://via.placeholder.com/300x300?text=No+Image"
          }
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>

      <h2 className="text-base font-medium mb-2 text-gray-800 line-clamp-2">
        {product.name}
      </h2>

      <div className="mb-4">
        {product.discount_percent > 0 ? (
          <div className="space-y-1">
            <div className="text-gray-400 line-through text-sm">
              {formatPrice(product.price)}
            </div>
            <div className="text-red-500 font-bold">
              {formatPrice(product.price * (1 - product.discount_percent / 100))}
            </div>
          </div>
        ) : (
          <div className="text-gray-600 font-semibold">
            {formatPrice(product.price)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleDecrease}
          className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          -
        </button>

        <span className="text-gray-700">{quantity}</span>

        <button
          onClick={handleIncrease}
          className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          +
        </button>
      </div>

      <button
        onClick={handleAddToOrder}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors mt-auto ${
          product.manage_stock && currentStock === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
        disabled={product.manage_stock && currentStock === 0}
      >
        {product.manage_stock && currentStock === 0
          ? "Hết hàng"
          : "Thêm vào đơn"}
      </button>
    </div>
  );
};

export default ProductItem;
