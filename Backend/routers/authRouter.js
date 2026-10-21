const express = require("express");

function createAuthRouter(authController) {
  const router = express.Router();

  router.post("/register", authController.register);
  router.post("/login", authController.login);
  router.post("/google-login", authController.googleLogin);

  return router;
}

module.exports = createAuthRouter;
