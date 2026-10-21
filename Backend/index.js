require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { createPool, initializeDatabase } = require("./modules/db");
const { createAuthService } = require("./modules/authService");
const { createAuthController } = require("./controllers/authController");
const createAuthRouter = require("./routers/authRouter");

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

const pool = createPool();
const app = express();
const authService = createAuthService(pool);
const authController = createAuthController(authService);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
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

app.use((error, request, response, next) => {
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
