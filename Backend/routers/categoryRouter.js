const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const multer = require("multer");
const { createCategoryService } = require("../modules/categoryService");
const { requireAdmin } = require("../modules/adminAuth");
const { createCategoryController } = require("../controllers/categoryController");

const uploadDirectory = path.join(__dirname, "..", "uploads", "categories");
const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (request, file, callback) => {
      callback(null, `${crypto.randomUUID()}${imageTypes.get(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (request, file, callback) => {
    if (!imageTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, WEBP, and GIF category images are supported."));
      return;
    }
    callback(null, true);
  },
});

function createCategoryRouter(pool) {
  const router = express.Router();
  const controller = createCategoryController(createCategoryService(pool));

  router.get("/", controller.list);
  router.get("/:catId", controller.get);
  router.post("/upload", requireAdmin, (request, response, next) => {
    upload.array("images", 20)(request, response, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        return response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message });
      }
      if (error.message === "Only JPG, PNG, WEBP, and GIF category images are supported.") {
        return response.status(400).json({ message: error.message });
      }
      return next(error);
    });
  }, (request, response) => {
    if (!request.files?.length) {
      return response.status(400).json({ message: "Choose at least one category image to upload." });
    }
    return response.status(201).json({
      images: request.files.map((file) => `/uploads/categories/${file.filename}`),
    });
  });
  router.post("/", requireAdmin, controller.create);
  router.put("/:catId", requireAdmin, controller.update);
  router.delete("/:catId", requireAdmin, controller.remove);

  return router;
}

module.exports = createCategoryRouter;
