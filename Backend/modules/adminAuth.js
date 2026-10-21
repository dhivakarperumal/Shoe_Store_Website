const jwt = require("jsonwebtoken");

function requireAdmin(request, response, next) {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return response.status(401).json({ message: "Authentication is required." });
  }

  try {
    const user = jwt.verify(match[1], process.env.JWT_SECRET);
    if (user.role !== "admin") {
      return response.status(403).json({ message: "Administrator access is required." });
    }
    request.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({ message: "Authentication token is invalid or expired." });
    }
    return next(error);
  }
}

module.exports = { requireAdmin };
