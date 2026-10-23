const jwt = require("jsonwebtoken");

function requireAuthenticated(request, response, next) {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return response.status(401).json({ message: "Authentication is required." });
  }

  try {
    request.user = jwt.verify(match[1], process.env.JWT_SECRET);
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({ message: "Authentication token is invalid or expired." });
    }
    return next(error);
  }
}

function requireAdmin(request, response, next) {
  return requireAuthenticated(request, response, (error) => {
    if (error) {
      return next(error);
    }
    if (request.user.role !== "admin") {
      return response.status(403).json({ message: "Administrator access is required." });
    }
    return next();
  });
}

module.exports = { requireAdmin, requireAuthenticated };
