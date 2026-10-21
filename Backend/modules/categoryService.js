function toCategoryRecord(row) {
  return {
    id: row.id,
    catId: row.cat_id,
    name: row.name,
    description: row.description || "",
    subcategory: row.subcategory,
    images: row.images,
    user_id: row.user_id,
    status: row.status === "inactive" ? "Inactive" : "Active",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function createCategoryService(pool) {
  return {
    async list() {
      const [rows] = await pool.execute("SELECT * FROM categories ORDER BY created_at DESC, id DESC");
      return rows.map(toCategoryRecord);
    },

    async findByCatId(catId) {
      const [rows] = await pool.execute("SELECT * FROM categories WHERE cat_id = ? LIMIT 1", [catId]);
      return rows[0] ? toCategoryRecord(rows[0]) : null;
    },

    async create(category) {
      await pool.execute(
        `INSERT INTO categories (cat_id, name, description, subcategory, images, user_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          category.catId,
          category.name,
          category.description || null,
          JSON.stringify(category.subcategory),
          JSON.stringify(category.images),
          category.user_id,
          category.status === "Inactive" ? "inactive" : "active",
        ],
      );
      return this.findByCatId(category.catId);
    },

    async update(catId, category) {
      const existing = await this.findByCatId(catId);
      if (!existing) {
        return null;
      }

      await pool.execute(
        `UPDATE categories
         SET name = ?, description = ?, subcategory = ?, images = ?, user_id = ?, status = ?
         WHERE cat_id = ?`,
        [
          category.name,
          category.description || null,
          JSON.stringify(category.subcategory),
          JSON.stringify(category.images),
          category.user_id,
          category.status === "Inactive" ? "inactive" : "active",
          catId,
        ],
      );
      return this.findByCatId(catId);
    },

    async remove(catId) {
      const [result] = await pool.execute("DELETE FROM categories WHERE cat_id = ?", [catId]);
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createCategoryService };
