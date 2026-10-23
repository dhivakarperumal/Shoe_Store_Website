const ORDER_SELECT = `
  SELECT id, order_id, user_id, customer_name, customer_email, customer_phone,
         street_address, city, district, state, country, zip_code,
         payment_method, payment_status, payment_id, order_type, status,
         total_amount, items, tracking_number, courier_name, shipped_at,
         cancellation_reason, cancelled_at, created_at, updated_at
  FROM orders
`;

function parseItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items !== "string") return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toOrder(row) {
  return { ...row, total_amount: Number(row.total_amount), items: parseItems(row.items) };
}

function createOrderService(pool) {
  return {
    async list({ userId, status } = {}) {
      const conditions = [];
      const values = [];
      if (userId) {
        conditions.push("user_id = ?");
        values.push(userId);
      }
      if (status && status !== "All") {
        conditions.push("status = ?");
        values.push(status);
      }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const [rows] = await pool.execute(`${ORDER_SELECT} ${where} ORDER BY created_at DESC, id DESC`, values);
      return rows.map(toOrder);
    },

    async findById(id, userId) {
      const conditions = ["id = ?"];
      const values = [id];
      if (userId) {
        conditions.push("user_id = ?");
        values.push(userId);
      }
      const [rows] = await pool.execute(`${ORDER_SELECT} WHERE ${conditions.join(" AND ")} LIMIT 1`, values);
      return rows[0] ? toOrder(rows[0]) : null;
    },

    async create(order) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const items = [];
        let totalAmount = 0;

        for (const item of order.items) {
          const productId = Number(item.product_id || item.id);
          if (!Number.isSafeInteger(productId) || productId < 1) {
            const error = new Error("Each order item must reference a valid product.");
            error.status = 400;
            throw error;
          }
          const quantity = Number(item.quantity);
          if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
            const error = new Error("Each order item must have a quantity between 1 and 1,000.");
            error.status = 400;
            throw error;
          }

          const [products] = await connection.execute(
            "SELECT id, name, product_code, offer_price, total_stock, variants, status FROM products WHERE id = ? FOR UPDATE",
            [productId],
          );
          const product = products[0];
          if (!product || product.status !== "Active") {
            const error = new Error("An order contains a product that is unavailable.");
            error.status = 409;
            throw error;
          }

          const variants = parseItems(product.variants);
          const color = String(item.variant_color || item.colorName || "");
          const size = String(item.variant_size || item.size || "");
          let variant = null;
          if (variants.length) {
            const hasTrackedSizes = variants.some((entry) => Object.keys(entry.sizesStock || {}).length > 0);
            if (hasTrackedSizes && !size) {
              const error = new Error(`${product.name} requires a size selection.`);
              error.status = 400;
              throw error;
            }
            variant = variants.find((entry) =>
              (!color || entry.colorName === color || entry.color === color) &&
              (!size || Object.prototype.hasOwnProperty.call(entry.sizesStock || {}, size))
            );
            if (!variant) {
              const error = new Error(`${product.name} is not available in the selected color and size.`);
              error.status = 409;
              throw error;
            }
            if (size) {
              const available = Number(variant.sizesStock[size]) || 0;
              if (available < quantity) {
                const error = new Error(`${product.name} does not have enough stock in size ${size}.`);
                error.status = 409;
                throw error;
              }
              variant.sizesStock[size] = available - quantity;
            } else if ((Number(product.total_stock) || 0) < quantity) {
              const error = new Error(`${product.name} does not have enough stock.`);
              error.status = 409;
              throw error;
            }
          } else if ((Number(product.total_stock) || 0) < quantity) {
            const error = new Error(`${product.name} does not have enough stock.`);
            error.status = 409;
            throw error;
          }

          const price = Number(product.offer_price);
          const lineTotal = Number((price * quantity).toFixed(2));
          totalAmount += lineTotal;
          items.push({
            product_id: product.id,
            product_name: product.name,
            product_code: product.product_code,
            quantity,
            variant_color: color,
            variant_size: size,
            price,
            total: lineTotal,
            image: typeof item.image === "string" ? item.image.slice(0, 2000) : "",
          });

          if (variants.length) {
            const updatedStock = variants.some((entry) => Object.keys(entry.sizesStock || {}).length)
              ? variants.reduce((sum, entry) => sum + Object.values(entry.sizesStock || {}).reduce((variantSum, count) => variantSum + (Number(count) || 0), 0), 0)
              : Math.max(0, Number(product.total_stock) - quantity);
            await connection.execute(
              "UPDATE products SET variants = ?, total_stock = ? WHERE id = ?",
              [JSON.stringify(variants), updatedStock, product.id],
            );
          } else {
            await connection.execute(
              "UPDATE products SET total_stock = total_stock - ? WHERE id = ?",
              [quantity, product.id],
            );
          }
        }

        const [result] = await connection.execute(
          `INSERT INTO orders
            (user_id, customer_name, customer_email, customer_phone, street_address, city, district,
             state, country, zip_code, payment_method, payment_status, payment_id, order_type,
             status, total_amount, items)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.user_id || null,
            order.customer_name,
            order.customer_email || order.email || null,
            order.customer_phone,
            order.street_address || order.address || null,
            order.city || null,
            order.district || null,
            order.state || null,
            order.country || null,
            order.zip_code || null,
            order.payment_method || "Showroom",
            order.payment_status || "pending",
            order.payment_id || null,
            order.order_type || "Online",
            order.status || "Order Placed",
            totalAmount,
            JSON.stringify(items),
          ],
        );
        const orderId = `ORD${String(result.insertId).padStart(5, "0")}`;
        await connection.execute("UPDATE orders SET order_id = ? WHERE id = ?", [orderId, result.insertId]);
        const [rows] = await connection.execute(`${ORDER_SELECT} WHERE id = ? LIMIT 1`, [result.insertId]);
        await connection.commit();
        return toOrder(rows[0]);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async updateStatus(id, updates) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [orders] = await connection.execute(`${ORDER_SELECT} WHERE id = ? FOR UPDATE`, [id]);
        const existing = orders[0];
        if (!existing) {
          await connection.rollback();
          return null;
        }

        if (updates.status === "Cancelled" && existing.status !== "Cancelled") {
          for (const item of parseItems(existing.items)) {
            const [products] = await connection.execute(
              "SELECT id, total_stock, variants FROM products WHERE id = ? FOR UPDATE",
              [item.product_id],
            );
            const product = products[0];
            if (!product) continue;

            const quantity = Number(item.quantity) || 0;
            const variants = parseItems(product.variants);
            if (variants.some((variant) => Object.keys(variant.sizesStock || {}).length)) {
              const variant = variants.find((entry) =>
                (!item.variant_color || entry.colorName === item.variant_color || entry.color === item.variant_color) &&
                (!item.variant_size || Object.prototype.hasOwnProperty.call(entry.sizesStock || {}, item.variant_size))
              );
              if (variant && item.variant_size) {
                variant.sizesStock[item.variant_size] = (Number(variant.sizesStock[item.variant_size]) || 0) + quantity;
                const totalStock = variants.reduce(
                  (sum, entry) => sum + Object.values(entry.sizesStock || {}).reduce((variantSum, count) => variantSum + (Number(count) || 0), 0),
                  0,
                );
                await connection.execute(
                  "UPDATE products SET variants = ?, total_stock = ? WHERE id = ?",
                  [JSON.stringify(variants), totalStock, product.id],
                );
              }
            } else {
              await connection.execute(
                "UPDATE products SET total_stock = total_stock + ? WHERE id = ?",
                [quantity, product.id],
              );
            }
          }
        }

        const fields = ["status = ?"];
        const values = [updates.status];
        const allowedFields = {
          tracking_number: "tracking_number",
          courier_name: "courier_name",
          shipped_at: "shipped_at",
          cancellation_reason: "cancellation_reason",
          cancelled_at: "cancelled_at",
        };
        for (const [input, column] of Object.entries(allowedFields)) {
          if (updates[input] !== undefined) {
            fields.push(`${column} = ?`);
            values.push(updates[input] || null);
          }
        }
        values.push(id);
        await connection.execute(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`, values);
        const [updatedOrders] = await connection.execute(`${ORDER_SELECT} WHERE id = ? LIMIT 1`, [id]);
        await connection.commit();
        return toOrder(updatedOrders[0]);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

module.exports = { createOrderService };
