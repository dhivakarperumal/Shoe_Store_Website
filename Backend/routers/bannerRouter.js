const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "..", "uploads", "banners");
const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      callback(null, `${require("crypto").randomUUID()}${allowedImageTypes.get(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, WEBP, and GIF images are supported."));
      return;
    }
    callback(null, true);
  },
});

const parseBannerUploads = (req, res, next) => {
  upload.fields([{ name: "image", maxCount: 1 }, { name: "mobile_image", maxCount: 1 }])(
    req,
    res,
    (error) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof multer.MulterError) {
        res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message });
        return;
      }
      if (error.message === "Only JPG, PNG, WEBP, and GIF images are supported.") {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    },
  );
};

const uploadedImagePath = (file) => file ? `/uploads/banners/${file.filename}` : null;

function createBannerRouter(pool) {
  const router = express.Router();

  // GET all banners
  router.get("/", async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT * FROM banners ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // GET banners by type (hero, offer, saree, silks, etc.)
  router.get("/type/:type", async (req, res, next) => {
    try {
      const { type } = req.params;
      const [rows] = await pool.query(
        "SELECT * FROM banners WHERE type = ? AND status = 'active' ORDER BY sort_order ASC, created_at DESC",
        [type]
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // GET single banner by id
  router.get("/:id", async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ message: "Banner not found" });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  // POST create banner
  router.post("/", parseBannerUploads, async (req, res, next) => {
    try {
      const { title, subtitle, description, image, mobile_image, link, type, status, sort_order } = req.body;
      if (!title || !type) {
        return res.status(400).json({ message: "Title and type are required." });
      }
      const [result] = await pool.query(
        `INSERT INTO banners (title, subtitle, description, image, mobile_image, link, type, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          subtitle || null,
          description || null,
          uploadedImagePath(req.files?.image?.[0]) || image || null,
          uploadedImagePath(req.files?.mobile_image?.[0]) || mobile_image || null,
          link || null,
          type,
          status || "active",
          sort_order ?? 0,
        ]
      );
      const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  // PUT update banner
  router.put("/:id", parseBannerUploads, async (req, res, next) => {
    try {
      const { title, subtitle, description, image, mobile_image, link, type, status, sort_order } = req.body;
      const { id } = req.params;
      const [existing] = await pool.query("SELECT id FROM banners WHERE id = ?", [id]);
      if (!existing.length) return res.status(404).json({ message: "Banner not found" });

      await pool.query(
        `UPDATE banners SET
          title = COALESCE(?, title),
          subtitle = ?,
          description = ?,
          image = COALESCE(?, image),
          mobile_image = ?,
          link = ?,
          type = COALESCE(?, type),
          status = COALESCE(?, status),
          sort_order = COALESCE(?, sort_order)
         WHERE id = ?`,
        [
          title,
          subtitle,
          description,
          uploadedImagePath(req.files?.image?.[0]) || image,
          uploadedImagePath(req.files?.mobile_image?.[0]) || mobile_image,
          link,
          type,
          status,
          sort_order,
          id,
        ]
      );
      const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [id]);
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  // PATCH toggle status
  router.patch("/:id/status", async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'active' or 'inactive'" });
      }
      await pool.query("UPDATE banners SET status = ? WHERE id = ?", [status, req.params.id]);
      res.json({ message: "Status updated", status });
    } catch (err) {
      next(err);
    }
  });

  // DELETE banner
  router.delete("/:id", async (req, res, next) => {
    try {
      const [existing] = await pool.query("SELECT id FROM banners WHERE id = ?", [req.params.id]);
      if (!existing.length) return res.status(404).json({ message: "Banner not found" });
      await pool.query("DELETE FROM banners WHERE id = ?", [req.params.id]);
      res.json({ message: "Banner deleted successfully" });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createBannerRouter;
