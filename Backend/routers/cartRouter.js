const express = require("express");

function createCartRouter(pool) {
  const router = express.Router();

  const normalizeQuantity = (quantity) => {
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed < 1) return 1;
    return parsed;
  };

  router.get("/:userId", async (request, response, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM cart WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
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
        total_price,
        quantity,
      } = request.body || {};

      if (!user_id || !product_id) {
        return response.status(400).json({ message: "User ID and product ID are required." });
      }

      const normalizedQuantity = normalizeQuantity(quantity);
      const parsedPrice = Number(price || 0);
      const parsedTotal = Number(total_price ?? parsedPrice * normalizedQuantity);
      const variantColor = typeof variant_color === "string" ? variant_color : "";
      const variantSize = typeof variant_size === "string" ? variant_size : "";
      const imagePath = typeof image === "string" ? image : "";

      const [existingRows] = await pool.query(
        `SELECT * FROM cart WHERE user_id = ? AND product_id = ? AND variant_color = ? AND variant_size = ? LIMIT 1`,
        [user_id, product_id, variantColor, variantSize],
      );

      if (existingRows.length) {
        const updatedQty = existingRows[0].quantity + normalizedQuantity;
        await pool.query(
          `UPDATE cart SET quantity = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [updatedQty, Number(existingRows[0].price || 0) * updatedQty, existingRows[0].id],
        );

        const [rows] = await pool.query("SELECT * FROM cart WHERE id = ? LIMIT 1", [existingRows[0].id]);
        return response.status(200).json(rows[0]);
      }

      const [result] = await pool.query(
        `INSERT INTO cart (user_id, product_id, variant_color, variant_size, image, email, price, total_price, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          product_id,
          variantColor,
          variantSize,
          imagePath,
          email || null,
          parsedPrice,
          parsedTotal,
          normalizedQuantity,
        ],
      );

      const [rows] = await pool.query("SELECT * FROM cart WHERE id = ? LIMIT 1", [result.insertId]);
      response.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    try {
      const { quantity, price } = request.body || {};
      const updatedQuantity = normalizeQuantity(quantity);
      const unitPrice = Number(price || 0);

      const [existingRows] = await pool.query("SELECT * FROM cart WHERE id = ? LIMIT 1", [request.params.id]);
      if (!existingRows.length) {
        return response.status(404).json({ message: "Cart item not found." });
      }

      await pool.query(
        `UPDATE cart SET quantity = ?, total_price = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [updatedQuantity, unitPrice * updatedQuantity, unitPrice, request.params.id],
      );

      const [rows] = await pool.query("SELECT * FROM cart WHERE id = ? LIMIT 1", [request.params.id]);
      response.json(rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const [result] = await pool.query("DELETE FROM cart WHERE id = ?", [request.params.id]);
      if (!result.affectedRows) {
        return response.status(404).json({ message: "Cart item not found." });
      }
      response.json({ message: "Cart item removed." });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/clear/:userId", async (request, response, next) => {
    try {
      await pool.query("DELETE FROM cart WHERE user_id = ?", [request.params.userId]);
      response.json({ message: "Cart cleared." });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createCartRouter;
