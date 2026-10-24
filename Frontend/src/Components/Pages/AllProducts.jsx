import React, { useCallback, useEffect, useState, useContext } from "react";
import api from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { getProductStock } from "../../utils/stock";
import { Link } from "react-router-dom";
import {
    FiSearch, FiHeart, FiShoppingCart, FiSliders, FiGrid, FiList, FiChevronDown, FiChevronUp
} from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import { QRCodeCanvas } from "qrcode.react";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

const AGE_GROUPS = ["All", "Infant (0–1)", "Toddler (1–3)", "Kids (3–5)", "Kids (5–7)", "Kids (7–10)", "Teen (10–15)", "Teen (15–20)", "Adult (20+)"];
const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const pageLoadTimestamp = Date.now();
const resolveImageUrl = (image) => {
    if (!image || /^(https?:|data:|blob:)/i.test(image)) return image;
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};
const firstImage = (images) => {
    if (Array.isArray(images)) return images[0] || "";
    if (typeof images !== "string") return "";
    try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed[0] || "" : "";
    } catch {
        return "";
    }
};

const AllProducts = () => {
    const { addToCart, toggleWishlist, wishlist, productsCache, setProductsCache, lastFetchTime, setLastFetchTime, categoriesCache, setCategoriesCache } = useContext(StoreContext);
    const [products, setProducts] = useState(Array.isArray(productsCache) ? productsCache : []);
    const [loading, setLoading] = useState(!productsCache || productsCache.length === 0);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAge, setSelectedAge] = useState("All");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [sortBy, setSortBy] = useState("newest");
    const [selectedBrand, setSelectedBrand] = useState("");
    const [brandSearch, setBrandSearch] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [priceLimit, setPriceLimit] = useState(null);
    const [viewMode, setViewMode] = useState("grid");
    const [promoBanners, setPromoBanners] = useState([]);
    const [browseCategories, setBrowseCategories] = useState(Array.isArray(categoriesCache) ? categoriesCache : []);
    const [openFilters, setOpenFilters] = useState({ category: true, price: true, brand: true, size: true, color: true, material: true });
    const [showQR, setShowQR] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [loadError, setLoadError] = useState("");

    const fetchProducts = useCallback(async () => {
        // Cache for 5 minutes
        const isCacheValid = lastFetchTime && (Date.now() - lastFetchTime < 5 * 60 * 1000);
        if (isCacheValid && productsCache?.length > 0) {
            return;
        }

        try {
            const firstPage = await api.get("/products", { params: { limit: 100, page: 1, status: "Active" } });
            let data;
            if (Array.isArray(firstPage.data)) {
                data = firstPage.data;
            } else {
                data = Array.isArray(firstPage.data?.products) ? firstPage.data.products : [];
                const totalPages = Number(firstPage.data?.pagination?.totalPages) || 1;
                for (let page = 2; page <= totalPages; page += 1) {
                    const response = await api.get("/products", { params: { limit: 100, page, status: "Active" } });
                    if (!Array.isArray(response.data?.products)) {
                        throw new Error("The products API returned an invalid page.");
                    }
                    data.push(...response.data.products);
                }
            }
            setProducts(data);
            setProductsCache(data);
            setLastFetchTime(Date.now());
            setLoadError("");

        } catch (error) {
            console.error("Error fetching products:", error);
            setLoadError(error.response?.data?.message || "Unable to load products. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [lastFetchTime, productsCache, setLastFetchTime, setProductsCache]);

    useEffect(() => {
        void Promise.resolve().then(fetchProducts);
    }, [fetchProducts]);

    useEffect(() => {
        let active = true;
        if (Array.isArray(categoriesCache) && categoriesCache.length) return undefined;
        api.get("/categories")
            .then((response) => {
                if (!active) return;
                const categories = (Array.isArray(response.data) ? response.data : [])
                    .filter((category) => category.status?.toLowerCase() !== "inactive")
                    .map((category) => ({
                        name: category.name,
                        image: resolveImageUrl(firstImage(category.images)),
                    }));
                setBrowseCategories(categories);
                setCategoriesCache(categories);
            })
            .catch((error) => {
                console.error("Error fetching shop categories:", error);
            });
        return () => { active = false; };
    }, [categoriesCache, setCategoriesCache]);

    useEffect(() => {
        let active = true;
        api.get("/banners/type/hero")
            .then((response) => {
                if (!active) return;
                const banners = Array.isArray(response.data) ? response.data : [];
                setPromoBanners(banners.slice(0, 4).map((banner) => ({
                    ...banner,
                    image: resolveImageUrl(banner.image),
                })));
            })
            .catch((error) => {
                console.error("Error fetching shop banners:", error);
            });
        return () => { active = false; };
    }, []);

    const getImage = (product) => {
        if (product.variants?.length > 0 && product.variants[0]?.images?.length > 0)
            return resolveImageUrl(product.variants[0].images[0]);
        if (product.images?.length > 0) return resolveImageUrl(product.images[0]);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=f3f4f6&color=64748b&size=400`;
    };

    const productCategories = [...new Set(products.map((product) => product.category).filter(Boolean))];
    const shopCategories = browseCategories.length ? browseCategories.map((category) => category.name) : productCategories;
    const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))];
    const sizes = [...new Set(products.flatMap((product) => product.variants?.flatMap((variant) => variant.selectedSizes || []) || []))];
    const colors = [...new Map(products.flatMap((product) => product.variants || [])
        .filter((variant) => variant.color)
        .map((variant) => [variant.color, { color: variant.color, name: variant.colorName || "Color" }])).values()];
    const materials = [...new Set(products.map((product) => product.material).filter(Boolean))];
    const maximumPrice = Math.max(0, ...products.map((product) => Number(product.offer_price || product.price || 0)));
    const priceSliderMax = Math.max(maximumPrice, 10_000);
    const categoryCount = (category) => products.filter((product) => product.category === category).length;

    const filtered = (Array.isArray(products) ? products : [])
        .filter(p => {
            const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.product_code?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCategory === "All" || p.category === selectedCategory;
            const matchAge = selectedAge === "All" || p.age === selectedAge;
            const matchBrand = !selectedBrand || p.brand === selectedBrand;
            const matchPrice = priceLimit === null || Number(p.offer_price || p.price || 0) <= priceLimit;
            const matchSize = !selectedSize || p.variants?.some((variant) => variant.selectedSizes?.includes(selectedSize));
            const matchColor = !selectedColor || p.variants?.some((variant) => variant.color === selectedColor);
            const matchMaterial = !selectedMaterial || p.material === selectedMaterial;
            return matchSearch && matchCat && matchAge && matchBrand && matchPrice && matchSize && matchColor && matchMaterial;
        })
        .sort((a, b) => {
            if (sortBy === "price_asc") return parseFloat(a.offer_price || a.price || 0) - parseFloat(b.offer_price || b.price || 0);
            if (sortBy === "price_desc") return parseFloat(b.offer_price || b.price || 0) - parseFloat(a.offer_price || a.price || 0);
            return b.id - a.id; // newest
        });

    const isInWishlist = (id) => wishlist.some(p => p.product_id === id || p.id === id);

    const activeFiltersCount = [
        selectedCategory !== "All", selectedAge !== "All", Boolean(selectedBrand),
        Boolean(selectedSize), Boolean(selectedColor), Boolean(selectedMaterial), priceLimit !== null,
    ].filter(Boolean).length;

    const toggleFilterSection = (section) => {
        setOpenFilters((current) => ({ ...current, [section]: !current[section] }));
    };
    const clearFilters = () => {
        setSelectedCategory("All");
        setSelectedAge("All");
        setSelectedBrand("");
        setSelectedSize("");
        setSelectedColor("");
        setSelectedMaterial("");
        setPriceLimit(null);
        setSearchTerm("");
    };

    return (
        <main className="bg-white text-[#17191d]">
            <PageHeader
                title="Shop"
                subtitle="Discover Premium Shoes, Bags, Belts, Wallets & More"
                background="/images/pageheader1.png"
                backgroundPosition="center 54%"
                contentAlignment="left"
                heightClassName="h-[145px] sm:h-[160px] md:h-[175px] lg:h-[120px]"
                overlayClassName="bg-gradient-to-r from-black/65 via-black/25 to-transparent"
                titleClassName="text-3xl sm:text-4xl"
                subtitleClassName="text-sm sm:text-[15px]"
                breadcrumbClassName="text-[9px] sm:text-[10px]"
            />

            <PageContainer className="py-3">
                <div aria-label="Shop by category" className="flex gap-4 overflow-x-auto pb-1 sm:justify-between sm:gap-3">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("All")}
                        className={`flex min-w-[68px] shrink-0 flex-col items-center gap-1.5 text-center text-[10px] font-semibold ${selectedCategory === "All" ? "text-[#ff4b0b]" : "text-slate-700"}`}
                    >
                        <span className={`flex h-12 w-12 items-center justify-center rounded-full border bg-slate-50 ${selectedCategory === "All" ? "border-[#ff4b0b] text-[#ff4b0b]" : "border-slate-100 text-slate-600"}`}>
                            <FiGrid size={19} />
                        </span>
                        All Products
                    </button>
                    {shopCategories.map((category) => {
                        const categoryProduct = products.find((product) => product.category === category);
                        const categoryImage = browseCategories.find((item) => item.name === category)?.image;
                        return (
                            <button
                                key={category}
                                type="button"
                                onClick={() => setSelectedCategory(category)}
                                className={`flex min-w-[68px] shrink-0 flex-col items-center gap-1.5 text-center text-[10px] font-semibold ${selectedCategory === category ? "text-[#ff4b0b]" : "text-slate-700"}`}
                            >
                                <span className={`h-12 w-12 overflow-hidden rounded-full border bg-slate-50 ${selectedCategory === category ? "border-[#ff4b0b] ring-2 ring-orange-100" : "border-slate-100"}`}>
                                    {categoryImage || categoryProduct ? (
                                        <img src={categoryImage || getImage(categoryProduct)} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="flex h-full items-center justify-center"><FiGrid size={18} /></span>
                                    )}
                                </span>
                                <span className="max-w-[76px] truncate">{category}</span>
                            </button>
                        );
                    })}
                </div>
            </PageContainer>

            <PageContainer className="pb-8 pt-1">
                {loadError && (
                    <div role="alert" className="mb-3 flex items-center justify-between gap-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <span>{loadError}</span>
                        <button type="button" onClick={() => { setLoading(true); void fetchProducts(); }} className="font-bold underline">Retry</button>
                    </div>
                )}

                <div className="mb-2 flex items-center justify-between gap-3 text-[10px]">
                    <div className="flex items-center gap-2 font-semibold text-slate-500">
                        <span className="hidden sm:inline">Showing</span>
                        <span className="text-slate-800">{filtered.length} of {products.length} products</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="relative w-28 sm:w-40 xl:w-48">
                            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search shoes, bags, belts..."
                                aria-label="Search products"
                                className="h-8 w-full border border-slate-200 bg-white pl-7 pr-2 text-[9px] outline-none focus:border-[#ff4b0b]"
                            />
                        </label>
                        <label htmlFor="shop-sort" className="hidden sm:inline text-slate-600">Sort By:</label>
                        <select
                            id="shop-sort"
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className="h-8 rounded border border-slate-200 bg-white px-2 text-[10px] text-slate-700 outline-none focus:border-[#ff4b0b]"
                        >
                            <option value="newest">Featured</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                        </select>
                        <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} className={`flex h-8 w-8 items-center justify-center rounded border ${viewMode === "grid" ? "border-[#ff4b0b] text-[#ff4b0b]" : "border-slate-200 text-slate-500"}`}>
                            <FiGrid size={15} />
                        </button>
                        <button type="button" aria-label="List view" onClick={() => setViewMode("list")} className={`flex h-8 w-8 items-center justify-center rounded border ${viewMode === "list" ? "border-[#ff4b0b] text-[#ff4b0b]" : "border-slate-200 text-slate-500"}`}>
                            <FiList size={15} />
                        </button>
                    </div>
                </div>

                <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
                    <aside className={`${showFilters ? "block" : "hidden"} mb-3 border border-slate-200 bg-white text-[10px] lg:mb-0 lg:block`}>
                        <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-2">
                            <h2 className="text-xs font-bold">Filters</h2>
                            {activeFiltersCount > 0 && <button type="button" onClick={clearFilters} className="text-slate-500 underline">Clear All</button>}
                        </div>
                        <section className="border-b border-slate-100 px-2.5 py-2">
                            <button type="button" onClick={() => toggleFilterSection("category")} className="flex w-full items-center justify-between font-bold">
                                Category {openFilters.category ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {openFilters.category && <div className="mt-2 space-y-1.5">
                                {shopCategories.map((category) => (
                                    <label key={category} className="flex cursor-pointer items-center gap-1.5 text-slate-600">
                                        <input type="checkbox" checked={selectedCategory === category} onChange={() => setSelectedCategory(selectedCategory === category ? "All" : category)} className="h-3 w-3 accent-[#ff4b0b]" />
                                        <span className="min-w-0 flex-1 truncate">{category}</span><span>({categoryCount(category)})</span>
                                    </label>
                                ))}
                            </div>}
                        </section>
                        <section className="border-b border-slate-100 px-2.5 py-2">
                            <button type="button" onClick={() => toggleFilterSection("price")} className="flex w-full items-center justify-between font-bold">
                                Price Range {openFilters.price ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {openFilters.price && <div className="mt-2">
                                <input type="range" min="0" max={priceSliderMax} step="100" value={priceLimit ?? priceSliderMax} onChange={(event) => setPriceLimit(Number(event.target.value))} className="h-1 w-full cursor-pointer accent-[#ff4b0b]" />
                                <div className="mt-1 flex justify-between text-[9px] text-slate-500">
                                        <span>₹0</span><span>Up to ₹{(priceLimit ?? priceSliderMax).toLocaleString("en-IN")}</span>
                                </div>
                                {priceLimit !== null && <button type="button" onClick={() => setPriceLimit(null)} className="mt-1 text-[9px] text-[#ff4b0b] underline">Reset price</button>}
                            </div>}
                        </section>
                        <section className="border-b border-slate-100 px-2.5 py-2">
                            <button type="button" onClick={() => toggleFilterSection("brand")} className="flex w-full items-center justify-between font-bold">
                                Brand {openFilters.brand ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {openFilters.brand && <div className="mt-2">
                                <input value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} placeholder="Search Brand" className="mb-2 h-7 w-full rounded border border-slate-200 px-2 text-[9px] outline-none focus:border-[#ff4b0b]" />
                                <div className="space-y-1.5">
                                    {brands.filter((brand) => brand.toLowerCase().includes(brandSearch.toLowerCase())).map((brand) => (
                                        <label key={brand} className="flex cursor-pointer items-center gap-1.5 text-slate-600">
                                            <input type="checkbox" checked={selectedBrand === brand} onChange={() => setSelectedBrand(selectedBrand === brand ? "" : brand)} className="h-3 w-3 accent-[#ff4b0b]" />{brand}
                                        </label>
                                    ))}
                                    {!brands.length && <span className="text-slate-400">No brands available</span>}
                                </div>
                            </div>}
                        </section>
                        <section className="border-b border-slate-100 px-2.5 py-2">
                            <button type="button" onClick={() => toggleFilterSection("size")} className="flex w-full items-center justify-between font-bold">
                                Size {openFilters.size ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {openFilters.size && <div className="mt-2 flex flex-wrap gap-1">
                                {sizes.length ? sizes.map((size) => (
                                    <button key={size} type="button" onClick={() => setSelectedSize(selectedSize === size ? "" : size)} className={`min-w-7 rounded border px-1.5 py-1 text-[9px] ${selectedSize === size ? "border-[#ff4b0b] bg-orange-50 text-[#ff4b0b]" : "border-slate-200 text-slate-600"}`}>{size}</button>
                                )) : <span className="text-slate-400">Sizes appear when products are added</span>}
                            </div>}
                        </section>
                        <section className="border-b border-slate-100 px-2.5 py-2">
                            <button type="button" onClick={() => toggleFilterSection("color")} className="flex w-full items-center justify-between font-bold">
                                Color {openFilters.color ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {openFilters.color && <div className="mt-2 flex flex-wrap gap-1.5">
                                {colors.length ? colors.map(({ color, name }) => (
                                    <button key={color} type="button" aria-label={name} title={name} onClick={() => setSelectedColor(selectedColor === color ? "" : color)} className={`h-4 w-4 rounded-full border border-slate-300 ${selectedColor === color ? "ring-2 ring-[#ff4b0b] ring-offset-1" : ""}`} style={{ backgroundColor: color }} />
                                )) : <span className="text-slate-400">Colors appear when products are added</span>}
                            </div>}
                        </section>
                        <section className="px-2.5 py-2">
                            <button type="button" onClick={() => toggleFilterSection("material")} className="flex w-full items-center justify-between font-bold">
                                Material {openFilters.material ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {openFilters.material && <div className="mt-2 space-y-1.5">
                                {materials.length ? materials.map((material) => (
                                    <label key={material} className="flex cursor-pointer items-center gap-1.5 text-slate-600">
                                        <input type="checkbox" checked={selectedMaterial === material} onChange={() => setSelectedMaterial(selectedMaterial === material ? "" : material)} className="h-3 w-3 accent-[#ff4b0b]" />{material}
                                    </label>
                                )) : <span className="text-slate-400">No materials available</span>}
                            </div>}
                        </section>
                        <section className="border-t border-slate-100 px-2.5 py-2">
                            <button type="button" onClick={() => toggleFilterSection("age")} className="flex w-full items-center justify-between font-bold">
                                Age Group {openFilters.age ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {openFilters.age && <div className="mt-2 space-y-1.5">
                                {AGE_GROUPS.slice(1).map((age) => (
                                    <label key={age} className="flex cursor-pointer items-center gap-1.5 text-slate-600">
                                        <input type="checkbox" checked={selectedAge === age} onChange={() => setSelectedAge(selectedAge === age ? "All" : age)} className="h-3 w-3 accent-[#ff4b0b]" />{age}
                                    </label>
                                ))}
                            </div>}
                        </section>
                    </aside>

                    <section className="min-w-0">
                        <div className="mb-2 flex items-center justify-between lg:hidden">
                            <button type="button" onClick={() => setShowFilters(!showFilters)} className="inline-flex h-8 items-center gap-1.5 border border-slate-200 bg-white px-2.5 text-[10px] font-semibold">
                                <FiSliders size={13} /> Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                            </button>
                            {activeFiltersCount > 0 && <button type="button" onClick={clearFilters} className="text-[10px] text-[#ff4b0b] underline">Clear All</button>}
                        </div>
                        {loading ? (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div key={index} className="animate-pulse border border-slate-100 bg-white">
                                        <div className="aspect-[1.15] bg-slate-100" />
                                        <div className="space-y-2 p-2"><div className="h-2 w-3/4 bg-slate-100" /><div className="h-2 w-1/2 bg-slate-100" /><div className="h-6 bg-slate-100" /></div>
                                    </div>
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="border border-slate-200 bg-white py-16 text-center">
                                <FiSearch className="mx-auto mb-3 text-slate-300" size={30} />
                                <h2 className="text-base font-bold text-slate-800">No Products Found</h2>
                                <p className="mt-1 text-xs text-slate-500">Try changing your search or filters.</p>
                                <button type="button" onClick={clearFilters} className="mt-4 bg-[#ff4b0b] px-4 py-2 text-xs font-bold text-white">Clear filters</button>
                            </div>
                        ) : (
                            <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "flex flex-col gap-2"}>
                                {filtered.map((product) => {
                                    const img = getImage(product);
                                    const inWishlist = isInWishlist(product.id);
                                    const productUrl = `${window.location.origin}/products/${product.id}`;
                                    const discountPct = product.mrp && product.offer_price ? Math.round((1 - Number(product.offer_price) / Number(product.mrp)) * 100) : null;
                                    const isOutOfStock = getProductStock(product) < 1;
                                    const isNew = product.created_at && pageLoadTimestamp - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
                                    return (
                                        <article key={product.id} className={`group relative flex overflow-hidden border border-slate-200 bg-white transition-shadow hover:shadow-md ${viewMode === "grid" ? "min-w-0 flex-col" : "flex-row"}`}>
                                            <Link to={`/products/${product.id}`} className={`relative block shrink-0 bg-[#f7f8fa] ${viewMode === "grid" ? "aspect-[1.15] w-full" : "h-28 w-28"}`}>
                                                <img src={img} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                                {discountPct > 0 ? (
                                                    <span className="absolute left-1.5 top-1.5 bg-red-600 px-1.5 py-0.5 text-[8px] font-bold text-white">{discountPct}% OFF</span>
                                                ) : isNew && (
                                                    <span className="absolute left-1.5 top-1.5 bg-blue-700 px-1.5 py-0.5 text-[8px] font-bold text-white">New</span>
                                                )}
                                            </Link>
                                            <div className={`absolute right-1.5 top-1.5 flex flex-col gap-1 ${viewMode === "grid" ? "" : "right-auto left-[6.5rem]"}`}>
                                                <button type="button" aria-label={`Add ${product.name} to wishlist`} onClick={() => toggleWishlist(product)} className={`flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#ff4b0b] shadow-sm ${inWishlist ? "text-red-600" : ""}`}>
                                                    <FiHeart size={12} className={inWishlist ? "fill-current" : ""} />
                                                </button>
                                                <button type="button" aria-label={`Show QR code for ${product.name}`} onClick={() => setShowQR(showQR === product.id ? null : product.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                                                    <BsQrCode size={12} />
                                                </button>
                                            </div>
                                            <div className={`flex min-w-0 flex-1 flex-col ${viewMode === "grid" ? "p-1.5 sm:p-2" : "p-2"}`}>
                                                <p className="truncate text-[8px] font-semibold uppercase text-slate-500">{product.category}</p>
                                                <Link to={`/products/${product.id}`} className="mt-0.5 line-clamp-2 min-h-[2em] text-[10px] font-bold leading-tight text-slate-800 hover:text-[#ff4b0b]">{product.name}</Link>
                                                {product.brand && <p className="truncate text-[8px] text-slate-500">{product.brand}</p>}
                                                <div className="mt-1 flex items-center gap-1">
                                                    {product.variants?.slice(0, 4).map((variant, index) => (
                                                        <span key={`${variant.color}-${index}`} className="h-2 w-2 rounded-full border border-slate-300" style={{ backgroundColor: variant.color || "#fff" }} />
                                                    ))}
                                                    {Number(product.rating) > 0 && <span className="ml-auto flex items-center gap-0.5 text-[8px] font-bold text-[#f97316]">★ {Number(product.rating).toFixed(1)}</span>}
                                                </div>
                                                <div className="mt-auto flex items-center gap-1 pt-1">
                                                    <span className="text-[11px] font-extrabold text-[#f04b0b]">₹{Number(product.offer_price || product.price || 0).toLocaleString("en-IN")}</span>
                                                    {product.mrp && Number(product.mrp) > Number(product.offer_price) && <span className="text-[8px] text-slate-400 line-through">₹{Number(product.mrp).toLocaleString("en-IN")}</span>}
                                                </div>
                                                <button type="button" onClick={() => addToCart(product)} disabled={isOutOfStock} className={`mt-1.5 flex h-6 w-full items-center justify-center gap-1 text-[9px] font-bold text-white transition-colors ${isOutOfStock ? "cursor-not-allowed bg-slate-300" : "bg-[#ff4b0b] hover:bg-[#e43f08]"}`}>
                                                    <FiShoppingCart size={11} /> {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                                                </button>
                                            </div>
                                            {showQR === product.id && (
                                                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowQR(null)}>
                                                    <div className="w-full max-w-xs bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
                                                        <h3 className="mb-1 font-bold text-slate-800">Scan to View</h3>
                                                        <p className="mb-4 text-xs text-slate-500">{product.name}</p>
                                                        <QRCodeCanvas value={productUrl} size={180} level="H" />
                                                        <button type="button" onClick={() => setShowQR(null)} className="mt-4 block w-full bg-slate-900 py-2 text-xs font-bold text-white">Close</button>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </PageContainer>

            {promoBanners.length > 0 && (
                <PageContainer className="pb-7">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {promoBanners.map((banner) => (
                            <Link key={banner.id || banner.title} to={banner.link || "/shop"} className="group relative flex h-24 items-end overflow-hidden bg-slate-800 p-3 text-white sm:h-28">
                                <img src={banner.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <span className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
                                <span className="relative max-w-[80%]">
                                    <span className="block text-[9px] font-medium text-white/85">{banner.subtitle}</span>
                                    <span className="mt-0.5 block line-clamp-2 text-sm font-bold leading-tight">{banner.title}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </PageContainer>
            )}
        </main>
    );
};

export default AllProducts;
