function normalizeStringArray(value, label, { maxItems = 20, maxLength = 3_000_000 } = {}) {
  if (!Array.isArray(value) || value.length > maxItems) {
    return { error: `${label} must be an array with no more than ${maxItems} items.` };
  }

  const values = [];
  for (const item of value) {
    if (typeof item !== "string" || item.trim().length > maxLength) {
      return { error: `Each ${label.toLowerCase()} item must be a string no longer than ${maxLength} characters.` };
    }
    const normalized = item.trim();
    if (normalized) {
      values.push(normalized);
    }
  }

  return { value: values };
}

function validateCategory(body, defaults = {}) {
  const catId = typeof body.catId === "string" ? body.catId.trim() : defaults.catId;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!catId || catId.length > 64) {
    return { error: "A category ID of no more than 64 characters is required." };
  }
  if (!name || name.length > 120) {
    return { error: "A category name of no more than 120 characters is required." };
  }
  if (body.cat_id !== undefined && body.cat_id !== catId) {
    return { error: "The category ID cannot be changed." };
  }

  const description = body.description === undefined ? defaults.description || "" : body.description;
  if (typeof description !== "string" || description.length > 10_000) {
    return { error: "Description must be a string no longer than 10,000 characters." };
  }

  const subcategoryInput = body.subcategory === undefined ? defaults.subcategory || [] : body.subcategory;
  const imageInput = body.images === undefined ? defaults.images || [] : body.images;
  const subcategory = normalizeStringArray(subcategoryInput, "Subcategories", { maxLength: 255 });
  if (subcategory.error) {
    return subcategory;
  }
  const images = normalizeStringArray(imageInput, "Images");
  if (images.error) {
    return images;
  }

  const userId = body.user_id === undefined ? defaults.user_id ?? null : body.user_id;
  if (userId !== null && (typeof userId !== "string" || userId.length > 255)) {
    return { error: "User ID must be a string no longer than 255 characters." };
  }

  const requestedStatus = body.status === undefined ? defaults.status || "Active" : body.status;
  if (!["Active", "Inactive", "active", "inactive"].includes(requestedStatus)) {
    return { error: "Status must be 'Active' or 'Inactive'." };
  }

  return {
    value: {
      catId,
      name,
      description,
      subcategory: subcategory.value,
      images: images.value,
      user_id: userId,
      status: requestedStatus.toLowerCase() === "inactive" ? "Inactive" : "Active",
    },
  };
}

function createCategoryController(categoryService) {
  return {
    async list(request, response, next) {
      try {
        return response.json(await categoryService.list());
      } catch (error) {
        return next(error);
      }
    },

    async get(request, response, next) {
      try {
        const category = await categoryService.findByCatId(request.params.catId);
        if (!category) {
          return response.status(404).json({ message: "Category not found." });
        }
        return response.json(category);
      } catch (error) {
        return next(error);
      }
    },

    async create(request, response, next) {
      const validated = validateCategory(request.body || {});
      if (validated.error) {
        return response.status(400).json({ message: validated.error });
      }

      try {
        const category = await categoryService.create(validated.value);
        return response.status(201).json(category);
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return response.status(409).json({ message: "A category with this ID already exists." });
        }
        return next(error);
      }
    },

    async update(request, response, next) {
      const catId = request.params.catId.trim();
      const body = request.body || {};

      try {
        const existing = await categoryService.findByCatId(catId);
        if (!existing) {
          return response.status(404).json({ message: "Category not found." });
        }

        if (body.catId !== undefined && body.catId !== catId) {
          return response.status(400).json({ message: "The category ID cannot be changed." });
        }

        const validated = validateCategory({ ...body, catId }, existing);
        if (validated.error) {
          return response.status(400).json({ message: validated.error });
        }

        const category = await categoryService.update(catId, validated.value);
        return response.json(category);
      } catch (error) {
        return next(error);
      }
    },

    async remove(request, response, next) {
      try {
        const removed = await categoryService.remove(request.params.catId);
        if (!removed) {
          return response.status(404).json({ message: "Category not found." });
        }
        return response.json({ message: "Category deleted successfully." });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createCategoryController };
