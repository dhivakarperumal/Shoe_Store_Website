const express = require("express");
const { createDashboardController } = require("../controllers/dashboardController");
const { requireAdmin } = require("../modules/adminAuth");
const { createDashboardService } = require("../modules/dashboardService");

function createDashboardRouter(pool) {
  const router = express.Router();
  const controller = createDashboardController(createDashboardService(pool));

  router.get("/", requireAdmin, controller.getSnapshot);

  return router;
}

module.exports = createDashboardRouter;
