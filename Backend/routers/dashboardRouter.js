const express = require("express");
const { createDashboardController } = require("../controllers/dashboardController");
const { requireAdmin } = require("../modules/adminAuth");
const { createDashboardService } = require("../modules/dashboardService");

function createDashboardRouter(pool) {
  const router = express.Router();
  const controller = createDashboardController(createDashboardService(pool));

  router.get("/", requireAdmin, (request, response, next) => {
    const month = request.query.month || new Date().toISOString().slice(0, 7);
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return response.status(400).json({ message: "Month must use YYYY-MM format." });
    }
    request.dashboardMonth = month;
    return next();
  }, controller.getSnapshot);

  return router;
}

module.exports = createDashboardRouter;
