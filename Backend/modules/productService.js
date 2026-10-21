function parseJson(value, fallback) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toProduct(row) {
  const variants = parseJson(row.variants, []);
  const variantStock = variants.reduce((total, variant) => {
    const stock = Object.values(variant.sizesStock || {}).reduce(
      (sum, quantity) => sum + (Number(quantity) || 0),
      0,
    );
    return total + stock;
  }, 0);

  return {
    ...row,
    description: row.description || "",
    mrp: Number(row.mrp),
    offer: Number(row.offer),
    offer_price: Number(row.offer_price),
    rating: Number(row.rating),
    total_stock: variants.some((variant) => Object.keys(variant.sizesStock || {}).length > 0)
      ? variantStock
      : Number(row.total_stock),
    variants,
  };
}

function createProductService(pool) {
  return {
    async list({ page = 1, limit = 10, search = "", status = "All" } = {}) {
      const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
      const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
      const searchTerm = `%${String(search).trim()}%`;
      const conditions = ["(name LIKE ? OR product_code LIKE ?)"];
      const values = [searchTerm, searchTerm];

      if (status === "Low Stock") {
        conditions.push("total_stock > 0 AND total_stock < 10");
      } else if (status === "Out of Stock") {
        conditions.push("total_stock = 0");
      } else if (status !== "All") {
        conditions.push("status = ?");
        values.push(status);
      }

      const where = conditions.join(" AND ");
      const [rows] = await pool.execute(
        `SELECT * FROM products WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...values, safeLimit, (safePage - 1) * safeLimit],
      );
      const [[count]] = await pool.execute(
        `SELECT COUNT(*) AS total FROM products WHERE ${where}`,
        values,
      );
      const [[stats]] = await pool.execute(
        `SELECT COUNT(*) AS total,
           SUM(status = 'Active') AS active,
           SUM(total_stock > 0 AND total_stock < 10) AS lowStock,
           SUM(total_stock = 0) AS outOfStock
         FROM products WHERE ${where}`,
        values,
      );

      return {
        products: rows.map(toProduct),
        pagination: { total: count.total, totalPages: Math.max(1, Math.ceil(count.total / safeLimit)) },
        stats: {
          total: Number(stats.total) || 0,
          active: Number(stats.active) || 0,
          lowStock: Number(stats.lowStock) || 0,
          outOfStock: Number(stats.outOfStock) || 0,
        },
      };
    },

    async findById(id) {
      const [rows] = await pool.execute("SELECT * FROM products WHERE id = ? LIMIT 1", [id]);
      return rows[0] ? toProduct(rows[0]) : null;
    },

    async latestCode() {
      const [rows] = await pool.execute(
        "SELECT product_code FROM products WHERE product_code REGEXP '^SS[0-9]+$' ORDER BY CAST(SUBSTRING(product_code, 3) AS UNSIGNED) DESC LIMIT 1",
      );
      const nextNumber = rows.length ? Number(rows[0].product_code.slice(2)) + 1 : 1;
      return `SS${String(nextNumber).padStart(4, "0")}`;
    },

    async create(product) {
      const [result] = await pool.execute(
        `INSERT INTO products
          (product_code, name, description, category, subcategory, brand, material, mrp, offer, offer_price, rating, total_stock, variants, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.product_code,
          product.name,
          product.description || null,
          product.category,
          product.subcategory || null,
          product.brand || null,
          product.material || null,
          product.mrp,
          product.offer,
          product.offer_price,
          product.rating,
          product.total_stock,
          JSON.stringify(product.variants),
          product.status,
        ],
      );
      return this.findById(result.insertId);
    },

    async update(id, product) {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }
      const value = { ...existing, ...product };
      await pool.execute(
        `UPDATE products SET
          product_code = ?, name = ?, description = ?, category = ?, subcategory = ?, brand = ?, material = ?,
          mrp = ?, offer = ?, offer_price = ?, rating = ?, total_stock = ?, variants = ?, status = ?
         WHERE id = ?`,
        [
          value.product_code,
          value.name,
          value.description || null,
          value.category,
          value.subcategory || null,
          value.brand || null,
          value.material || null,
          value.mrp,
          value.offer,
          value.offer_price,
          value.rating,
          value.total_stock,
          JSON.stringify(value.variants),
          value.status,
          id,
        ],
      );
      return this.findById(id);
    },

    async remove(id) {
      const [result] = await pool.execute("DELETE FROM products WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createProductService, toProduct };
