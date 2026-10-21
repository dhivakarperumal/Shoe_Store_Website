const express = require("express");
const { createCategoryService } = require("../modules/categoryService");
const { requireAdmin } = require("../modules/adminAuth");
const { createCategoryController } = require("../controllers/categoryController");

function createCategoryRouter(pool) {
  const router = express.Router();
  const controller = createCategoryController(createCategoryService(pool));

  router.get("/", controller.list);
  router.get("/:catId", controller.get);
  router.post("/", requireAdmin, controller.create);
  router.put("/:catId", requireAdmin, controller.update);
  router.delete("/:catId", requireAdmin, controller.remove);

  return router;
}

module.exports = createCategoryRouter;
