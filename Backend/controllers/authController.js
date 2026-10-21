function createAuthController(authService) {
  const normalizeManagedUser = (body, { partial = false } = {}) => {
    const fields = ["username", "email", "phone", "role", "status"];
    const value = {};
    for (const field of fields) {
      const input = body[field];
      if (partial && input === undefined) {
        continue;
      }
      if (typeof input !== "string") {
        return { error: `${field} must be a string.` };
      }
      value[field] = input.trim();
    }

    if (value.username !== undefined && (value.username.length < 2 || value.username.length > 120)) {
      return { error: "Name must be between 2 and 120 characters." };
    }
    if (value.email !== undefined &&
        (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > 191)) {
      return { error: "Enter a valid email address." };
    }
    if (value.phone !== undefined && (value.phone.length < 6 || value.phone.length > 32)) {
      return { error: "Enter a valid phone number." };
    }
    if (value.role !== undefined && !["customer", "user", "admin", "manager", "dealer"].includes(value.role.toLowerCase())) {
      return { error: "Role must be customer, user, admin, manager, or dealer." };
    }
    if (value.status !== undefined) {
      value.status = value.status.toLowerCase();
      if (!["active", "inactive"].includes(value.status)) {
        return { error: "Status must be active or inactive." };
      }
    }

    return { value };
  };

  return {
    async register(request, response, next) {
      const body = request.body || {};
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (username.length < 2 || username.length > 120) {
        return response.status(400).json({ message: "Name must be between 2 and 120 characters." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
        return response.status(400).json({ message: "Enter a valid email address." });
      }
      if (phone.length < 6 || phone.length > 32) {
        return response.status(400).json({ message: "Enter a valid phone number." });
      }
      if (password.length < 8 || password.length > 72) {
        return response.status(400).json({ message: "Password must be between 8 and 72 characters." });
      }

      try {
        const user = await authService.register({ username, email, phone, password });
        return response.status(201).json({ message: "Registration successful.", user });
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return response.status(409).json({ message: "An account with this email or phone already exists." });
        }
        return next(error);
      }
    },

    async login(request, response, next) {
      const body = request.body || {};
      const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!identifier || !password) {
        return response.status(400).json({ message: "Email/mobile number and password are required." });
      }

      try {
        const result = await authService.login(identifier, password);
        if (!result) {
          return response.status(401).json({ message: "Invalid email/mobile number or password." });
        }
        if (result.inactive) {
          return response.status(403).json({ message: "This account is inactive. Contact support for assistance." });
        }
        return response.json(result);
      } catch (error) {
        return next(error);
      }
    },

    async googleLogin(request, response, next) {
      const credential = typeof request.body?.credential === "string" ? request.body.credential : "";
      if (!credential) {
        return response.status(400).json({ message: "Google credential is required." });
      }

      try {
        return response.json(await authService.googleLogin(credential));
      } catch (error) {
        if (error.status === 401 && error.cause) {
          console.error("Google credential verification failed:", error.cause.message);
        }
        if (error.status) {
          return response.status(error.status).json({ message: error.message });
        }
        return next(error);
      }
    },

    async listUsers(request, response, next) {
      try {
        return response.json(await authService.listUsers());
      } catch (error) {
        return next(error);
      }
    },

    async createUser(request, response, next) {
      const body = request.body || {};
      const validated = normalizeManagedUser(body);
      if (validated.error) {
        return response.status(400).json({ message: validated.error });
      }
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 8 || password.length > 72) {
        return response.status(400).json({ message: "Password must be between 8 and 72 characters." });
      }

      try {
        const user = await authService.createUser({
          ...validated.value,
          role: validated.value.role.toLowerCase(),
          status: validated.value.status.toLowerCase(),
          password,
        });
        return response.status(201).json({ message: "User created successfully.", user });
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return response.status(409).json({ message: "An account with this email or phone already exists." });
        }
        return next(error);
      }
    },

    async updateUser(request, response, next) {
      const validated = normalizeManagedUser(request.body || {}, { partial: true });
      if (validated.error) {
        return response.status(400).json({ message: validated.error });
      }
      if (!Object.keys(validated.value).length) {
        return response.status(400).json({ message: "Provide at least one user field to update." });
      }
      const id = Number(request.params.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        return response.status(400).json({ message: "User ID must be a positive integer." });
      }
      if (request.user.id === id && validated.value.role && validated.value.role.toLowerCase() !== "admin") {
        return response.status(400).json({ message: "You cannot remove your own administrator role." });
      }
      if (request.user.id === id && validated.value.status === "inactive") {
        return response.status(400).json({ message: "You cannot deactivate your own account." });
      }

      try {
        const existing = await authService.getUserById(id);
        if (!existing) {
          return response.status(404).json({ message: "User not found." });
        }
        const update = { ...existing, ...validated.value };
        return response.json(await authService.updateUser(id, update));
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return response.status(409).json({ message: "An account with this email or phone already exists." });
        }
        return next(error);
      }
    },

    async deleteUser(request, response, next) {
      const id = Number(request.params.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        return response.status(400).json({ message: "User ID must be a positive integer." });
      }
      if (request.user.id === id) {
        return response.status(400).json({ message: "You cannot delete your own account." });
      }
      try {
        const deleted = await authService.deleteUser(id);
        if (!deleted) {
          return response.status(404).json({ message: "User not found." });
        }
        return response.json({ message: "User deleted successfully." });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createAuthController };
