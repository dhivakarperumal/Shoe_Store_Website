const express = require("express");
const { requireAuthenticated } = require("../modules/adminAuth");

const ADDRESS_FIELDS = [
  "customer_name",
  "customer_email",
  "customer_phone",
  "street_address",
  "city",
  "district",
  "state",
  "country",
  "zip_code",
];

function normalizeAddress(body) {
  const value = {};
  for (const field of ADDRESS_FIELDS) {
    const input = body[field];
    if (input !== undefined && input !== null && typeof input !== "string") {
      return { error: `${field} must be a string.` };
    }
    value[field] = typeof input === "string" ? input.trim() : "";
  }

  if (value.customer_name.length < 2 || value.customer_name.length > 191) {
    return { error: "Customer name must be between 2 and 191 characters." };
  }
  if (value.customer_email.length > 191 ||
      (value.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.customer_email))) {
    return { error: "Enter a valid customer email address." };
  }
  if (value.customer_phone.length < 6 || value.customer_phone.length > 32) {
    return { error: "A valid customer phone number is required." };
  }
  if (!value.street_address || value.street_address.length > 500) {
    return { error: "Street address is required and must be no more than 500 characters." };
  }
  for (const field of ["city", "district", "state", "country"]) {
    if (value[field].length > 120) {
      return { error: `${field} must be no more than 120 characters.` };
    }
  }
  if (value.zip_code.length > 20) {
    return { error: "ZIP code must be no more than 20 characters." };
  }

  return { value };
}

function createAddressRouter(pool) {
  const router = express.Router();
  router.use(requireAuthenticated);

  router.get("/", async (request, response, next) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY created_at DESC, id DESC",
        [request.user.user_id],
      );
      return response.json(rows);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
        [request.params.id, request.user.user_id],
      );
      if (!rows.length) return response.status(404).json({ message: "Address not found." });
      return response.json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    const validated = normalizeAddress(request.body || {});
    if (validated.error) return response.status(400).json({ message: validated.error });

    try {
      const values = ADDRESS_FIELDS.map((field) => validated.value[field] || null);
      const [existing] = await pool.execute(
        `SELECT * FROM addresses
         WHERE user_id = ?
           AND customer_name <=> ?
           AND customer_email <=> ?
           AND customer_phone <=> ?
           AND street_address <=> ?
           AND city <=> ?
           AND district <=> ?
           AND state <=> ?
           AND country <=> ?
           AND zip_code <=> ?
         LIMIT 1`,
        [request.user.user_id, ...values],
      );
      if (existing.length) return response.status(200).json(existing[0]);

      const [result] = await pool.execute(
        `INSERT INTO addresses
          (user_id, customer_name, customer_email, customer_phone, street_address, city, district, state, country, zip_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [request.user.user_id, ...values],
      );
      const [rows] = await pool.execute("SELECT * FROM addresses WHERE id = ? LIMIT 1", [result.insertId]);
      return response.status(201).json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    const validated = normalizeAddress(request.body || {});
    if (validated.error) return response.status(400).json({ message: validated.error });

    try {
      const values = ADDRESS_FIELDS.map((field) => validated.value[field] || null);
      const [result] = await pool.execute(
        `UPDATE addresses
         SET customer_name = ?, customer_email = ?, customer_phone = ?, street_address = ?,
             city = ?, district = ?, state = ?, country = ?, zip_code = ?
         WHERE id = ? AND user_id = ?`,
        [...values, request.params.id, request.user.user_id],
      );
      if (!result.affectedRows) {
        const [existing] = await pool.execute(
          "SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
          [request.params.id, request.user.user_id],
        );
        if (!existing.length) return response.status(404).json({ message: "Address not found." });
      }
      const [rows] = await pool.execute(
        "SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
        [request.params.id, request.user.user_id],
      );
      return response.json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const [result] = await pool.execute(
        "DELETE FROM addresses WHERE id = ? AND user_id = ?",
        [request.params.id, request.user.user_id],
      );
      if (!result.affectedRows) return response.status(404).json({ message: "Address not found." });
      return response.json({ message: "Address deleted successfully." });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createAddressRouter;
