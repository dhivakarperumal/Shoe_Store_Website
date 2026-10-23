const ORDER_STATUSES = new Set([
  "Order Placed",
  "Confirmed",
  "Packed",
  "Shipping",
  "Shipped",
  "Delivered",
  "Cancelled",
]);

function validateOrder(body) {
  const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  const customerPhone = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
  const customerEmail = typeof body.customer_email === "string"
    ? body.customer_email.trim()
    : typeof body.email === "string" ? body.email.trim() : "";
  if (customerName.length < 2 || customerName.length > 191) {
    return { error: "Customer name must be between 2 and 191 characters." };
  }
  if (customerPhone.length < 6 || customerPhone.length > 32) {
    return { error: "A valid customer phone number is required." };
  }
  if (customerEmail.length > 191 || (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
    return { error: "Enter a valid customer email address." };
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
    return { error: "An order must contain between 1 and 100 items." };
  }
  return { value: { ...body, customer_name: customerName, customer_phone: customerPhone, customer_email: customerEmail } };
}

function createOrderController(orderService) {
  return {
    async list(request, response, next) {
      try {
        const userId = request.user.role === "admin" ? null : request.user.user_id;
        return response.json(await orderService.list({ userId, status: request.query.status }));
      } catch (error) {
        return next(error);
      }
    },

    async get(request, response, next) {
      const id = Number(request.params.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        return response.status(400).json({ message: "Order ID must be a positive integer." });
      }
      try {
        const userId = request.user.role === "admin" ? null : request.user.user_id;
        const order = await orderService.findById(id, userId);
        return order
          ? response.json(order)
          : response.status(404).json({ message: "Order not found." });
      } catch (error) {
        return next(error);
      }
    },

    async create(request, response, next) {
      const validated = validateOrder(request.body || {});
      if (validated.error) {
        return response.status(400).json({ message: validated.error });
      }
      if (request.user.role !== "admin" &&
          validated.value.user_id && validated.value.user_id !== request.user.user_id) {
        return response.status(403).json({ message: "You can only place an order for your own account." });
      }

      try {
        const order = await orderService.create({
          ...validated.value,
          user_id: request.user.role === "admin"
            ? validated.value.user_id || null
            : request.user.user_id,
          status: request.user.role === "admin" && ORDER_STATUSES.has(validated.value.status)
            ? validated.value.status
            : "Order Placed",
          payment_status: request.user.role === "admin" ? validated.value.payment_status : "pending",
          payment_id: request.user.role === "admin" ? validated.value.payment_id : null,
        });
        return response.status(201).json(order);
      } catch (error) {
        if (error.status) {
          return response.status(error.status).json({ message: error.message });
        }
        return next(error);
      }
    },

    async updateStatus(request, response, next) {
      const id = Number(request.params.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        return response.status(400).json({ message: "Order ID must be a positive integer." });
      }
      const body = request.body || {};
      if (!ORDER_STATUSES.has(body.status)) {
        return response.status(400).json({ message: "Choose a valid order status." });
      }
      if (body.status === "Shipping" &&
          (typeof body.tracking_number !== "string" || !body.tracking_number.trim() ||
           typeof body.courier_name !== "string" || !body.courier_name.trim())) {
        return response.status(400).json({ message: "Tracking number and courier name are required for shipping." });
      }
      if (body.status === "Cancelled" &&
          (typeof body.cancellation_reason !== "string" || !body.cancellation_reason.trim())) {
        return response.status(400).json({ message: "A cancellation reason is required." });
      }

      try {
        const order = await orderService.updateStatus(id, body);
        return order
          ? response.json(order)
          : response.status(404).json({ message: "Order not found." });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createOrderController };
