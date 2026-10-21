const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const multer = require("multer");
const { createProductController } = require("../controllers/productController");
const { requireAdmin } = require("../modules/adminAuth");
const { createProductService } = require("../modules/productService");

const uploadDirectory = path.join(__dirname, "..", "uploads", "products");
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
    filename: (request, file, callback) => callback(null, `${crypto.randomUUID()}${imageTypes.get(file.mimetype)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (request, file, callback) => {
    if (!imageTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, WEBP, and GIF product images are supported."));
      return;
    }
    callback(null, true);
  },
});

function createProductRouter(pool) {
  const router = express.Router();
  const controller = createProductController(createProductService(pool));

  router.get("/", controller.list);
  router.get("/latest-code", controller.latestCode);
  router.get("/:id", controller.get);
  router.post("/upload", requireAdmin, (request, response, next) => {
    upload.array("images", 5)(request, response, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        return response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message });
      }
      if (error.message === "Only JPG, PNG, WEBP, and GIF product images are supported.") {
        return response.status(400).json({ message: error.message });
      }
      return next(error);
    });
  }, (request, response) => {
    if (!request.files?.length) {
      return response.status(400).json({ message: "Choose at least one product image to upload." });
    }
    return response.status(201).json({
      images: request.files.map((file) => `/uploads/products/${file.filename}`),
    });
  });
  router.post("/", requireAdmin, controller.create);
  router.put("/:id", requireAdmin, controller.update);
  router.delete("/:id", requireAdmin, controller.remove);

  return router;
}

module.exports = createProductRouter;
