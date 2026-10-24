import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../PrivateRouter/AdminContext";
import api from "../api";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import DashboardQuickActions from "./DashboardQuickActions";
import {
    FiAlertTriangle,
    FiBox,
    FiDollarSign,
    FiEye,
    FiShoppingBag,
    FiUsers,
    FiX,
} from "react-icons/fi";
import { Doughnut, Line } from "react-chartjs-2";
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from "chart.js";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LineElement, LinearScale, PointElement, Tooltip);

const getImageUrl = (image) => {
    if (!image || /^(https?:|data:|blob:)/i.test(image)) return image;
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const formatDate = (value) => {
    if (!value) return "Recently added";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Recently added"
        : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { dashboardData, setDashboardCached } = useAdmin();
    const [loading, setLoading] = useState(!dashboardData);
    const [loadError, setLoadError] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [quickView, setQuickView] = useState(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            const response = await api.get("/dashboard", { params: { month: selectedMonth } });
            setDashboardCached(response.data);
            setLoadError("");
        } catch (error) {
            console.error("Fetch Dashboard Error:", error);
            setLoadError(error.response?.data?.message || "Failed to load dashboard data.");
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, setDashboardCached]);

    const retryDashboardData = () => {
        setLoading(true);
        void fetchDashboardData();
    };

    useEffect(() => {
        void Promise.resolve().then(fetchDashboardData);
    }, [fetchDashboardData]);

    useEffect(() => {
        if (!quickView) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setQuickView(null);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [quickView]);

    if (loading && !dashboardData) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <p className="text-sm font-bold text-slate-500">Loading dashboard...</p>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
                <p role="alert" className="text-center text-sm font-semibold text-slate-500">
                    {loadError || "No dashboard data is available."}
                </p>
                <button onClick={retryDashboardData} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-secondary hover:bg-primary-dark">
                    Try again
                </button>
            </div>
        );
    }

    const {
        stats = [],
        recentOrders = [],
        topProducts = [],
        lowStockAlerts = [],
        categoryBreakdown = [],
        recentCustomers = [],
        revenueTrends = [],
        orderStatusCounts = {},
    } = dashboardData;

    const salesOrdersChart = {
        labels: revenueTrends.map((day) => day.label),
        datasets: [
            {
                type: "bar",
                label: "Sales",
                data: revenueTrends.map((day) => Number(day.revenue) || 0),
                backgroundColor: "#F97316",
                borderRadius: 2,
                barPercentage: 0.82,
                categoryPercentage: 0.9,
                yAxisID: "sales",
            },
            {
                type: "line",
                label: "Orders",
                data: revenueTrends.map((day) => Number(day.orders) || 0),
                borderColor: "#FDBA74",
                backgroundColor: "#FDBA74",
                pointBackgroundColor: "#FDBA74",
                pointRadius: 2,
                pointHoverRadius: 4,
                tension: 0.35,
                yAxisID: "orders",
            },
        ],
    };
    const salesOrdersOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "top", align: "end", labels: { usePointStyle: true, boxWidth: 7 } } },
        scales: {
            sales: {
                beginAtZero: true,
                position: "left",
                ticks: { maxTicksLimit: 5, callback: (value) => `₹${Number(value).toLocaleString("en-IN")}` },
                grid: { color: "#F1F5F9" },
            },
            orders: {
                beginAtZero: true,
                position: "right",
                ticks: { precision: 0, maxTicksLimit: 5 },
                grid: { drawOnChartArea: false },
            },
            x: { grid: { display: false }, ticks: { maxTicksLimit: 10, maxRotation: 0 } },
        },
    };

    const orderStatuses = ["Order Placed", "Confirmed", "Packed", "Shipping", "Shipped", "Delivered", "Cancelled"];
    const orderStatusColors = ["#F97316", "#FB923C", "#FDBA74", "#0B1B30", "#2563EB", "#16A34A", "#DC2626"];
    const orderStatusValues = orderStatuses.map((status) => Number(orderStatusCounts[status]) || 0);
    const orderStatusTotal = orderStatusValues.reduce((sum, value) => sum + value, 0);
    const orderStatusChart = {
        labels: orderStatuses,
        datasets: [{ data: orderStatusValues, backgroundColor: orderStatusColors, borderWidth: 0, hoverOffset: 4 }],
    };
    const orderStatusChartOptions = {
        cutout: "72%",
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
    };
    const QuickViewIcon = quickView?.cardStyle.icon || FiBox;
    const quickViewMonthLabel = selectedMonth
        ? new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        : "Selected month";

    const statIcons = {
        "Total Products": FiShoppingBag,
        "Active Products": FiBox,
        "Total Customers": FiUsers,
        "Low Stock Products": FiAlertTriangle,
    };

    return (
        <div className="min-h-screen space-y-5 bg-white pb-10">
            <Toaster position="top-right" />
            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-secondary">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
                </div>
                <p className="text-xs font-medium text-slate-500">Live store overview</p>
            </section>

            {loadError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{loadError}</span>
                    <button onClick={retryDashboardData} className="font-bold underline">Refresh</button>
                </div>
            )}

            <section aria-label="Store metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                    const cardStyle = {
                        "Total Sales": { icon: FiDollarSign, accent: "#00d0a0", surface: "#10372f" },
                        "Total Orders": { icon: FiShoppingBag, accent: "#ff9a24", surface: "#3a2818" },
                        "Total Customers": { icon: FiUsers, accent: "#45a1ff", surface: "#172e49" },
                        "Total Products": { icon: FiBox, accent: "#ff5c9c", surface: "#3b2033" },
                    }[stat.label] || {
                        icon: statIcons[stat.label] || FiBox,
                        accent: "#e8b64b",
                        surface: "#332a1b",
                    };
                    const Icon = cardStyle.icon;
                    const trend = Number(stat.trend) || 0;
                    return (
                        <article
                            key={stat.label}
                            className="relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-md border border-slate-700/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.24)]"
                            style={{ background: `linear-gradient(135deg, ${cardStyle.surface} 0%, #111827 100%)` }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-300">{stat.label}</p>
                                    <p className="mt-4 truncate text-4xl font-black leading-none tracking-tight text-white">
                                        {stat.label === "Total Sales" ? `₹${Number(stat.value || 0).toLocaleString("en-IN")}` : Number(stat.value || 0).toLocaleString("en-IN")}
                                    </p>
                                </div>
                                <div
                                    className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md text-white shadow-lg"
                                    style={{ backgroundColor: cardStyle.accent, boxShadow: `0 8px 18px ${cardStyle.accent}35` }}
                                >
                                    <Icon size={27} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-slate-600/70 pt-3">
                                <p className="flex min-w-0 items-center gap-2 text-xs text-slate-300">
                                    <span
                                        className={`shrink-0 rounded-full border px-2 py-0.5 font-bold ${trend < 0 ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                                    >
                                        {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
                                    </span>
                                    <span className="truncate">vs last month</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setQuickView({ stat, cardStyle })}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                >
                                    <FiEye size={14} style={{ color: cardStyle.accent }} />
                                    Quick view
                                </button>
                            </div>
                        </article>
                    );
                })}
            </section>

            <DashboardQuickActions />

            {quickView && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setQuickView(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="metric-quick-view-title"
                        className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
                    >
                        <div className="h-1.5 w-full" style={{ backgroundColor: quickView.cardStyle.accent }} />
                        <div className="p-6 sm:p-7">
                            <button
                                type="button"
                                onClick={() => setQuickView(null)}
                                aria-label="Close quick view"
                                className="absolute right-4 top-4 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                <FiX size={18} />
                            </button>
                            <div className="flex items-center gap-3 pr-8">
                                <span
                                    className="flex h-11 w-11 items-center justify-center rounded-md text-white shadow-md"
                                    style={{ backgroundColor: quickView.cardStyle.accent }}
                                >
                                    <QuickViewIcon size={22} />
                                </span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Metric quick view</p>
                                    <h2 id="metric-quick-view-title" className="mt-0.5 text-lg font-extrabold text-secondary">
                                        {quickView.stat.label}
                                    </h2>
                                </div>
                            </div>
                            <p className="mt-6 text-4xl font-black tracking-tight text-secondary">
                                {quickView.stat.label === "Total Sales"
                                    ? `₹${Number(quickView.stat.value || 0).toLocaleString("en-IN")}`
                                    : Number(quickView.stat.value || 0).toLocaleString("en-IN")}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                {{
                                    "Total Sales": "Lifetime sales recorded across store orders.",
                                    "Total Orders": "Total customer and showroom orders recorded.",
                                    "Total Customers": "Total customer accounts registered with your store.",
                                    "Total Products": "Products currently listed in your store catalog.",
                                }[quickView.stat.label] || "Current store metric overview."}
                            </p>
                            <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <span className="text-sm font-semibold text-slate-600">
                                    {quickViewMonthLabel} vs previous month
                                </span>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${Number(quickView.stat.trend) < 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                    {Number(quickView.stat.trend) < 0 ? "↓" : "↑"} {Math.abs(Number(quickView.stat.trend) || 0)}%
                                </span>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-7">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-extrabold text-secondary">Sales Overview</h2>
                            <p className="text-xs text-slate-500">Daily sales and order count</p>
                        </div>
                        <input
                            aria-label="Sales overview month"
                            type="month"
                            value={selectedMonth}
                            max={currentMonth()}
                            onChange={(event) => {
                                setSelectedMonth(event.target.value);
                                setLoading(true);
                            }}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-primary"
                        />
                    </div>
                    <div className="h-64">
                        <Line data={salesOrdersChart} options={salesOrdersOptions} />
                    </div>
                </article>

                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-5">
                    <div className="mb-3">
                        <h2 className="text-base font-extrabold text-secondary">Order Status</h2>
                        <p className="text-xs text-slate-500">Order count for the selected month</p>
                    </div>
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                        <div className="relative h-44 w-full max-w-48 shrink-0">
                            <Doughnut data={orderStatusChart} options={orderStatusChartOptions} />
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-secondary">{orderStatusTotal.toLocaleString("en-IN")}</span>
                                <span className="text-[10px] text-slate-500">Orders</span>
                            </div>
                        </div>
                        <div className="w-full space-y-2">
                            {orderStatuses.map((status, index) => (
                                <div key={status} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: orderStatusColors[index] }} />
                                        {status}
                                    </span>
                                    <strong className="text-secondary">{orderStatusValues[index].toLocaleString("en-IN")}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-7">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="text-base font-extrabold text-secondary">Recent Orders</h2>
                            <p className="text-xs text-slate-500">Latest customer and showroom orders</p>
                        </div>
                        <button onClick={() => navigate("/admin/orders/all")} className="text-xs font-bold text-primary-dark hover:underline">View All →</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-3 font-bold">Order</th>
                                    <th className="px-3 py-3 font-bold">Customer</th>
                                    <th className="px-3 py-3 font-bold">Items</th>
                                    <th className="px-3 py-3 font-bold">Amount</th>
                                    <th className="px-3 py-3 font-bold">Status</th>
                                    <th className="px-5 py-3 text-right font-bold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentOrders.length ? recentOrders.map((order) => (
                                    <tr key={order.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                                        <td className="px-5 py-3 font-bold text-primary-dark">{order.orderId || `ORD${String(order.id).padStart(5, "0")}`}</td>
                                        <td className="max-w-36 truncate px-3 py-3 font-semibold text-slate-700">{order.customer}</td>
                                        <td className="px-3 py-3 text-slate-600">{Number(order.itemCount) || 0}</td>
                                        <td className="whitespace-nowrap px-3 py-3 font-bold text-secondary">₹{Number(order.amount || 0).toLocaleString("en-IN")}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${order.status === "Delivered" ? "bg-emerald-50 text-emerald-700" : order.status === "Cancelled" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-700"}`}>{order.status}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">{formatDate(order.createdAt)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No orders have been placed yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-5">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="text-base font-extrabold text-secondary">Low Stock Products</h2>
                            <p className="text-xs text-slate-500">Items that may need replenishing</p>
                        </div>
                        <button onClick={() => navigate("/admin/products/stock")} className="text-xs font-bold text-primary-dark hover:underline">View All →</button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {lowStockAlerts.length ? lowStockAlerts.map((product) => (
                            <div key={product.id} className="flex items-center gap-3 px-5 py-3">
                                {product.img ? (
                                    <img src={getImageUrl(product.img)} alt="" className="h-10 w-10 rounded-lg border border-slate-100 object-cover" />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600"><FiAlertTriangle /></div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-800">{product.name}</p>
                                    <p className="text-[10px] text-slate-500">SKU {product.sku || "—"}</p>
                                </div>
                                <span className="min-w-14 text-center text-xs font-black text-red-600">{Number(product.stock || 0)} left</span>
                                <button onClick={() => navigate("/admin/products/stock")} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-secondary hover:border-primary hover:bg-primary/10">Update</button>
                            </div>
                        )) : (
                            <p className="px-5 py-10 text-center text-sm text-slate-500">No low-stock products right now.</p>
                        )}
                    </div>
                </article>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-secondary">Top Rated Products</h2>
                        <button onClick={() => navigate("/admin/products/all")} className="text-xs font-bold text-primary-dark hover:underline">View All →</button>
                    </div>
                    <div className="space-y-3">
                        {topProducts.length ? topProducts.map((product, index) => (
                            <div key={product.id} className="flex items-center gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-black text-primary-dark">{index + 1}</span>
                                {product.img ? (
                                    <img src={getImageUrl(product.img)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                                ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-secondary"><FiShoppingBag /></div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-800">{product.name}</p>
                                    <p className="text-[10px] text-slate-500">{product.cat}</p>
                                </div>
                                <span className="text-xs font-black text-primary-dark">{Number(product.rating || 0).toFixed(1)} ★</span>
                            </div>
                        )) : <p className="py-6 text-center text-xs text-slate-500">No products to show.</p>}
                    </div>
                </article>

                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-secondary">Top Categories</h2>
                        <button onClick={() => navigate("/admin/products/category")} className="text-xs font-bold text-primary-dark hover:underline">View All →</button>
                    </div>
                    <div className="space-y-4">
                        {categoryBreakdown.length ? categoryBreakdown.slice(0, 5).map((category) => {
                            const maxProducts = Math.max(...categoryBreakdown.map((item) => item.products), 1);
                            const width = Math.max((category.products / maxProducts) * 100, category.products ? 4 : 0);
                            return (
                                <div key={category.category}>
                                    <div className="mb-1 flex justify-between gap-3 text-xs">
                                        <span className="truncate font-semibold text-slate-700">{category.category}</span>
                                        <span className="shrink-0 font-bold text-slate-500">{category.products} products</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            );
                        }) : <p className="py-6 text-center text-xs text-slate-500">Category data will appear when products are added.</p>}
                    </div>
                </article>

                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-secondary">Recent Customers</h2>
                        <button onClick={() => navigate("/admin/users/all")} className="text-xs font-bold text-primary-dark hover:underline">View All →</button>
                    </div>
                    <div className="space-y-3">
                        {recentCustomers.length ? recentCustomers.map((customer) => (
                            <div key={customer.id} className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-black text-primary-light">
                                    {(customer.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-800">{customer.name}</p>
                                    <p className="truncate text-[10px] text-slate-500">{customer.email}</p>
                                </div>
                                <span className="shrink-0 text-[10px] text-slate-400">{formatDate(customer.createdAt)}</span>
                            </div>
                        )) : <p className="py-6 text-center text-xs text-slate-500">No customers have registered yet.</p>}
                    </div>
                </article>
            </section>
        </div>
    );
};

export default Dashboard;
