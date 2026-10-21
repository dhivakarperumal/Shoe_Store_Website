const MAX_IMAGES = 5;
const MAX_IMAGE_LENGTH = 3_000_000;

function validateProduct(body) {
  const text = (field, maxLength, required = false) => {
    const value = body[field] === undefined || body[field] === null ? "" : body[field];
    if (typeof value !== "string" || value.trim().length > maxLength || (required && !value.trim())) {
      return { error: `${field} must be a string${required ? " and is required" : ""} with no more than ${maxLength} characters.` };
    }
    return { value: value.trim() };
  };

  const productCode = text("product_code", 64, true);
  const name = text("name", 191, true);
  const category = text("category", 120, true);
  const description = text("description", 10_000);
  const subcategory = text("subcategory", 120);
  const brand = text("brand", 120);
  const material = text("material", 120);
  for (const field of [productCode, name, category, description, subcategory, brand, material]) {
    if (field.error) return field;
  }

  const numeric = (field, min, max, fallback) => {
    const value = body[field] === undefined ? fallback : Number(body[field]);
    if (!Number.isFinite(value) || value < min || value > max) {
      return { error: `${field} must be between ${min} and ${max}.` };
    }
    return { value };
  };
  const mrp = numeric("mrp", 0.01, 1_000_000_000, 0);
  const offer = numeric("offer", 0, 100, 0);
  const rating = numeric("rating", 0, 5, 5);
  const requestedStock = numeric("total_stock", 0, 2_000_000_000, 0);
  for (const field of [mrp, offer, rating, requestedStock]) {
    if (field.error) return field;
  }

  const expectedPrice = Math.round(mrp.value * (1 - offer.value / 100) * 100) / 100;
  const submittedPrice = body.offer_price === undefined ? expectedPrice : Number(body.offer_price);
  if (!Number.isFinite(submittedPrice) || Math.abs(submittedPrice - expectedPrice) > 0.01) {
    return { error: "Selling price must match MRP after applying the offer." };
  }

  const allowedStatuses = ["Active", "Inactive", "Draft"];
  const status = body.status === undefined ? "Active" : body.status;
  if (!allowedStatuses.includes(status)) {
    return { error: "Status must be Active, Inactive, or Draft." };
  }

  if (!Array.isArray(body.variants) || body.variants.length > 50) {
    return { error: "Variants must be an array with no more than 50 entries." };
  }
  const variants = [];
  let variantStock = 0;
  for (const variant of body.variants) {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      return { error: "Each variant must be an object." };
    }
    const color = typeof variant.color === "string" ? variant.color : "";
    const colorName = typeof variant.colorName === "string" ? variant.colorName.trim() : "";
    const selectedSizes = Array.isArray(variant.selectedSizes) ? variant.selectedSizes : [];
    const sizesStock = variant.sizesStock;
    if (!/^#[0-9a-f]{6}$/i.test(color) || colorName.length > 80 || selectedSizes.length > 50) {
      return { error: "Variant color or size data is invalid." };
    }
    const normalizedStock = {};
    for (const size of selectedSizes) {
      if (typeof size !== "string" || !size.trim() || size.trim().length > 32) {
        return { error: "Each variant size must be a non-empty string of no more than 32 characters." };
      }
      const quantity = Number(sizesStock?.[size]);
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2_000_000_000) {
        return { error: `Stock for size ${size} must be a non-negative whole number.` };
      }
      normalizedStock[size] = quantity;
      variantStock += quantity;
    }
    if (!Array.isArray(variant.images) || variant.images.length > MAX_IMAGES ||
        variant.images.some((image) => typeof image !== "string" || image.length > MAX_IMAGE_LENGTH)) {
      return { error: `Each variant may contain up to ${MAX_IMAGES} valid images.` };
    }
    variants.push({ color, colorName, selectedSizes, sizesStock: normalizedStock, images: variant.images });
  }

  const hasSizeStock = variants.some((variant) => Object.keys(variant.sizesStock).length > 0);
  const totalStock = hasSizeStock ? variantStock : requestedStock.value;
  if (totalStock > 2_000_000_000) {
    return { error: "Combined variant stock exceeds the supported limit." };
  }

  return {
    value: {
      product_code: productCode.value,
      name: name.value,
      description: description.value,
      category: category.value,
      subcategory: subcategory.value,
      brand: brand.value,
      material: material.value,
      mrp: mrp.value,
      offer: offer.value,
      offer_price: expectedPrice,
      rating: rating.value,
      total_stock: totalStock,
      variants,
      status,
    },
  };
}

function createProductController(productService) {
  return {
    async list(request, response, next) {
      try {
        return response.json(await productService.list(request.query));
      } catch (error) {
        return next(error);
      }
    },

    async latestCode(request, response, next) {
      try {
        return response.json({ latestCode: await productService.latestCode() });
      } catch (error) {
        return next(error);
      }
    },

    async get(request, response, next) {
      try {
        const product = await productService.findById(request.params.id);
        if (!product) return response.status(404).json({ message: "Product not found." });
        return response.json(product);
      } catch (error) {
        return next(error);
      }
    },

    async create(request, response, next) {
      const validated = validateProduct(request.body || {});
      if (validated.error) return response.status(400).json({ message: validated.error });
      try {
        return response.status(201).json(await productService.create(validated.value));
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return response.status(409).json({ message: "A product with this code already exists." });
        }
        return next(error);
      }
    },

    async update(request, response, next) {
      try {
        const existing = await productService.findById(request.params.id);
        if (!existing) return response.status(404).json({ message: "Product not found." });
        const validated = validateProduct({ ...existing, ...(request.body || {}) });
        if (validated.error) return response.status(400).json({ message: validated.error });
        return response.json(await productService.update(request.params.id, validated.value));
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return response.status(409).json({ message: "A product with this code already exists." });
        }
        return next(error);
      }
    },

    async remove(request, response, next) {
      try {
        const removed = await productService.remove(request.params.id);
        if (!removed) return response.status(404).json({ message: "Product not found." });
        return response.json({ message: "Product deleted successfully." });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createProductController, validateProduct };
