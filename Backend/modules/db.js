const mysql = require("mysql2/promise");
const { getDatabaseConfig } = require("../config/db");

function createPool() {
  return mysql.createPool(getDatabaseConfig());
}

async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(120) NOT NULL,
      email VARCHAR(191) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'customer',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY users_email_unique (email),
      UNIQUE KEY users_phone_unique (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const migrations = [
    ["status", "ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'"],
    ["created_at", "ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];

  for (const [column, statement] of migrations) {
    if (!existingColumns.has(column)) {
      await pool.query(statement);
    }
  }

  if (!existingColumns.has("id")) {
    await pool.query(`
      ALTER TABLE users
      DROP PRIMARY KEY,
      ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST
    `);
  }

  const [userIdColumns] = await pool.execute(
    `SELECT COLUMN_TYPE, EXTRA
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id'`,
  );
  const userIdColumn = userIdColumns[0];

  if (userIdColumn.COLUMN_TYPE.toLowerCase() !== "varchar(255)" || userIdColumn.EXTRA.includes("auto_increment")) {
    await pool.query("ALTER TABLE users MODIFY COLUMN user_id VARCHAR(255) NOT NULL");
  }

  await pool.query(`
    UPDATE users
    SET user_id = UUID()
    WHERE user_id NOT REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  `);

  const [indexes] = await pool.execute(
    `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const userIdHasUniqueIndex = indexes.some(
    (index) => index.COLUMN_NAME === "user_id" && index.SEQ_IN_INDEX === 1 && index.NON_UNIQUE === 0,
  );

  if (!userIdHasUniqueIndex) {
    await pool.query("ALTER TABLE users ADD UNIQUE KEY users_user_id_unique (user_id)");
  }

  // ── Banners table ─────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS banners (
      id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title        VARCHAR(255) NOT NULL,
      subtitle     VARCHAR(255) DEFAULT NULL,
      description  TEXT DEFAULT NULL,
      image        VARCHAR(500) DEFAULT NULL,
      mobile_image VARCHAR(500) DEFAULT NULL,
      link         VARCHAR(500) DEFAULT NULL,
      type         VARCHAR(64) NOT NULL DEFAULT 'hero',
      status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
      sort_order   INT NOT NULL DEFAULT 0,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX banners_type_idx (type),
      INDEX banners_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      cat_id VARCHAR(64) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT DEFAULT NULL,
      subcategory JSON NOT NULL,
      images JSON NOT NULL,
      user_id VARCHAR(255) DEFAULT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY categories_cat_id_unique (cat_id),
      INDEX categories_name_idx (name),
      INDEX categories_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const defaultCategories = [
    { catId: "sneakers", name: "Sneakers", description: "Lightweight everyday sneakers for comfort and style.", subcategory: ["Classic", "Street", "Comfort"] },
    { catId: "running-shoes", name: "Running Shoes", description: "Performance-focused cushioning for runners and active lifestyles.", subcategory: ["Performance", "Cushion", "Speed"] },
    { catId: "formal-shoes", name: "Formal Shoes", description: "Smart leather and premium shoes for dress occasions.", subcategory: ["Office", "Wedding", "Leather"] },
    { catId: "sandals", name: "Sandals", description: "Open-toe and easy-wear sandals for relaxed outdoor comfort.", subcategory: ["Casual", "Slides", "Flip-Flops"] },
    { catId: "sports-shoes", name: "Sports Shoes", description: "Supportive training shoes built for activity and strength.", subcategory: ["Training", "Gym", "Outdoor"] },
  ];

  for (const category of defaultCategories) {
    await pool.query(`
      INSERT INTO categories (cat_id, name, description, subcategory, images, user_id, status)
      SELECT ?, ?, ?, ?, ?, NULL, 'active'
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE cat_id = ?)
    `, [
      category.catId,
      category.name,
      category.description,
      JSON.stringify(category.subcategory),
      JSON.stringify([]),
      category.catId,
    ]);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      product_id BIGINT UNSIGNED NOT NULL,
      variant_color VARCHAR(120) DEFAULT NULL,
      variant_size VARCHAR(64) DEFAULT NULL,
      image VARCHAR(500) DEFAULT NULL,
      email VARCHAR(191) DEFAULT NULL,
      price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX cart_user_idx (user_id),
      INDEX cart_product_idx (product_id),
      UNIQUE KEY cart_user_product_variant_unique (user_id, product_id, variant_color, variant_size)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      product_id BIGINT UNSIGNED NOT NULL,
      variant_color VARCHAR(120) DEFAULT NULL,
      variant_size VARCHAR(64) DEFAULT NULL,
      image VARCHAR(500) DEFAULT NULL,
      email VARCHAR(191) DEFAULT NULL,
      price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX wishlist_user_idx (user_id),
      INDEX wishlist_product_idx (product_id),
      UNIQUE KEY wishlist_user_product_unique (user_id, product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(64) NOT NULL,
      name VARCHAR(191) NOT NULL,
      description TEXT DEFAULT NULL,
      category VARCHAR(120) NOT NULL,
      subcategory VARCHAR(120) DEFAULT NULL,
      brand VARCHAR(120) DEFAULT NULL,
      material VARCHAR(120) DEFAULT NULL,
      mrp DECIMAL(12, 2) NOT NULL DEFAULT 0,
      offer DECIMAL(5, 2) NOT NULL DEFAULT 0,
      offer_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      rating DECIMAL(2, 1) NOT NULL DEFAULT 5,
      total_stock INT UNSIGNED NOT NULL DEFAULT 0,
      variants JSON NOT NULL,
      size_chart VARCHAR(500) DEFAULT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY products_code_unique (product_code),
      INDEX products_name_idx (name),
      INDEX products_category_idx (category),
      INDEX products_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [productColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'`,
  );
  if (!productColumns.some((column) => column.COLUMN_NAME === "size_chart")) {
    await pool.query("ALTER TABLE products ADD COLUMN size_chart VARCHAR(500) DEFAULT NULL");
  }

  const defaultProducts = [
    {
      product_code: "SS0001",
      name: "Velocity Runner Pro",
      description: "Engineered for everyday speed with breathable mesh and responsive cushioning.",
      category: "Running Shoes",
      subcategory: "Performance",
      brand: "Velocity",
      material: "Mesh",
      mrp: 4999,
      offer: 10,
      offer_price: 4499.1,
      rating: 4.8,
      total_stock: 48,
      variants: [{ color: "#1f2937", colorName: "Midnight Black", selectedSizes: ["6", "7", "8", "9", "10"], sizesStock: { "6": 8, "7": 10, "8": 12, "9": 10, "10": 8 }, images: [] }],
      size_chart: null,
      status: "Active",
    },
    {
      product_code: "SS0002",
      name: "Urban Flex Street",
      description: "A lightweight street sneaker built for comfort and all-day wear.",
      category: "Sneakers",
      subcategory: "Street",
      brand: "Urban Flex",
      material: "Canvas",
      mrp: 3499,
      offer: 15,
      offer_price: 2974.15,
      rating: 4.6,
      total_stock: 42,
      variants: [{ color: "#d97706", colorName: "Sunset Orange", selectedSizes: ["5", "6", "7", "8", "9"], sizesStock: { "5": 6, "6": 8, "7": 10, "8": 10, "9": 8 }, images: [] }],
      size_chart: null,
      status: "Active",
    },
    {
      product_code: "SS0003",
      name: "Elite Formal Leather",
      description: "Premium leather formal shoes for office, meetings, and celebrations.",
      category: "Formal Shoes",
      subcategory: "Leather",
      brand: "Elite",
      material: "Leather",
      mrp: 5999,
      offer: 8,
      offer_price: 5519.08,
      rating: 4.9,
      total_stock: 30,
      variants: [{ color: "#1b1b1b", colorName: "Classic Black", selectedSizes: ["7", "8", "9", "10", "11"], sizesStock: { "7": 6, "8": 6, "9": 6, "10": 6, "11": 6 }, images: [] }],
      size_chart: null,
      status: "Active",
    },
    {
      product_code: "SS0004",
      name: "Tropic Breeze Slide",
      description: "Open-toe comfort with flexible soles and soft cushioning for warm days.",
      category: "Sandals",
      subcategory: "Slides",
      brand: "Tropic",
      material: "Rubber",
      mrp: 2499,
      offer: 12,
      offer_price: 2199.12,
      rating: 4.5,
      total_stock: 36,
      variants: [{ color: "#0f766e", colorName: "Teal Foam", selectedSizes: ["6", "7", "8", "9", "10"], sizesStock: { "6": 7, "7": 7, "8": 7, "9": 8, "10": 7 }, images: [] }],
      size_chart: null,
      status: "Active",
    },
    {
      product_code: "SS0005",
      name: "PowerTrain X",
      description: "Training-focused sport shoe with grip, stability, and durable support.",
      category: "Sports Shoes",
      subcategory: "Training",
      brand: "PowerTrain",
      material: "Synthetic",
      mrp: 4299,
      offer: 18,
      offer_price: 3521.18,
      rating: 4.7,
      total_stock: 44,
      variants: [{ color: "#2563eb", colorName: "Electric Blue", selectedSizes: ["6", "7", "8", "9", "10", "11"], sizesStock: { "6": 6, "7": 8, "8": 8, "9": 8, "10": 7, "11": 7 }, images: [] }],
      size_chart: null,
      status: "Active",
    },
  ];

  for (const product of defaultProducts) {
    await pool.query(`
      INSERT INTO products (
        product_code, name, description, category, subcategory, brand, material, mrp, offer, offer_price, rating, total_stock, variants, size_chart, status
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE product_code = ?)
    `, [
      product.product_code,
      product.name,
      product.description,
      product.category,
      product.subcategory,
      product.brand,
      product.material,
      product.mrp,
      product.offer,
      product.offer_price,
      product.rating,
      product.total_stock,
      JSON.stringify(product.variants),
      product.size_chart,
      product.status,
      product.product_code,
    ]);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(32) DEFAULT NULL,
      user_id VARCHAR(255) DEFAULT NULL,
      customer_name VARCHAR(191) NOT NULL,
      customer_email VARCHAR(191) DEFAULT NULL,
      customer_phone VARCHAR(32) NOT NULL,
      street_address VARCHAR(500) DEFAULT NULL,
      city VARCHAR(120) DEFAULT NULL,
      district VARCHAR(120) DEFAULT NULL,
      state VARCHAR(120) DEFAULT NULL,
      country VARCHAR(120) DEFAULT NULL,
      zip_code VARCHAR(20) DEFAULT NULL,
      payment_method VARCHAR(64) NOT NULL DEFAULT 'Showroom',
      payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
      payment_id VARCHAR(191) DEFAULT NULL,
      order_type VARCHAR(32) NOT NULL DEFAULT 'Online',
      status VARCHAR(32) NOT NULL DEFAULT 'Order Placed',
      total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      items JSON NOT NULL,
      tracking_number VARCHAR(191) DEFAULT NULL,
      courier_name VARCHAR(191) DEFAULT NULL,
      shipped_at DATETIME DEFAULT NULL,
      cancellation_reason TEXT DEFAULT NULL,
      cancelled_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY orders_order_id_unique (order_id),
      INDEX orders_user_id_idx (user_id),
      INDEX orders_created_at_idx (created_at),
      INDEX orders_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { createPool, initializeDatabase };
