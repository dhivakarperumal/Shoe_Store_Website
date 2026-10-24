import { Link } from "react-router-dom";
import { FiArrowUpRight, FiLayers, FiPackage, FiPlus, FiShoppingCart } from "react-icons/fi";

const actions = [
    { label: "Add Product", description: "Grow your catalog", path: "/admin/products/add", icon: FiPlus, color: "#d99a32" },
    { label: "View Orders", description: "Track customer orders", path: "/admin/orders/all", icon: FiShoppingCart, color: "#1685ff" },
    { label: "Manage Stock", description: "Check inventory levels", path: "/admin/products/stock", icon: FiPackage, color: "#00a982" },
    { label: "Categories", description: "Organize your products", path: "/admin/products/category", icon: FiLayers, color: "#ef3f86" },
];

const DashboardQuickActions = () => (
    <section aria-labelledby="quick-actions-title" className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
            <h2 id="quick-actions-title" className="text-base font-extrabold text-secondary">Quick Actions</h2>
            <p className="mt-1 text-xs text-slate-500">Jump straight into common store tasks.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map(({ label, description, path, icon: Icon, color }) => (
                <Link
                    key={label}
                    to={path}
                    className="group flex items-center gap-3 rounded-md border border-slate-200 p-3 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: color }}
                    >
                        <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-secondary">{label}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span>
                    </span>
                    <FiArrowUpRight className="shrink-0 text-slate-400 transition-colors group-hover:text-secondary" size={16} />
                </Link>
            ))}
        </div>
    </section>
);

export default DashboardQuickActions;
