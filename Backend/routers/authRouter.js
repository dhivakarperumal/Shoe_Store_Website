const express = require("express");
const { requireAdmin } = require("../modules/adminAuth");

function createAuthRouter(authController) {
  const router = express.Router();

  router.post("/register", authController.register);
  router.post("/login", authController.login);
  router.post("/google-login", authController.googleLogin);
  router.get("/users", requireAdmin, authController.listUsers);
  router.post("/users", requireAdmin, authController.createUser);
  router.put("/users/:id", requireAdmin, authController.updateUser);
  router.delete("/users/:id", requireAdmin, authController.deleteUser);

  return router;
}

module.exports = createAuthRouter;
