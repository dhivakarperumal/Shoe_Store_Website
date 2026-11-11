const express = require("express");

function createWishlistRouter(pool) {
  const router = express.Router();

  router.get("/:userId", async (request, response, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM wishlist WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
        [request.params.userId],
      );
      response.json(rows);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const {
        user_id,
        product_id,
        variant_color,
        variant_size,
        image,
        email,
        price,
      } = request.body || {};

      if (!user_id || !product_id) {
        return response.status(400).json({ message: "User ID and product ID are required." });
      }

      const [existingRows] = await pool.query(
        `SELECT * FROM wishlist WHERE user_id = ? AND product_id = ? LIMIT 1`,
        [user_id, product_id],
      );

      if (existingRows.length) {
        return response.status(200).json(existingRows[0]);
      }

      const variantColor = typeof variant_color === "string" ? variant_color : "";
      const variantSize = typeof variant_size === "string" ? variant_size : "";
      const imagePath = typeof image === "string" ? image : "";
      const [result] = await pool.query(
        `INSERT INTO wishlist (user_id, product_id, variant_color, variant_size, image, email, price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, product_id, variantColor, variantSize, imagePath, email || null, Number(price || 0), Number(price || 0)],
      );

      const [rows] = await pool.query("SELECT * FROM wishlist WHERE id = ? LIMIT 1", [result.insertId]);
      response.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:userId/:productId", async (request, response, next) => {
    try {
      const [result] = await pool.query(
        "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?",
        [request.params.userId, request.params.productId],
      );
      if (!result.affectedRows) {
        return response.status(404).json({ message: "Favorite item not found." });
      }
      response.json({ message: "Removed from favorites." });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createWishlistRouter;
