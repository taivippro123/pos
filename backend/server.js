// File: server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const axios = require("axios");
const moment = require("moment");
const crypto = require("crypto");
const WebSocket = require('ws');
const dotenv = require('dotenv');
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
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
    query += " WHERE phone = ?";
    params.push(phone);
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
    if (err) return res.status(500).json({ message: "Lỗi khi lấy sản phẩm" });
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
    if (err)
      return res
        .status(500)
        .json({ message: "Lỗi kiểm tra người dùng", error: err });

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
        if (err2)
          return res
            .status(500)
            .json({ message: "Lỗi tạo người dùng mới", error: err2 });

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
            if (err) reject(err);
            else if (results.length === 0) reject(new Error(`Không tìm thấy sản phẩm ${product.product_id}`));
            else {
              const productInfo = results[0];
              const manageStock = productInfo.manage_stock === 1 || productInfo.manage_stock === true;
              if (manageStock && productInfo.stock_quantity < product.quantity) {
                reject(new Error(`Sản phẩm ${product.product_name} không đủ số lượng tồn kho`));
              } else {
                resolve({...productInfo, manage_stock: manageStock});
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
            if (err)
              return res
                .status(500)
                .json({ message: "Lỗi tạo đơn hàng", error: err });

            const orderId = orderResult.insertId;
            const details = products.map((p) => [
              orderId,
              p.product_id,
              p.product_name,
              p.quantity,
              p.price_at_order,
              p.discount_percent_at_order,
            ]);

            const detailQuery = `INSERT INTO order_details (order_id, product_id, product_name, quantity, price_at_order, discount_percent_at_order) VALUES ?`;
            db.query(detailQuery, [details], (err2) => {
              if (err2)
                return res
                  .status(500)
                  .json({ message: "Lỗi lưu chi tiết đơn hàng", error: err2 });

              // 3. Cập nhật số lượng tồn kho trong bảng products
              const updateStockPromises = products.map((product, index) => {
                const productInfo = productInfos[index];
                if (productInfo.manage_stock) {
                  return new Promise((resolve, reject) => {
                    db.query(
                      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                      [product.quantity, product.product_id],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                }
                return Promise.resolve();
              });

              Promise.all(updateStockPromises)
                .then(() => {
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
                        updatedProducts: updatedProducts.map(p => ({
                          id: p.id,
                          name: p.name,
                          stock_quantity: p.stock_quantity,
                          manage_stock: p.manage_stock
                        }))
                      });
                    }
                  );
                })
                .catch(err => {
                  res.status(500).json({ message: "Lỗi cập nhật tồn kho", error: err });
                });
            });
          }
        );
      })
      .catch(err => {
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
  db.query(
    `SELECT DATE(payment_time) as date, SUM(amount) as total_revenue
     FROM transactions
     WHERE status = 'success'
     GROUP BY DATE(payment_time)
     ORDER BY date DESC`,
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

  // Query tổng quan đơn hàng và doanh thu
  const overviewQuery = `
    SELECT 
      COUNT(*) AS total_orders,
      SUM(total_amount) AS total_revenue,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid_orders,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS pending_orders,
      COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) AS cancelled_orders,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS paid_revenue,
      SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) AS pending_revenue,
      COUNT(DISTINCT user_id) AS unique_customers,
      COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) AS cash_orders,
      COUNT(CASE WHEN payment_method = 'zalopay' THEN 1 END) AS zalopay_orders,
      COUNT(CASE WHEN payment_method = 'banking' THEN 1 END) AS banking_orders
    FROM orders
    WHERE created_at BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
  `;

  // Query doanh thu theo ngày
  const dailyRevenueQuery = `
    SELECT 
      DATE(created_at) AS date,
      COUNT(*) AS order_count,
      SUM(total_amount) AS daily_revenue,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid_count,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS pending_count,
      COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) AS cancelled_count,
      COUNT(DISTINCT user_id) AS unique_customers,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS paid_revenue,
      COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) AS cash_orders,
      COUNT(CASE WHEN payment_method = 'zalopay' THEN 1 END) AS zalopay_orders,
      COUNT(CASE WHEN payment_method = 'banking' THEN 1 END) AS banking_orders
    FROM orders
    WHERE created_at BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;

  // Query top sản phẩm bán chạy
  const topProductsQuery = `
    SELECT 
      od.product_id,
      od.product_name,
      p.category_id,
      c.name AS category_name,
      SUM(od.quantity) AS total_quantity,
      SUM(od.quantity * od.price_at_order) AS total_revenue,
      AVG(od.price_at_order) AS avg_price,
      AVG(od.discount_percent_at_order) AS avg_discount,
      COUNT(DISTINCT od.order_id) AS order_count
    FROM order_details od
    JOIN orders o ON od.order_id = o.id
    LEFT JOIN products p ON od.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE o.created_at BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
    AND o.payment_status = 'paid'
    GROUP BY od.product_id, od.product_name, p.category_id, c.name
    ORDER BY total_quantity DESC
    LIMIT 10
  `;

  // Query doanh thu theo danh mục
  const categoryRevenueQuery = `
    SELECT 
      c.id AS category_id,
      c.name AS category_name,
      SUM(od.quantity) AS total_quantity,
      SUM(od.quantity * od.price_at_order) AS total_revenue,
      AVG(od.price_at_order) AS avg_price,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT o.user_id) AS customer_count
    FROM order_details od
    JOIN orders o ON od.order_id = o.id
    JOIN products p ON od.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    WHERE o.created_at BETWEEN IFNULL(?, DATE_SUB(NOW(), INTERVAL 30 DAY)) 
    AND IFNULL(?, NOW())
    AND o.payment_status = 'paid'
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
      callback_url: "https://ce55-2a09-bac5-d46f-1028-00-19c-277.ngrok-free.app/zalopay/callback", // nếu cần
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

    // ✅ Cập nhật bảng transactions
    await db.execute(
      `UPDATE transactions 
       SET status = ?, zp_transaction_id = ?, payment_time = ? 
       WHERE app_trans_id = ?`,
      ["success", zp_trans_id, new Date(server_time), app_trans_id]
    );

    // ✅ Đồng bộ bảng orders theo transaction
    await db.execute(
      `UPDATE orders o
       JOIN transactions t ON o.id = t.order_id
       SET o.payment_status = CASE 
         WHEN t.status = 'success' THEN 'paid'
         ELSE 'pending'
       END
       WHERE t.app_trans_id = ?`,
      [app_trans_id]
    );
    
    return res.json({ return_code: 1, return_message: "OK" });

  } catch (err) {
    console.error("❌ Lỗi xử lý callback ZaloPay:", err.message);
    return res.status(500).json({ return_code: -1, return_message: "Server Error" });
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
  const URL = "https://your-app-name.onrender.com"; // 👉 Thay bằng URL thực tế của bạn

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
keepDBAlive();

// ✅ Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});