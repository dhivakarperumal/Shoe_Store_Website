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
    async getSnapshot(month) {
      const [year, monthNumber] = month.split("-").map(Number);
      const monthStart = `${month}-01`;
      const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
      const nextMonthStart = nextMonthDate.toISOString().slice(0, 10);
      const previousMonth = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
      const previousMonthStart = `${previousMonth}-01`;
      const [previousYear, previousMonthNumber] = previousMonth.split("-").map(Number);
      const previousMonthEnd = new Date(Date.UTC(previousYear, previousMonthNumber, 1)).toISOString().slice(0, 10);
      const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

      const [
        statsResult,
        [topProducts],
        [lowStockProducts],
        [categoryRows],
        [recentCustomers],
        [lifetimeSalesRows],
        [monthSalesRows],
        [dailySalesRows],
        [statusRows],
        [recentOrders],
      ] = await Promise.all([
        pool.execute(`
          SELECT
            (SELECT COUNT(*) FROM products) AS totalProducts,
            (SELECT COUNT(*) FROM products WHERE status = 'Active') AS activeProducts,
            (SELECT COUNT(*) FROM products WHERE total_stock > 0 AND total_stock < 10) AS lowStockProducts,
            (SELECT COUNT(*) FROM products WHERE total_stock = 0) AS outOfStockProducts,
            (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'user')) AS totalCustomers,
            (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'user') AND status = 'active') AS activeCustomers,
            (SELECT COUNT(*) FROM orders) AS totalOrders
        `),
        pool.execute(`
          SELECT id, name, category, rating, variants
          FROM products
          WHERE status = 'Active'
          ORDER BY rating DESC, created_at DESC, id DESC
          LIMIT 5
        `),
        pool.execute(`
          SELECT id, name, product_code, total_stock, variants
          FROM products
          WHERE total_stock < 10
          ORDER BY total_stock ASC, name ASC
          LIMIT 5
        `),
        pool.execute(`
          SELECT category, COUNT(*) AS productCount, SUM(total_stock) AS stock
          FROM products
          GROUP BY category
          ORDER BY productCount DESC, category ASC
          LIMIT 6
        `),
        pool.execute(`
          SELECT id, username, email, created_at
          FROM users
          WHERE role IN ('customer', 'user')
          ORDER BY created_at DESC, id DESC
          LIMIT 5
        `),
        pool.execute(`
          SELECT COALESCE(SUM(total_amount), 0) AS totalSales
          FROM orders
          WHERE status != 'Cancelled'
        `),
        pool.execute(`
          SELECT
            COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? AND status != 'Cancelled' THEN total_amount ELSE 0 END), 0) AS sales,
            SUM(created_at >= ? AND created_at < ?) AS orders,
            COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? AND status != 'Cancelled' THEN total_amount ELSE 0 END), 0) AS previousSales,
            SUM(created_at >= ? AND created_at < ?) AS previousOrders,
            (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'user') AND created_at >= ? AND created_at < ?) AS customers,
            (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'user') AND created_at >= ? AND created_at < ?) AS previousCustomers,
            (SELECT COUNT(*) FROM products WHERE created_at >= ? AND created_at < ?) AS products,
            (SELECT COUNT(*) FROM products WHERE created_at >= ? AND created_at < ?) AS previousProducts
          FROM orders
        `, [
          monthStart, nextMonthStart, monthStart, nextMonthStart,
          previousMonthStart, previousMonthEnd, previousMonthStart, previousMonthEnd,
          monthStart, nextMonthStart, previousMonthStart, previousMonthEnd,
          monthStart, nextMonthStart, previousMonthStart, previousMonthEnd,
        ]),
        pool.execute(`
          SELECT DAY(created_at) AS day,
                 COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total_amount ELSE 0 END), 0) AS sales,
                 COUNT(*) AS orders
          FROM orders
          WHERE created_at >= ? AND created_at < ?
          GROUP BY DAY(created_at)
          ORDER BY day
        `, [monthStart, nextMonthStart]),
        pool.execute(`
          SELECT status, COUNT(*) AS count
          FROM orders
          WHERE created_at >= ? AND created_at < ?
          GROUP BY status
        `, [monthStart, nextMonthStart]),
        pool.execute(`
          SELECT id, order_id, customer_name, total_amount, status, created_at, items
          FROM orders
          ORDER BY created_at DESC, id DESC
          LIMIT 5
        `),
      ]);

      const stats = statsResult[0][0];
      const totalProducts = Number(stats.totalProducts) || 0;
      const lowStockCount = Number(stats.lowStockProducts) || 0;
      const outOfStockCount = Number(stats.outOfStockProducts) || 0;
      const lifetimeSales = Number(lifetimeSalesRows[0]?.totalSales) || 0;
      const monthSales = monthSalesRows[0] || {};
      const trend = (current, previous) => {
        const currentValue = Number(current) || 0;
        const previousValue = Number(previous) || 0;
        if (!previousValue) return currentValue ? 100 : 0;
        return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
      };
      const salesByDay = new Map(dailySalesRows.map((row) => [Number(row.day), row]));
      const orderStatusCounts = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.count) || 0]));
      return {
        stats: [
          { label: "Total Sales", value: lifetimeSales, icon: "sales", trend: trend(monthSales.sales, monthSales.previousSales) },
          { label: "Total Orders", value: Number(stats.totalOrders) || 0, icon: "orders", trend: trend(monthSales.orders, monthSales.previousOrders) },
          { label: "Total Customers", value: Number(stats.totalCustomers) || 0, icon: "customers", trend: trend(monthSales.customers, monthSales.previousCustomers) },
          { label: "Total Products", value: totalProducts, icon: "products", trend: trend(monthSales.products, monthSales.previousProducts) },
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
          sku: product.product_code,
          stock: Number(product.total_stock) || 0,
          img: getFirstImage(product.variants),
        })),
        categoryBreakdown: categoryRows.map((row) => ({
          category: row.category,
          products: Number(row.productCount) || 0,
          stock: Number(row.stock) || 0,
        })),
        inventoryStatus: {
          inStock: Math.max(0, totalProducts - lowStockCount - outOfStockCount),
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
        },
        recentCustomers: recentCustomers.map((customer) => ({
          id: customer.id,
          name: customer.username,
          email: customer.email,
          createdAt: customer.created_at,
        })),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderId: order.order_id,
          customer: order.customer_name,
          amount: Number(order.total_amount) || 0,
          status: order.status,
          createdAt: order.created_at,
          itemCount: parseVariants(order.items).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        })),
        revenueTrends: Array.from({ length: monthEnd }, (_, index) => {
          const row = salesByDay.get(index + 1);
          return {
            day: index + 1,
            label: new Date(Date.UTC(year, monthNumber - 1, index + 1)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }),
            revenue: Number(row?.sales) || 0,
            orders: Number(row?.orders) || 0,
          };
        }),
        orderStatusCounts,
        orderAnalyticsAvailable: true,
        month,
      };
    },
  };
}

module.exports = { createDashboardService };
