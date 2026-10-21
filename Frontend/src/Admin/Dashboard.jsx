import React, { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../PrivateRouter/AdminContext";
import api from "../api";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
    FiShoppingBag,
    FiUsers,
    FiBox,
    FiAlertTriangle,
    FiTag,
    FiTrendingUp
} from "react-icons/fi";
import { FaTruck } from "react-icons/fa";
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
    BarElement,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const getDashboardImageUrl = (image) => {
    if (!image || /^(https?:|data:|blob:)/i.test(image)) return image;
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
    const navigate = useNavigate();
    const { dashboardData, setDashboardCached } = useAdmin();
    const [loading, setLoading] = useState(!dashboardData);
    const [loadError, setLoadError] = useState("");

    const fetchDashboardData = useCallback(async () => {
        try {
            const response = await api.get('/dashboard');
            setDashboardCached(response.data);
            setLoadError("");
        } catch (error) {
            console.error("Fetch Dashboard Error:", error);
            setLoadError(error.response?.data?.message || "Failed to load dashboard data.");
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [setDashboardCached]);

    const retryDashboardData = () => {
        setLoading(true);
        void fetchDashboardData();
    };

    useEffect(() => {
        void Promise.resolve().then(fetchDashboardData);
    }, [fetchDashboardData]);

    const getStatIcon = (iconStr) => {
        switch (iconStr) {
            case "bag": return <FiShoppingBag className="text-white" size={22} />;
            case "users": return <FiUsers className="text-white" size={22} />;
            case "lowstock": return <FiBox className="text-white" size={22} />;
            case "offer": return <FiTag className="text-white" size={22} />;
            default: return <FiBox className="text-white" size={22} />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 h-[60vh]">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-gray-300 font-bold text-sm">Loading Dashboard...</p>
            </div>
        )
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
        )
    }

    const {
        stats = [],
        topProducts = [],
        lowStockAlerts = [],
        revenueTrends = [],
        orderStatusCounts = {},
        orderAnalyticsAvailable = false,
    } = dashboardData;

    const barChartData = {
        labels: revenueTrends.map(t => t.month),
        datasets: [{
            label: 'Revenue',
            data: revenueTrends.map(t => Number(t.revenue) || 0),
            backgroundColor: '#D99A32',
            borderColor: '#A85B20',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.7,
            barPercentage: 0.8,
        }]
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#333',
                bodyColor: '#333',
                borderColor: '#eee',
                borderWidth: 1,
                callbacks: {
                    label: (context) => `Revenue: ₹${context.parsed.y.toLocaleString('en-IN')}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => `₹${(value / 1000).toFixed(0)}k`,
                    color: '#9ca3af',
                    font: { size: 10 }
                },
                grid: { color: '#f3f4f6', drawBorder: false }
            },
            x: {
                ticks: { color: '#9ca3af', font: { size: 10 } },
                grid: { display: false, drawBorder: false }
            }
        }
    };

    const statusLabels = ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
    const statusColors  = ['#fbbf24', '#3b82f6', '#a855f7', '#f97316', '#10b981', '#ef4444'];
    const statusBgCols  = ['bg-yellow-400', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-emerald-500', 'bg-red-500'];

    const statusCounts = statusLabels.map(s => Number(orderStatusCounts[s]) || 0);
    const totalOrders = statusCounts.reduce((a, b) => a + b, 0);

    const doughnutData = {
        labels: statusLabels,
        datasets: [{
            data: statusCounts,
            backgroundColor: statusColors,
            borderWidth: 0,
            cutout: '70%',
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
    };

    const orderStats = statusLabels.map((label, i) => ({
        label,
        count: statusCounts[i],
        pct: totalOrders > 0 ? `${((statusCounts[i] / totalOrders) * 100).toFixed(1)}%` : '0%',
        color: statusBgCols[i]
    }));

    return (
        <div className="space-y-6 pb-12 bg-slate-50 min-h-screen">
            <Toaster position="top-right" />
            {loadError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{loadError}</span>
                    <button onClick={retryDashboardData} className="font-bold underline">Try again</button>
                </div>
            )}

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, i) => {
                    return (
                        <div key={stat.label || i} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-primary-dark p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            {/* Decorative circle background */}
                            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
                            <div className="absolute -bottom-8 -right-2 w-24 h-24 bg-white/5 rounded-full" />

                            {/* Top row: icon + trend */}
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm">
                                    {getStatIcon(stat.icon)}
                                </div>
                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">Overview</span>
                            </div>

                            {/* Value */}
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black text-white leading-none">{Number(stat.value || 0).toLocaleString("en-IN")}</h3>
                                <p className="text-white/70 text-xs font-semibold mt-1">{stat.label}</p>
                            </div>

                            {/* Bottom divider */}
                            <div className="mt-3 pt-3 border-t border-white/20 relative z-10">
                                <p className="text-white/60 text-[10px] font-medium">{stat.description || "Current total"}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Quick Actions</h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Shortcuts</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        { label: "Add Product",    icon: <FiBox size={20} />,          color: "from-[#0B1B30] to-[#D99A32]", path: "/admin/products/add" },
                        { label: "New Order",      icon: <FiShoppingBag size={20} />,  color: "from-[#0B1B30] to-[#D99A32]", path: "/admin/orders/create" },
                        { label: "All Orders",     icon: <FaTruck size={20} />,         color: "from-[#0B1B30] to-[#D99A32]", path: "/admin/orders/all" },
                        { label: "Customers",      icon: <FiUsers size={20} />,        color: "from-[#0B1B30] to-[#D99A32]", path: "/admin/users/all" },
                        { label: "Stock Details",  icon: <FiAlertTriangle size={20} />,color: "from-[#0B1B30] to-[#D99A32]", path: "/admin/products/stock" },
                        { label: "Reports",        icon: <FiTrendingUp size={20} />,   color: "from-[#0B1B30] to-[#D99A32]", path: "/admin/reports" },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-lg transition-all duration-200 group hover:-translate-y-0.5"
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-200`}>
                                {action.icon}
                            </div>
                            <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 text-center leading-tight">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Middle Section: Charts & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Sales Overview Bar Chart */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Revenue Overview</h3>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        {orderAnalyticsAvailable && revenueTrends.length > 0 ? (
                            <Bar data={barChartData} options={barChartOptions} />
                        ) : (
                            <div className="flex h-full min-h-[250px] items-center justify-center px-6 text-center text-sm font-medium text-slate-500">
                                Revenue reporting will appear when order data is configured.
                            </div>
                        )}
                    </div>
                </div>

                {/* Orders Overview */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Orders Overview</h3>
                    {orderAnalyticsAvailable ? (
                        <div className="flex flex-col flex-1">
                            <div className="relative h-40 flex items-center justify-center mb-6">
                                <Doughnut data={doughnutData} options={doughnutOptions} />
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-xl font-bold text-slate-800">{totalOrders.toLocaleString('en-IN')}</span>
                                    <span className="text-xs text-gray-500">Total Orders</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {orderStats.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <div className={`w-2 h-2 rounded ${item.color}`}></div>
                                            {item.label}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800">{item.count}</span>
                                            <span className="text-gray-400">({item.pct})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-1 items-center justify-center px-2 text-center text-sm font-medium text-slate-500">
                            Order tracking is not configured yet.
                        </div>
                    )}
                </div>

                {/* Low Stock Alert */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Low Stock Alert</h3>
                        <button onClick={() => navigate('/admin/products/stock')} className="text-xs font-bold text-primary-dark hover:underline">View All</button>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px]">
                        {lowStockAlerts.length ? lowStockAlerts.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                                {item.img ? (
                                    <img
                                        src={getDashboardImageUrl(item.img)}
                                        alt={item.name}
                                        className="h-10 w-10 rounded border border-gray-200 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded bg-red-50 text-red-500">
                                        <FiAlertTriangle size={16} />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">Stock: <span className="text-red-500 font-bold">{item.stock}</span></p>
                                </div>
                                <span className="whitespace-nowrap rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-500">
                                    {Number(item.stock) === 0 ? "Out of Stock" : "Low Stock"}
                                </span>
                            </div>
                        )) : (
                            <p className="py-8 text-center text-sm font-medium text-slate-500">No low-stock products.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Orders & Top Rated Products */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Recent Orders */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-black text-slate-800">Recent Orders</h3>
                        <button onClick={() => navigate('/admin/orders/all')} className="text-xs font-bold text-primary-dark hover:underline">View All →</button>
                    </div>
                    <div className="flex min-h-40 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm font-medium text-slate-500">
                        {orderAnalyticsAvailable
                            ? "There are no recent orders to display."
                            : "Order data is not available because order tracking is not configured yet."}
                    </div>
                </div>

                {/* Top Rated Products */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-black text-slate-800">Top Rated Products</h3>
                        <button onClick={() => navigate('/admin/products/all')} className="text-xs font-bold text-primary-dark hover:underline">View All →</button>
                    </div>
                    <div className="space-y-3">
                        {topProducts.length > 0 ? topProducts.map((item, i) => (
                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                                <div className="relative shrink-0">
                                    {item.img ? (
                                        <img
                                            src={getDashboardImageUrl(item.img)}
                                            alt={item.name}
                                            className="h-12 w-12 rounded-xl border border-gray-100 object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-slate-50 text-primary-dark">
                                            <FiShoppingBag size={18} />
                                        </div>
                                    )}
                                    <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-black text-secondary shadow">
                                        {i + 1}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{item.cat}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-primary-dark">{Number(item.rating || 0).toFixed(1)} ★</p>
                                    <p className="text-[10px] text-gray-400">rating</p>
                                </div>
                            </div>
                        )) : (
                            <p className="py-8 text-center text-sm font-semibold text-gray-400">No products available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
