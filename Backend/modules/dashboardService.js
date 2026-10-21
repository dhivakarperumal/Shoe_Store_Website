function parseVariants(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return [];
  }
  try {
    const variants = JSON.parse(value);
    return Array.isArray(variants) ? variants : [];
  } catch {
    return [];
  }
}

function getFirstImage(value) {
  for (const variant of parseVariants(value)) {
    if (Array.isArray(variant.images) && typeof variant.images[0] === "string") {
      return variant.images[0];
    }
  }
  return null;
}

function createDashboardService(pool) {
  return {
    async getSnapshot() {
      const [statsResult, [topProducts], [lowStockProducts]] = await Promise.all([
        pool.execute(`
          SELECT
            (SELECT COUNT(*) FROM products) AS totalProducts,
            (SELECT COUNT(*) FROM products WHERE status = 'Active') AS activeProducts,
            (SELECT COUNT(*) FROM products WHERE total_stock > 0 AND total_stock < 10) AS lowStockProducts,
            (SELECT COUNT(*) FROM products WHERE total_stock = 0) AS outOfStockProducts,
            (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'user')) AS totalCustomers,
            (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'user') AND status = 'active') AS activeCustomers,
            (SELECT COUNT(*) FROM categories) AS totalCategories
        `),
        pool.execute(`
          SELECT id, name, category, rating, variants
          FROM products
          WHERE status = 'Active'
          ORDER BY rating DESC, created_at DESC, id DESC
          LIMIT 5
        `),
        pool.execute(`
          SELECT id, name, total_stock, variants
          FROM products
          WHERE total_stock < 10
          ORDER BY total_stock ASC, name ASC
          LIMIT 5
        `),
      ]);

      const stats = statsResult[0][0];
      return {
        stats: [
          { label: "Total Products", value: Number(stats.totalProducts) || 0, icon: "bag", description: "Products in your catalog" },
          { label: "Active Products", value: Number(stats.activeProducts) || 0, icon: "offer", description: "Currently available for sale" },
          { label: "Low Stock", value: Number(stats.lowStockProducts) || 0, icon: "lowstock", description: "Products with fewer than 10 units" },
          { label: "Out of Stock", value: Number(stats.outOfStockProducts) || 0, icon: "lowstock", description: "Products needing replenishment" },
          { label: "Customers", value: Number(stats.totalCustomers) || 0, icon: "users", description: "Registered customer accounts" },
          { label: "Active Customers", value: Number(stats.activeCustomers) || 0, icon: "users", description: "Active customer accounts" },
          { label: "Categories", value: Number(stats.totalCategories) || 0, icon: "offer", description: "Categories in your catalog" },
        ],
        topProducts: topProducts.map((product) => ({
          id: product.id,
          name: product.name,
          cat: product.category,
          rating: Number(product.rating) || 0,
          img: getFirstImage(product.variants),
        })),
        lowStockAlerts: lowStockProducts.map((product) => ({
          id: product.id,
          name: product.name,
          stock: Number(product.total_stock) || 0,
          img: getFirstImage(product.variants),
        })),
        revenueTrends: [],
        orderStatusCounts: {},
        recentOrders: [],
        orderAnalyticsAvailable: false,
      };
    },
  };
}

module.exports = { createDashboardService };
