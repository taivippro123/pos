// File: server.js
const cors = require("cors");
const express = require("express");
const mysql = require("mysql2");
const app = express();
const axios = require("axios");
const moment = require("moment");
const crypto = require("crypto");
const WebSocket = require('ws');
const dotenv = require('dotenv');
const chrono = require('chrono-node');

// Load environment variables FIRST
dotenv.config();

const allowedOrigins = [
  'http://localhost:5173',
  'https://frontend-theta-two-64.vercel.app',
  'https://frontend-theta-two-64.vercel.app/login'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = 'CORS policy does not allow access from this origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// Then other middleware
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0
});

// Config ZaloPay
const config = {
  app_id: "2554",
  key1: "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
  key2: "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create"
};

// USER API
// Tạo user (khách đặt hàng, không login):
app.post("/users", (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp tên và số điện thoại." });
  }

  const query = "INSERT INTO users (name, phone, role) VALUES (?, ?, 'customer')";
  db.query(query, [name, phone], (err, result) => {
    if (err)
      return res.status(500).json({ message: "Lỗi tạo user", error: err });
    res.json({ message: "Tạo user thành công", userId: result.insertId });
  });
});

//Đăng ký tài khoản cho nhân viên / admin:
app.post("/register", (req, res) => {
  const { name, phone, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Thiếu thông tin đăng ký." });
  }

  if (!["admin", "staff"].includes(role)) {
    return res
      .status(400)
      .json({ message: "Chỉ có thể đăng ký với vai trò admin hoặc staff." });
  }

  const query =
    "INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)";
  db.query(query, [name, phone, email, password, role], (err, result) => {
    if (err)
      return res.status(500).json({ message: "Lỗi đăng ký", error: err });
    res.json({ message: "Đăng ký thành công", userId: result.insertId });
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const query =
    "SELECT * FROM users WHERE email = ? AND password = ? AND role IN ('admin', 'staff')";
  db.query(query, [email, password], (err, results) => {
    if (err)
      return res.status(500).json({ message: "Lỗi đăng nhập", error: err });
    if (results.length === 0)
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không đúng." });

    const user = results[0];
    // Tạo token ngẫu nhiên
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

    res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: token
    });
  });
});

app.get("/users", (req, res) => {
  const { phone } = req.query;
  let query = "SELECT * FROM users";
  let params = [];

  if (phone) {
    // Tìm kiếm theo số điện thoại bắt đầu bằng số đã nhập
    query += " WHERE phone LIKE ?";
    params.push(`${phone}%`);
  }

  db.query(query, params, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Lỗi khi lấy danh sách người dùng" });
    res.json(result);
  });
});

// PRODUCT API
app.post("/products", (req, res) => {
  const {
    category_id,
    name,
    description,
    price,
    discount_percent,
    image_url,
    manage_stock,
    stock_quantity,
  } = req.body;
  db.query(
    `INSERT INTO products (category_id, name, description, price, discount_percent, image_url, manage_stock, stock_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category_id,
      name,
      description,
      price,
      discount_percent,
      image_url,
      manage_stock,
      stock_quantity,
    ],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi thêm sản phẩm" });
      res.json({ message: "Thêm sản phẩm thành công" });
    }
  );
});

app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) {
      console.error("❌ MySQL error when fetching products:", err);
      return res.status(500).json({ message: "Lỗi khi lấy sản phẩm" });
    }
    res.json(result);
  });
});

// Xóa sản phẩm
app.delete("/products/:id", (req, res) => {
  const productId = req.params.id;

  // Kiểm tra xem sản phẩm có trong đơn hàng nào không
  db.query(
    "SELECT COUNT(*) as count FROM order_details WHERE product_id = ?",
    [productId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Lỗi khi kiểm tra sản phẩm" });

      if (result[0].count > 0) {
        return res.status(400).json({
          message: "Không thể xóa sản phẩm vì đã có trong đơn hàng"
        });
      }

      // Nếu không có trong đơn hàng, tiến hành xóa
      db.query(
        "DELETE FROM products WHERE id = ?",
        [productId],
        (err) => {
          if (err) return res.status(500).json({ message: "Lỗi khi xóa sản phẩm" });
          res.json({ message: "Xóa sản phẩm thành công" });
        }
      );
    }
  );
});

// Cập nhật sản phẩm
app.put("/products/:id", (req, res) => {
  const productId = req.params.id;
  const {
    category_id,
    name,
    description,
    price,
    discount_percent,
    image_url,
    manage_stock,
    stock_quantity,
  } = req.body;

  if (!name || !price || !category_id) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
  }

  db.query(
    `UPDATE products 
     SET category_id = ?, name = ?, description = ?, price = ?, 
         discount_percent = ?, image_url = ?, manage_stock = ?, stock_quantity = ?
     WHERE id = ?`,
    [
      category_id,
      name,
      description,
      price,
      discount_percent,
      image_url,
      manage_stock,
      stock_quantity,
      productId
    ],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi khi cập nhật sản phẩm" });
      res.json({ message: "Cập nhật sản phẩm thành công" });
    }
  );
});

// ORDER API
app.post("/orders", (req, res) => {
  const { phone, name, role, total_amount, payment_method, payment_status, note, products } =
    req.body;

  if (!phone || !products || products.length === 0) {
    return res.status(400).json({ message: "Thiếu thông tin đơn hàng." });
  }

  // 1. Kiểm tra người dùng qua số điện thoại
  const checkUserQuery = "SELECT * FROM users WHERE phone = ?";
  db.query(checkUserQuery, [phone], (err, userResults) => {
    if (err) {
      console.error("❌ MySQL error when checking user by phone:", err);
      return res
        .status(500)
        .json({ message: "Lỗi kiểm tra người dùng", error: err });
    }

    if (userResults.length > 0) {
      // User đã tồn tại
      const existingUser = userResults[0];
      createOrder(existingUser.id, existingUser.name);
    } else {
      // Chưa có user -> yêu cầu name
      if (!name) {
        return res
          .status(400)
          .json({ message: "Người dùng chưa tồn tại, vui lòng nhập tên." });
      }

      const insertUserQuery =
        "INSERT INTO users (name, phone, role) VALUES (?, ?, ?)";
      db.query(insertUserQuery, [name, phone, role || 'customer'], (err2, result) => {
        if (err2) {
          console.error("❌ MySQL error when creating new customer:", err2);
          return res
            .status(500)
            .json({ message: "Lỗi tạo người dùng mới", error: err2 });
        }

        createOrder(result.insertId, name);
      });
    }
  });

  // Hàm xử lý tạo đơn hàng
  function createOrder(user_id, user_name) {
    // 1. Kiểm tra số lượng tồn kho trước khi tạo đơn hàng
    const checkStockPromises = products.map(product => {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT manage_stock, stock_quantity FROM products WHERE id = ?',
          [product.product_id],
          (err, results) => {
            if (err) {
              console.error("❌ MySQL error when checking product stock:", err);
              reject(err);
            } else if (results.length === 0) reject(new Error(`Không tìm thấy sản phẩm ${product.product_id}`));
            else {
              const productInfo = results[0];
              const manageStock = productInfo.manage_stock === 1 || productInfo.manage_stock === true;
              if (manageStock && productInfo.stock_quantity < product.quantity) {
                reject(new Error(`Sản phẩm ${product.product_name} không đủ số lượng tồn kho`));
              } else {
                resolve({ ...productInfo, manage_stock: manageStock });
              }
            }
          }
        );
      });
    });

    Promise.all(checkStockPromises)
      .then((productInfos) => {
        // 2. Tạo đơn hàng
        const orderQuery = `INSERT INTO orders (user_id, total_amount, payment_method, payment_status, note) VALUES (?, ?, ?, ?, ?)`;
        db.query(
          orderQuery,
          [user_id, total_amount, payment_method, payment_status, note],
        (err, orderResult) => {
          if (err) {
            console.error("❌ MySQL error when inserting order:", err);
            return res
              .status(500)
              .json({ message: "Lỗi tạo đơn hàng", error: err });
          }

            const orderId = orderResult.insertId;

            if (payment_method === 'cake') {
              console.log(
                `🧾 [CAKE ORDER] Created order ${orderId} - phone: ${phone}, customer: ${user_name}, amount: ${total_amount}, status: ${payment_status}`
              );
            }

            const details = products.map((p) => [
              orderId,
              p.product_id,
              p.product_name,
              p.quantity,
              p.price_at_order,
              p.discount_percent_at_order,
            ]);

            const detailQuery = `INSERT INTO order_details (order_id, product_id, product_name, quantity, price_at_order, discount_percent_at_order) VALUES ?`;
            db.query(detailQuery, [details], async (err2) => {
              if (err2) {
                console.error("❌ MySQL error when inserting order details:", err2);
                return res
                  .status(500)
                  .json({ message: "Lỗi lưu chi tiết đơn hàng", error: err2 });
              }

              // 3. Cập nhật số lượng tồn kho trong bảng products
              try {
                const updateStockPromises = products.map((product, index) => {
                  const productInfo = productInfos[index];
                  if (productInfo.manage_stock) {
                    return new Promise((resolve, reject) => {
                      db.query(
                        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                        [product.quantity, product.product_id],
                        (err) => {
                          if (err) {
                            console.error("❌ MySQL error when decrementing stock quantity:", err);
                            reject(err);
                          }
                          else resolve();
                        }
                      );
                    });
                  }
                  return Promise.resolve();
                });

                await Promise.all(updateStockPromises);

                // 4. Lấy thông tin sản phẩm đã được cập nhật
                const productIds = products.map(p => p.product_id);

                db.query(
                  'SELECT id, name, stock_quantity, manage_stock FROM products WHERE id IN (?)',
                  [productIds],
                  (err, updatedProducts) => {
                    if (err) {
                      return res.status(500).json({ message: "Lỗi lấy thông tin sản phẩm", error: err });
                    }

                    res.json({
                      message: "Tạo đơn hàng thành công",
                      orderId,
                      user: {
                        id: user_id,
                        name: user_name,
                        phone,
                      },
                      payment: {
                        method: payment_method,
                        status: payment_status,
                      },
                      updatedProducts: updatedProducts.map(p => ({
                        id: p.id,
                        name: p.name,
                        stock_quantity: p.stock_quantity,
                        manage_stock: p.manage_stock
                      }))
                    });
                  }
                );
              } catch (stockError) {
                console.error('Stock update error:', stockError);
                res.status(500).json({ message: "Lỗi cập nhật tồn kho", error: stockError });
              }
            });
          }
        );
      })
      .catch(err => {
        console.error("❌ Error during order creation flow:", err);
        res.status(400).json({ message: err.message });
      });
  }
});

// API lấy danh sách đơn hàng
app.get("/orders", (req, res) => {
  const query = `
    SELECT 
      o.id,
      o.created_at,
      o.total_amount,
      o.payment_method,
      o.payment_status,
      o.note,
      u.id as user_id,
      u.name as customer_name,
      u.phone as customer_phone,
      COUNT(od.id) as product_count
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN order_details od ON o.id = od.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi khi lấy đơn hàng" });
    res.json(result);
  });
});

// API lấy chi tiết đơn hàng
app.get("/orders/:id", (req, res) => {
  const orderId = req.params.id;

  // Lấy thông tin đơn hàng và người mua
  const orderQuery = `
    SELECT 
      o.id AS order_id,
      o.created_at,
      o.total_amount,
      o.payment_method,
      o.payment_status,
      o.note,
      u.id AS user_id,
      u.name AS customer_name,
      u.phone AS customer_phone
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;

  // Lấy chi tiết sản phẩm trong đơn hàng (có thêm tên từ bảng products nếu muốn)
  const detailsQuery = `
    SELECT 
      od.product_id,
      od.product_name,
      od.quantity,
      od.price_at_order,
      od.discount_percent_at_order,
      p.image_url
    FROM order_details od
    LEFT JOIN products p ON od.product_id = p.id
    WHERE od.order_id = ?
  `;

  db.query(orderQuery, [orderId], (err, orderResult) => {
    if (err) return res.status(500).json({ message: "Lỗi khi lấy thông tin đơn hàng" });
    if (orderResult.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const order = orderResult[0];

    db.query(detailsQuery, [orderId], (err, detailsResult) => {
      if (err) return res.status(500).json({ message: "Lỗi khi lấy chi tiết đơn hàng" });

      res.json({
        order_id: order.order_id,
        created_at: order.created_at,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        note: order.note,
        customer: {
          id: order.user_id,
          name: order.customer_name,
          phone: order.customer_phone,
        },
        products: detailsResult.map(item => ({
          product_id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.price_at_order,
          discount_percent: item.discount_percent_at_order,
          image_url: item.image_url || null
        }))
      });
    });
  });
});


//API lấy đơn hàng của 1 khách
app.get("/users/:id/orders", (req, res) => {
  const userId = req.params.id;
  db.query(
    "SELECT * FROM orders WHERE user_id = ?",
    [userId],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Lỗi khi lấy đơn hàng người dùng" });
      res.json(result);
    }
  );
});

// API hủy đơn hàng
app.put("/orders/:id/cancel", async (req, res) => {
  const orderId = req.params.id;
  const connection = await db.promise().getConnection(); // Sử dụng promise pool

  try {
    await connection.beginTransaction();

    // 1. Kiểm tra trạng thái đơn hàng hiện tại
    const [orderRows] = await connection.query(
      "SELECT payment_status FROM orders WHERE id = ?",
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error("Đơn hàng không tồn tại");
    }

    // Chỉ cho phép hủy đơn hàng đang chờ xử lý (pending)
    if (orderRows[0].payment_status !== 'pending') {
      throw new Error(`Không thể hủy đơn hàng đã ở trạng thái ${orderRows[0].payment_status}`);
    }

    // 2. Lấy chi tiết đơn hàng để hoàn trả tồn kho
    const [details] = await connection.query(
      `SELECT od.product_id, od.quantity, p.manage_stock
       FROM order_details od
       JOIN products p ON od.product_id = p.id
       WHERE od.order_id = ?`,
      [orderId]
    );

    // 3. Cập nhật trạng thái đơn hàng thành 'cancelled'
    await connection.query(
      "UPDATE orders SET payment_status = 'cancelled' WHERE id = ?",
      [orderId]
    );

    // 4. Hoàn trả số lượng tồn kho cho các sản phẩm được quản lý
    const stockRestorePromises = details
      .filter(item => item.manage_stock === 1 || item.manage_stock === true) // Chỉ hoàn trả nếu manage_stock = true
      .map(item => {
        return connection.query(
          "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
          [item.quantity, item.product_id]
        ).catch(err => {
          console.error("❌ MySQL error when restoring stock quantity:", err);
          throw err;
        });
      });
    await Promise.all(stockRestorePromises);

    // 5. Commit transaction nếu mọi thứ thành công
    await connection.commit();

    res.json({ message: `Đơn hàng ${orderId} đã được hủy thành công.` });

  } catch (error) {
    await connection.rollback(); // Rollback transaction nếu có lỗi
    console.error("Lỗi khi hủy đơn hàng:", error);
    res.status(500).json({ message: error.message || "Lỗi máy chủ khi hủy đơn hàng" });
  } finally {
    connection.release(); // Luôn giải phóng kết nối
  }
});

// TRANSACTION API (ZaloPay)
app.post("/transactions", (req, res) => {
  const {
    order_id,
    app_trans_id,
    zp_trans_token,
    amount,
    description,
    status,
    zp_transaction_id,
    payment_time,
  } = req.body;
  db.query(
    `INSERT INTO transactions (order_id, app_trans_id, zp_trans_token, amount, description, status, zp_transaction_id, payment_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order_id,
      app_trans_id,
      zp_trans_token,
      amount,
      description,
      status,
      zp_transaction_id,
      payment_time,
    ],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi lưu giao dịch" });
      res.json({ message: "Giao dịch đã được lưu" });
    }
  );
});

app.get("/transactions", (req, res) => {
  db.query("SELECT * FROM transactions", (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi khi lấy giao dịch" });
    res.json(result);
  });
});

// DOANH THU REPORT (theo ngày)
app.get("/report/revenue", (req, res) => {
  const { startDate, endDate } = req.query;
  
  db.query(
    `SELECT DATE(created_at) as date, SUM(total_amount) as total_revenue
     FROM orders
     WHERE payment_status = 'paid'
     AND DATE(created_at) BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
     AND IFNULL(?, NOW())
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [startDate, endDate],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Lỗi khi lấy báo cáo doanh thu" });
      res.json(result);
    }
  );
});


// API BÁO CÁO ĐƠN HÀNG VÀ DOANH THU
app.get("/report/orders", (req, res) => {
  const { startDate, endDate } = req.query;

  // Query tổng quan đơn hàng và doanh thu - chỉ tính đơn paid
  const overviewQuery = `
    SELECT 
      COUNT(*) AS total_orders,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS total_revenue,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid_orders,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS pending_orders,
      COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) AS cancelled_orders,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS paid_revenue,
      0 AS pending_revenue,
      COUNT(DISTINCT user_id) AS unique_customers,
      COUNT(CASE WHEN payment_method = 'cash' AND payment_status = 'paid' THEN 1 END) AS cash_orders,
      COUNT(CASE WHEN payment_method = 'zalopay' AND payment_status = 'paid' THEN 1 END) AS zalopay_orders,
      COUNT(CASE WHEN payment_method = 'banking' AND payment_status = 'paid' THEN 1 END) AS banking_orders
    FROM orders
    WHERE DATE(created_at) BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
  `;

  // Query doanh thu theo ngày - chỉ tính đơn paid
  const dailyRevenueQuery = `
    SELECT 
      DATE(created_at) AS date,
      COUNT(*) AS order_count,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS daily_revenue,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid_count,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS pending_count,
      COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) AS cancelled_count,
      COUNT(DISTINCT user_id) AS unique_customers,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS paid_revenue,
      COUNT(CASE WHEN payment_method = 'cash' AND payment_status = 'paid' THEN 1 END) AS cash_orders,
      COUNT(CASE WHEN payment_method = 'zalopay' AND payment_status = 'paid' THEN 1 END) AS zalopay_orders,
      COUNT(CASE WHEN payment_method = 'banking' AND payment_status = 'paid' THEN 1 END) AS banking_orders
    FROM orders
    WHERE DATE(created_at) BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;

  // Query top sản phẩm bán chạy - chỉ tính đơn paid
  const topProductsQuery = `
    SELECT 
      od.product_id,
      od.product_name,
      p.category_id,
      c.name AS category_name,
      SUM(od.quantity) AS total_quantity,
      SUM(
        od.quantity * od.price_at_order * (1 - IFNULL(od.discount_percent_at_order, 0) / 100)
      ) AS total_revenue,
      AVG(od.price_at_order) AS avg_price,
      AVG(od.discount_percent_at_order) AS avg_discount,
      COUNT(DISTINCT od.order_id) AS order_count
    FROM order_details od
    JOIN orders o ON od.order_id = o.id AND o.payment_status = 'paid'
    LEFT JOIN products p ON od.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE DATE(o.created_at) BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
    GROUP BY od.product_id, od.product_name, p.category_id, c.name
    ORDER BY total_revenue DESC
    LIMIT 10
  `;

  // Query doanh thu theo danh mục - chỉ tính đơn paid
  const categoryRevenueQuery = `
    SELECT 
      c.id AS category_id,
      c.name AS category_name,
      SUM(od.quantity) AS total_quantity,
      SUM(
        od.quantity * od.price_at_order * (1 - IFNULL(od.discount_percent_at_order, 0) / 100)
      ) AS total_revenue,
      AVG(od.price_at_order) AS avg_price,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT o.user_id) AS customer_count
    FROM order_details od
    JOIN orders o ON od.order_id = o.id AND o.payment_status = 'paid'
    JOIN products p ON od.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    WHERE DATE(o.created_at) BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
  `;

  // Thực hiện các query song song
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(overviewQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(dailyRevenueQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(topProductsQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(categoryRevenueQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    })
  ])
    .then(([overview, dailyRevenue, topProducts, categoryRevenue]) => {
      res.json({
        overview,
        dailyRevenue,
        topProducts,
        categoryRevenue
      });
    })
    .catch(err => {
      console.error("Report Error:", err);
      res.status(500).json({
        message: "Lỗi khi lấy báo cáo đơn hàng",
        error: err
      });
    });
});


// CATEGORY API
// Lấy danh sách categories
app.get("/categories", (req, res) => {
  db.query("SELECT id, name, description, created_at FROM categories ORDER BY created_at DESC", (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi khi lấy danh sách categories" });
    res.json(result);
  });
});

// Thêm category mới
app.post("/categories", (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Tên category là bắt buộc" });
  }

  db.query(
    "INSERT INTO categories (name, description, created_at) VALUES (?, ?, NOW())",
    [name, description],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Lỗi khi thêm category" });
      res.json({
        message: "Thêm category thành công",
        categoryId: result.insertId
      });
    }
  );
});

// Xóa category
app.delete("/categories/:id", (req, res) => {
  const categoryId = req.params.id;

  // Kiểm tra xem category có sản phẩm nào không
  db.query(
    "SELECT COUNT(*) as count FROM products WHERE category_id = ?",
    [categoryId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Lỗi khi kiểm tra category" });

      if (result[0].count > 0) {
        return res.status(400).json({
          message: "Không thể xóa category vì vẫn còn sản phẩm thuộc category này"
        });
      }

      // Nếu không có sản phẩm, tiến hành xóa
      db.query(
        "DELETE FROM categories WHERE id = ?",
        [categoryId],
        (err) => {
          if (err) return res.status(500).json({ message: "Lỗi khi xóa category" });
          res.json({ message: "Xóa category thành công" });
        }
      );
    }
  );
});

// Cập nhật category
app.put("/categories/:id", (req, res) => {
  const categoryId = req.params.id;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Tên category là bắt buộc" });
  }

  db.query(
    "UPDATE categories SET name = ?, description = ? WHERE id = ?",
    [name, description, categoryId],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi khi cập nhật category" });
      res.json({ message: "Cập nhật category thành công" });
    }
  );
});

// Cập nhật thông tin người dùng
app.put("/users/:id", (req, res) => {
  const userId = req.params.id;
  const { name, email, phone, role } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  if (!name || !email || !phone || !role) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
  }

  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ message: "Vai trò không hợp lệ" });
  }

  const query = "UPDATE users SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?";
  db.query(query, [name, email, phone, role, userId], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi khi cập nhật thông tin người dùng" });
    res.json({ message: "Cập nhật thông tin thành công" });
  });
});

// Xóa người dùng
app.delete("/users/:id", (req, res) => {
  const userId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  // Kiểm tra xem người dùng có tồn tại không
  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi khi kiểm tra người dùng" });
    if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    // Xóa người dùng
    db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
      if (err) return res.status(500).json({ message: "Lỗi khi xóa người dùng" });
      res.json({ message: "Xóa người dùng thành công" });
    });
  });
});

// Đổi mật khẩu
app.post("/change-password", (req, res) => {
  const { email, currentPassword, newPassword, confirmPassword } = req.body;

  if (!email || !currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Mật khẩu mới không khớp" });
  }

  // Kiểm tra email và mật khẩu hiện tại
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi kiểm tra mật khẩu" });
    if (results.length === 0) return res.status(400).json({ message: "Email không tồn tại" });

    const user = results[0];
    if (user.password !== currentPassword) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    // Cập nhật mật khẩu mới
    db.query("UPDATE users SET password = ? WHERE id = ?", [newPassword, user.id], (err) => {
      if (err) return res.status(500).json({ message: "Lỗi đổi mật khẩu" });
      res.json({ message: "Đổi mật khẩu thành công" });
    });
  });
});


// Tạo đơn hàng ZaloPay
app.post("/zalopay/create-order", async (req, res) => {
  try {
    const { orderId, amount, description } = req.body;

    const app_trans_id = `${moment().format("YYMMDD")}_${orderId}`;
    const embed_data = {};
    const item = [];

    const data = {
      app_id: config.app_id,
      app_trans_id,
      app_user: "demo_user",
      app_time: Date.now(),
      item: JSON.stringify(item),
      embed_data: JSON.stringify(embed_data),
      amount,
      description,
      bank_code: "",
      callback_url: "https://pos-gkra.onrender.com/zalopay/callback",
    };

    const dataStr =
      config.app_id +
      "|" +
      data.app_trans_id +
      "|" +
      data.app_user +
      "|" +
      data.amount +
      "|" +
      data.app_time +
      "|" +
      data.embed_data +
      "|" +
      data.item;

    data.mac = crypto.createHmac("sha256", config.key1).update(dataStr).digest("hex");

    const response = await axios.post(config.endpoint, null, {
      params: data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const zpTransToken = response.data.zp_trans_token;

    await db.execute(
      `INSERT INTO transactions (order_id, app_trans_id, zp_trans_token, amount, description)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, app_trans_id, zpTransToken, amount, description]
    );

    res.json({
      order_url: response.data.order_url,
      app_trans_id,
    });
  } catch (error) {
    console.error("Lỗi tạo đơn hàng ZaloPay:", error?.response?.data || error.message);
    res.status(500).json({
      message: "Không thể tạo đơn ZaloPay",
      error: error?.response?.data || error.message,
    });
  }
});


app.post("/zalopay/callback", async (req, res) => {
  const { data, mac } = req.body;
  console.log("📥 NHẬN CALLBACK ZALOPAY:", req.body);

  try {
    // ✅ Parse data JSON
    const callbackData = JSON.parse(data);
    console.log("✅ Callback từ ZaloPay:", callbackData);

    // ✅ Validate checksum
    const macCheck = crypto
      .createHmac("sha256", config.key2)
      .update(data)
      .digest("hex");

    if (mac !== macCheck) {
      console.warn("❌ Sai MAC callback từ ZaloPay");
      return res.status(400).json({ return_code: -1, return_message: "Invalid MAC" });
    }

    const { app_trans_id, zp_trans_id, server_time, amount } = callbackData;

    // ✅ Cập nhật bảng transactions ngay lập tức
    const updateResult = await db.execute(
      `UPDATE transactions 
       SET status = ?, zp_transaction_id = ?, payment_time = ? 
       WHERE app_trans_id = ?`,
      ["success", zp_trans_id, new Date(server_time), app_trans_id]
    );

    console.log(`✅ Updated ${updateResult[0].affectedRows} transaction record(s)`);

    // ✅ Đồng bộ bảng orders theo transaction ngay lập tức
    const orderUpdateResult = await db.execute(
      `UPDATE orders o
       JOIN transactions t ON o.id = t.order_id
       SET o.payment_status = 'paid'
       WHERE t.app_trans_id = ? AND t.status = 'success'`,
      [app_trans_id]
    );

    console.log(`✅ Updated ${orderUpdateResult[0].affectedRows} order record(s) to 'paid' status`);

    // ✅ Ghi log để debug
    if (orderUpdateResult[0].affectedRows > 0) {
      console.log(`🎉 Thanh toán thành công cho app_trans_id: ${app_trans_id}, amount: ${amount}`);
    } else {
      console.warn(`⚠️ Không tìm thấy order để cập nhật cho app_trans_id: ${app_trans_id}`);
    }

    return res.json({ return_code: 1, return_message: "OK" });

  } catch (err) {
    console.error("❌ Lỗi xử lý callback ZaloPay:", err.message);
    return res.status(500).json({ return_code: -1, return_message: "Server Error" });
  }
});


// API BÁO CÁO NÂNG CAO
app.get("/report/analytics", (req, res) => {
  const { startDate, endDate } = req.query;

  // 1. Phân tích xu hướng doanh thu
  const revenueAnalysisQuery = `
    SELECT 
      DATE(created_at) as date,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as revenue,
      COUNT(*) as order_count,
      AVG(total_amount) as avg_order_value,
      DAYNAME(created_at) as day_of_week,
      HOUR(created_at) as hour_of_day
    FROM orders 
    WHERE created_at BETWEEN ? AND ?
    GROUP BY DATE(created_at), DAYNAME(created_at), HOUR(created_at)
    ORDER BY date ASC
  `;

  // 2. Phân tích tồn kho và xu hướng tiêu thụ
  const inventoryAnalysisQuery = `
    SELECT 
      p.id,
      p.name,
      p.stock_quantity as current_stock,
      p.price,
      c.name as category,
      COALESCE(SUM(od.quantity), 0) as total_sold,
      COALESCE(AVG(od.quantity), 0) as avg_daily_sold,
      DATEDIFF(NOW(), MAX(o.created_at)) as days_since_last_sale,
      p.stock_quantity / NULLIF(AVG(od.quantity), 0) as days_of_inventory_left
    FROM products p
    LEFT JOIN order_details od ON p.id = od.product_id
    LEFT JOIN orders o ON od.order_id = o.id AND o.payment_status = 'paid'
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE (o.created_at BETWEEN ? AND ?) OR o.created_at IS NULL
    GROUP BY p.id, p.name, p.stock_quantity, p.price, c.name
  `;

  // 3. Phân tích lợi nhuận và hiệu quả chiết khấu
  const profitAnalysisQuery = `
    SELECT 
      p.id,
      p.name,
      p.price as original_price,
      AVG(od.discount_percent_at_order) as avg_discount,
      COUNT(DISTINCT o.id) as number_of_orders,
      COUNT(DISTINCT CASE WHEN od.discount_percent_at_order > 0 THEN o.id END) as discounted_orders,
      SUM(od.quantity) as total_quantity,
      SUM(od.quantity * od.price_at_order) as revenue_before_discount,
      SUM(od.quantity * od.price_at_order * (1 - IFNULL(od.discount_percent_at_order, 0) / 100)) as revenue_after_discount,
      AVG(CASE WHEN od.discount_percent_at_order > 0 
          THEN od.quantity 
          ELSE NULL 
      END) as avg_quantity_when_discounted
    FROM products p
    LEFT JOIN order_details od ON p.id = od.product_id
    LEFT JOIN orders o ON od.order_id = o.id AND o.payment_status = 'paid'
    WHERE o.created_at BETWEEN ? AND ?
    GROUP BY p.id, p.name, p.price
  `;

  // 4. Phân tích thời điểm bán hàng
  const timeAnalysisQuery = `
    SELECT 
      HOUR(created_at) as hour,
      DAYNAME(created_at) as day,
      COUNT(*) as order_count,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as revenue,
      COUNT(DISTINCT user_id) as unique_customers
    FROM orders
    WHERE created_at BETWEEN ? AND ?
    GROUP BY HOUR(created_at), DAYNAME(created_at)
    ORDER BY DAYOFWEEK(created_at), HOUR(created_at)
  `;

  // 5. Phân tích hành vi khách hàng
  const customerAnalysisQuery = `
    SELECT 
      u.id,
      u.name,
      u.phone,
      COUNT(DISTINCT o.id) as total_orders,
      SUM(o.total_amount) as total_spent,
      AVG(o.total_amount) as avg_order_value,
      MAX(o.created_at) as last_order_date,
      MIN(o.created_at) as first_order_date,
      DATEDIFF(MAX(o.created_at), MIN(o.created_at)) as days_between_first_last_order,
      COUNT(DISTINCT p.category_id) as unique_categories_bought,
      GROUP_CONCAT(DISTINCT p.category_id) as preferred_categories,
      GROUP_CONCAT(DISTINCT 
        CONCAT(
          od.product_name, 
          ' (', od.quantity, ' lần',
          ', giá: ', od.price_at_order,
          IF(od.discount_percent_at_order > 0, 
             CONCAT(', giảm: ', od.discount_percent_at_order, '%'),
             ''),
          ')'
        )
        ORDER BY od.product_name
        SEPARATOR '; '
      ) as purchased_products,
      GROUP_CONCAT(DISTINCT 
        CONCAT(
          DATE_FORMAT(o.created_at, '%d/%m/%Y'),
          ' - ',
          FORMAT(o.total_amount, 0),
          'đ'
        )
        ORDER BY o.created_at DESC
        SEPARATOR '; '
      ) as order_history
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id AND o.payment_status = 'paid'
    LEFT JOIN order_details od ON o.id = od.order_id
    LEFT JOIN products p ON od.product_id = p.id
    WHERE o.created_at BETWEEN ? AND ?
    GROUP BY u.id, u.name, u.phone
    HAVING total_orders > 0
    ORDER BY total_spent DESC
  `;

  // Thực hiện các query song song
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(revenueAnalysisQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve({ revenueAnalysis: result });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(inventoryAnalysisQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve({ inventoryAnalysis: result });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(profitAnalysisQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve({ profitAnalysis: result });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(timeAnalysisQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve({ timeAnalysis: result });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(customerAnalysisQuery, [startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve({ customerAnalysis: result });
      });
    })
  ])
    .then(([revenue, inventory, profit, time, customer]) => {
      res.json({
        ...revenue,
        ...inventory,
        ...profit,
        ...time,
        ...customer,
        metadata: {
          period: {
            start: startDate,
            end: endDate
          },
          generated_at: new Date()
        }
      });
    })
    .catch(err => {
      console.error("Analytics Error:", err);
      res.status(500).json({
        message: "Lỗi khi phân tích dữ liệu",
        error: err
      });
    });
});


// Cập nhật API_CONTEXT để AI hiểu thêm các chỉ số mới
const API_CONTEXT = `
Bạn là một trợ lý phân tích dữ liệu bán hàng thông minh, giúp chủ cửa hàng đưa ra quyết định kinh doanh. 

Quy tắc trả lời:
1. KHÔNG BAO GIỜ đề cập đến thông tin kỹ thuật như API, endpoint, query, database.
2. Nếu thiếu dữ liệu để trả lời, hãy nêu rõ "Hiện tại chưa có đủ dữ liệu về [loại dữ liệu] để trả lời câu hỏi này."
3. Với câu hỏi về khách hàng thân thiết, phân tích dựa trên:
   - Tổng số đơn hàng của khách
   - Tổng giá trị các đơn hàng
   - Tần suất mua hàng (thời gian giữa các đơn)
   - Trạng thái thanh toán của đơn hàng
   - Thời gian từ lần mua đầu đến gần nhất
4. Khi trả lời về khách hàng, cần bao gồm:
   - Tên và số điện thoại của khách
   - Chi tiết lịch sử mua hàng (số đơn, tổng giá trị, trạng thái)
   - Đánh giá mức độ thân thiết dựa trên:
     + Khách thân thiết: > 3 đơn hoặc tổng > 100.000đ
     + Khách tiềm năng: 2-3 đơn hoặc tổng 50.000đ-100.000đ
     + Khách mới: 1 đơn hoặc tổng < 50.000đ


Quy tắc tính toán doanh thu:
1. Chỉ tính doanh thu từ các đơn hàng có trạng thái "paid"
2. Không tính các đơn hàng "pending" hoặc "cancelled"
3. Khi tính tổng doanh thu:
   - Kiểm tra từng giao dịch có hợp lệ không
   - Chỉ cộng dồn các số tiền > 0
   - Format số tiền theo chuẩn VNĐ

4. Khi phân tích theo thời gian:
   - Chỉ phân tích từ ngày có dữ liệu đầu tiên
   - Nếu không có dữ liệu trong khoảng thời gian, trả lời "Không có doanh thu"
   - Nêu rõ số lượng đơn hàng đã thanh toán/chưa thanh toán/hủy

5. Khi so sánh doanh thu:
   - So sánh cùng kỳ chỉ khi có dữ liệu của cả 2 kỳ
   - Nêu rõ "không thể so sánh" nếu thiếu dữ liệu kỳ trước
"Dựa trên dữ liệu mua hàng, có thể phân loại khách hàng như sau:

Khách hàng thân thiết:
- Anh Thành Tài (0356882700):
  + 3 đơn hàng, tổng 35.000đ
  + Mua hàng đều đặn từ 20/4/2025
  + 1 đơn đã thanh toán, 2 đơn đang chờ

Đề xuất hành động:
1. Liên hệ nhắc thanh toán 2 đơn pending
2. Gửi ưu đãi đặc biệt cho khách thân thiết

Ví dụ cách trả lời tốt:
"Phân tích doanh thu tháng 5/2025:
- Tổng doanh thu: 165.000 đồng
- Số đơn hàng: 8 đơn
  + Đã thanh toán: 6 đơn
  + Chờ thanh toán: 1 đơn
  + Đã hủy: 1 đơn
Để tối ưu chương trình, cần bổ sung thêm:
- Thông tin sản phẩm đã mua
- Phản hồi của khách hàng"
Không thể so sánh với tháng 5/2024 do chưa có dữ liệu."


Quy tắc xử lý thời gian và hiển thị số tiền giữ nguyên như cũ...

Quy tắc xử lý thời gian:
1. Khi nói về "tuần sau", "tháng sau":
   - Tính từ ngày hiện tại về phía tương lai
   Ví dụ: Nếu hôm nay là 27/5:
   - "tuần sau" = từ 28/5 đến 3/6
   - "tháng sau" = từ 1/6 đến 30/6

2. Khi dự báo:
   - Sử dụng dữ liệu 4 tuần gần nhất
   - So sánh các khoảng thời gian tương đương
   - Nêu rõ độ tin cậy của dự báo

3. Khi so sánh "cùng kỳ":
   - So sánh với cùng thời điểm năm trước
   Ví dụ: "tháng này so với cùng kỳ năm trước"

Quy tắc hiển thị số tiền:
1. Sử dụng dấu chấm (.) làm dấu phân cách hàng nghìn
2. KHÔNG sử dụng số thập phân cho VNĐ
3. Luôn kết thúc bằng đơn vị "đồng" hoặc "VNĐ"

Ví dụ format số tiền:
- 1000000 → 1.000.000 đồng
- 50000 → 50.000 đồng
- 1234567 → 1.234.567 đồng

Trả lời bằng tiếng Việt, thân thiện, dễ hiểu, tập trung vào giá trị kinh doanh.
`;

// ====== Hàm trích xuất ngày từ câu hỏi ======
function extractDateRangeFromQuestion(question) {
  try {
    const lowerQuestion = question.toLowerCase();
    const currentYear = new Date().getFullYear();

    // Xử lý ngày cụ thể (VD: ngày 30/4)
    const specificDateMatch = lowerQuestion.match(/ngày\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (specificDateMatch) {
      const day = parseInt(specificDateMatch[1]);
      const month = parseInt(specificDateMatch[2]);
      const year = specificDateMatch[3] ? parseInt(specificDateMatch[3]) : currentYear;
      const date = new Date(year, month - 1, day);
      return {
        startDate: date.toISOString().split("T")[0],
        endDate: date.toISOString().split("T")[0]
      };
    }

    // Xử lý tháng cụ thể (VD: tháng 4)
    const monthMatch = lowerQuestion.match(/tháng\s*(\d{1,2})(?:\/(\d{4}))?/);
    if (monthMatch) {
      const month = parseInt(monthMatch[1]);
      const year = monthMatch[2] ? parseInt(monthMatch[2]) : currentYear;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0); // Ngày cuối của tháng
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0]
      };
    }

    // Xử lý "tất cả" hoặc "all time"
    if (lowerQuestion.includes('tất cả')
      || lowerQuestion.includes('năm nay')
      || lowerQuestion.includes('all time')
      || lowerQuestion.includes('tất cả thời gian')
      || lowerQuestion.includes('năm qua')) {
      const start = new Date(currentYear, 0, 1); // Ngày đầu năm hiện tại
      const end = new Date(currentYear, 11, 31); // Ngày cuối năm hiện tại
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0]
      };
    }

    // Xử lý "X tháng qua" hoặc "X tháng gần đây"
    const monthsAgoMatch = lowerQuestion.match(/(\d+)\s*tháng\s*(qua|gần đây|trước|vừa qua)/);
    if (monthsAgoMatch) {
      const monthsAgo = parseInt(monthsAgoMatch[1]);
      const now = new Date(); // Sử dụng thời gian hiện tại
      const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0]
      };
    }

    // Mặc định: lấy tháng hiện tại
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0]
    };
  } catch (error) {
    console.error("Error extracting date range:", error);
    // Fallback: tháng hiện tại
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0]
    };
  }
}

// ========== API /ask-ai ==========
app.post("/ask-ai", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: "Vui lòng nhập câu hỏi hợp lệ"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return res.status(500).json({
        error: "Chưa cấu hình API key cho AI"
      });
    }

    const { startDate, endDate } = extractDateRangeFromQuestion(question);
    console.log(`Date range: ${startDate} to ${endDate}`);

    try {
      // Fetch data from multiple endpoints in parallel
      const [reportOrdersRes, revenueRes, analyticsRes, usersRes] = await Promise.all([
        axios.get(`${process.env.API_URL}/report/orders`, {
          params: { startDate, endDate },
          timeout: 10000
        }),
        axios.get(`${process.env.API_URL}/report/revenue`, {
          timeout: 10000
        }),
        axios.get(`${process.env.API_URL}/report/analytics`, {
          params: { startDate, endDate },
          timeout: 10000
        }),
        axios.get(`${process.env.API_URL}/users`, {
          timeout: 10000
        })
      ]);

      // For each customer in usersRes.data, fetch their orders
      const customerOrdersPromises = usersRes.data
        .filter(user => user.role === 'customer')
        .map(customer =>
          axios.get(`${process.env.API_URL}/users/${customer.id}/orders`, {
            timeout: 10000
          }).catch(err => {
            console.warn(`Failed to fetch orders for customer ${customer.id}:`, err.message);
            return { data: [] };
          })
        );

      const customerOrdersResponses = await Promise.all(customerOrdersPromises);

      // Combine all data
      const combinedData = {
        orders: reportOrdersRes.data,
        revenue: revenueRes.data,
        analytics: analyticsRes.data,
        customers: usersRes.data
          .filter(user => user.role === 'customer')
          .map((customer, index) => ({
            ...customer,
            orders: customerOrdersResponses[index].data || []
          }))
      };

      const prompt = `
${API_CONTEXT}

Khoảng thời gian: từ ${startDate} đến ${endDate}

Dữ liệu tổng hợp:
${JSON.stringify(combinedData, null, 2)}

Câu hỏi: ${question}
      `.trim();

      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      };

      const geminiRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        payload,
        { timeout: 15000 }
      );

      const aiReply = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiReply) {
        throw new Error("Không nhận được phản hồi hợp lệ từ AI");
      }

      return res.json({ reply: aiReply });

    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 404) {
        return res.status(404).json({
          error: "Không tìm thấy dữ liệu cho khoảng thời gian này"
        });
      }
      throw error;
    }

  } catch (error) {
    console.error("Error in /ask-ai:", error);
    const errorMessage = error.response?.data?.error ||
      error.message ||
      "Lỗi xử lý yêu cầu. Vui lòng thử lại sau.";

    return res.status(500).json({ error: errorMessage });
  }
});

// Text to Speech Helper Functions
const numberToVietnameseWords = (num) => {
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

  if (num === 0) return "không";

  const toWordsBelowThousand = (n) => {
    let result = "";

    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    const ten = Math.floor(remainder / 10);
    const unit = remainder % 10;

    if (hundred > 0) {
      result += ones[hundred] + " trăm ";
      if (remainder > 0 && ten === 0) result += "lẻ ";
    }

    if (ten > 1) {
      result += tens[ten] + (unit ? " " + ones[unit] : "");
    } else if (ten === 1) {
      result += "mười" + (unit ? " " + ones[unit] : "");
    } else if (ten === 0 && unit > 0) {
      result += ones[unit];
    }

    return result.trim();
  };

  let result = "";
  const million = Math.floor(num / 1_000_000);
  const thousand = Math.floor((num % 1_000_000) / 1_000);
  const belowThousand = num % 1_000;

  if (million > 0) {
    result += toWordsBelowThousand(million) + " triệu ";
  }

  if (thousand > 0) {
    result += toWordsBelowThousand(thousand) + " nghìn ";
  } else if (million > 0 && (belowThousand > 0 || thousand === 0)) {
    result += "không nghìn ";
  }

  if (belowThousand > 0) {
    result += toWordsBelowThousand(belowThousand);
  }

  return result.trim();
};

// Text to Speech API Endpoint
app.post("/api/tts/payment-success", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Thiếu số tiền" });
    }

    // Kiểm tra API key
    if (!process.env.GOOGLE_API_KEY) {
      console.error("Missing GOOGLE_API_KEY in environment variables");
      return res.status(500).json({ 
        error: "Chưa cấu hình Google API key" 
      });
    }

    // 1. Làm sạch số tiền
    const cleanAmount = parseInt(Number(amount));
    
    // 2. Chuyển số thành chữ
    const amountInWords = numberToVietnameseWords(cleanAmount);
    
    // 3. Tạo câu hoàn chỉnh
    const message = `Thanh toán thành công ${amountInWords} đồng`;

    try {
      // 4. Gọi Google TTS API với timeout
      const response = await axios.post(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`,
        {
          input: { text: message },
          voice: { languageCode: "vi-VN", ssmlGender: "FEMALE" },
          audioConfig: { audioEncoding: "MP3" },
        },
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.GOOGLE_API_KEY
          }
        }
      );

      // 5. Trả về audio content
      return res.json({ 
        audioContent: response.data.audioContent,
        message: message 
      });

    } catch (apiError) {
      console.error("Google TTS API Error:", {
        status: apiError.response?.status,
        data: apiError.response?.data,
        message: apiError.message
      });

      // Trả về lỗi cụ thể cho client
      if (apiError.response?.status === 403) {
        return res.status(500).json({
          error: "Lỗi xác thực với Google TTS API. Vui lòng kiểm tra cấu hình API key.",
          details: apiError.response.data
        });
      }

      throw apiError; // Ném lỗi để catch block bên ngoài xử lý
    }

  } catch (error) {
    console.error("TTS Processing Error:", error);
    res.status(500).json({ 
      error: "Lỗi khi xử lý text-to-speech",
      details: error.message 
    });
  }
});

// ✅ Webhook endpoint nhận transaction từ Payhook
app.post("/webhook/payhook", async (req, res) => {
  try {
    const { event, transaction, timestamp } = req.body;
    
    console.log("📥 NHẬN WEBHOOK TỪ PAYHOOK:", { event, transactionId: transaction?.transactionId, timestamp });

    // Kiểm tra event type
    if (event !== 'transaction.detected') {
      console.warn("⚠️  Unknown event type:", event);
      return res.status(400).json({ error: 'Unknown event type' });
    }

    if (!transaction || !transaction.transactionId || !transaction.amountVND) {
      console.warn("⚠️  Missing required transaction data");
      return res.status(400).json({ error: 'Missing required transaction data' });
    }

    // Tìm order đang pending với payment_method = 'cake' và số tiền khớp
    // Lưu ý: Có thể cần match theo số tiền hoặc transactionId trong description/note
    const amount = transaction.amountVND;
    
    // Tìm order pending với payment_method = 'cake' và số tiền gần đúng (cho phép sai số nhỏ)
    const [orders] = await db.promise().query(
      `SELECT id, total_amount, payment_method, payment_status 
       FROM orders 
       WHERE payment_method = 'cake' 
       AND payment_status = 'pending'
       AND ABS(total_amount - ?) <= 1000
       ORDER BY created_at DESC
       LIMIT 1`,
      [amount]
    );

    if (orders.length === 0) {
      console.warn(`⚠️  Không tìm thấy order pending với payment_method='cake' và amount=${amount}`);
      // Vẫn trả về 200 để payhook không retry
      return res.json({ 
        success: false, 
        message: 'No matching pending order found',
        received: { transactionId: transaction.transactionId, amount }
      });
    }

    const order = orders[0];
    const orderId = order.id;

    // Cập nhật order status thành 'paid'
    await db.promise().query(
      `UPDATE orders SET payment_status = 'paid' WHERE id = ?`,
      [orderId]
    );

    console.log(`✅ Updated order ${orderId} to 'paid' status (Cake payment)`);

    // Lưu thông tin transaction vào bảng transactions (nếu cần tracking)
    try {
      await db.promise().query(
        `INSERT INTO transactions (order_id, app_trans_id, amount, description, status, payment_time)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          transaction.transactionId || `CAKE_${Date.now()}`,
          amount,
          `Cake payment - ${transaction.bank || 'UNKNOWN'} - ${transaction.description || ''}`,
          'success'
        ]
      );
    } catch (txError) {
      console.warn("⚠️  Could not save transaction record:", txError.message);
      // Không fail webhook nếu không lưu được transaction record
    }

    return res.json({ 
      success: true, 
      message: 'Order payment confirmed',
      orderId,
      amount 
    });

  } catch (error) {
    console.error("❌ Lỗi xử lý webhook từ Payhook:", error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// ✅ API kiểm tra kết nối DB
app.get("/ping", (req, res) => {
  db.query("SELECT 1", (err, results) => {
    if (err) {
      console.error("❌ Ping DB error:", err.message);
      return res.status(500).send("Ping failed");
    }
    res.send("✅ Ping + DB OK");
  });
});

// ✅ Hàm giữ app luôn sống bằng cách ping chính nó
const keepAlive = () => {
  const URL = "https://pos-0s3v.onrender.com/";

  setInterval(() => {
    axios.get(`${URL}/ping`)
      .then((res) => {
        console.log(`[${moment().format("HH:mm:ss")}] ✅ Keep-alive ping sent:`, res.data);
      })
      .catch((err) => {
        console.error(`[${moment().format("HH:mm:ss")}] ❌ Keep-alive failed:`, err.message);
      });
  }, 4 * 60 * 1000); // mỗi 4 phút
};

// ✅ Hàm giữ kết nối DB sống
const keepDBAlive = () => {
  setInterval(() => {
    db.query("SELECT 1", (err) => {
      if (err) {
        console.error(`[${moment().format("HH:mm:ss")}] ❌ Database connection lost:`, err.message);
      } else {
        console.log(`[${moment().format("HH:mm:ss")}] ✅ Keep-alive query sent to database`);
      }
    });
  }, 5 * 60 * 1000); // mỗi 5 phút
};

// ✅ Gọi các hàm keep-alive khi server start
keepAlive();
// keepDBAlive();

// ✅ Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});