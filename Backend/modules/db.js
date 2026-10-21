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
}

module.exports = { createPool, initializeDatabase };
