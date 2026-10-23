require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("path");
const { createPool, initializeDatabase } = require("./modules/db");
const { createAuthService } = require("./modules/authService");
const { createAuthController } = require("./controllers/authController");
const createAuthRouter = require("./routers/authRouter");
const createBannerRouter = require("./routers/bannerRouter");
const createCategoryRouter = require("./routers/categoryRouter");
const createProductRouter = require("./routers/productRouter");
const createDashboardRouter = require("./routers/dashboardRouter");
const createOrderRouter = require("./routers/orderRouter");

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

const pool = createPool();
const app = express();
const authService = createAuthService(pool);
const authController = createAuthController(authService);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/api/health", async (request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});
app.use("/api/auth", createAuthRouter(authController));
app.use("/api/banners", createBannerRouter(pool));
app.use("/api/categories", createCategoryRouter(pool));
app.use("/api/products", createProductRouter(pool));
app.use("/api/dashboard", createDashboardRouter(pool));
app.use("/api/orders", createOrderRouter(pool));

app.use((error, request, response, next) => {
  if (error.type === "entity.too.large") {
    return response.status(413).json({ message: "Request body is too large." });
  }
  console.error("Backend request failed:", error);
  response.status(500).json({ message: "Internal server error." });
});

async function start() {
  try {
    await initializeDatabase(pool);

    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port} (database connected)`);
    });
  } catch (error) {
    console.error("Could not initialize the configured MySQL database:", error);
    await pool.end();
    process.exitCode = 1;
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
