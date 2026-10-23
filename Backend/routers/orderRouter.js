const express = require("express");
const { createOrderController } = require("../controllers/orderController");
const { requireAdmin, requireAuthenticated } = require("../modules/adminAuth");
const { createOrderService } = require("../modules/orderService");

function createOrderRouter(pool) {
  const router = express.Router();
  const controller = createOrderController(createOrderService(pool));

  router.get("/", requireAuthenticated, controller.list);
  router.get("/:id", requireAuthenticated, controller.get);
  router.post("/", requireAuthenticated, controller.create);
  router.put("/:id/status", requireAdmin, controller.updateStatus);

  return router;
}

module.exports = createOrderRouter;
