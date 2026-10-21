import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiPlus, FiSave, FiStar, FiTrash2, FiUploadCloud } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { toast } from "react-hot-toast";
import api from "../../api";

const colorChoices = [
    { name: "Black", hex: "#171717" },
    { name: "White", hex: "#ffffff" },
    { name: "Brown", hex: "#795548" },
    { name: "Tan", hex: "#c19a6b" },
    { name: "Navy", hex: "#14213d" },
    { name: "Red", hex: "#dc2626" },
    { name: "Blue", hex: "#2563eb" },
    { name: "Green", hex: "#15803d" },
];

const footwearSizes = ["5", "6", "7", "8", "9", "10", "11", "12", "Free Size"];
const oneSizeCategories = ["Belts", "Bags", "Wallets & Card Holders", "Leather Accessories", "Travel Accessories"];
const footwearCategories = ["Shoes", "Leather Jackets", "Leather Gloves"];

const normalizeSubcategories = (value) => {
    if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
    if (typeof value !== "string" || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch (error) {
        console.error("Category subcategory data is not valid JSON:", error);
        return [];
    }
};

const normalizeCategory = (category) => ({
    ...category,
    name: category.name ?? category.category_name ?? "",
    subcategory: normalizeSubcategories(
        category.subcategory ?? category.sub_categories ?? category.subcategories,
    ),
});

const createVariant = () => ({
    color: "#795548",
    colorName: "Brown",
    images: [],
    selectedSizes: [],
    sizesStock: {},
});

const imageUrl = (image) => {
    if (!image || typeof image !== "string") return "";
    if (/^(https?:|data:|blob:)/i.test(image)) return image;
    const backend = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    return `${backend}${image.startsWith("/") ? image : `/${image}`}`;
};

const AddProducts = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [customSizes, setCustomSizes] = useState([]);
    const [form, setForm] = useState({
        name: "",
        product_code: "",
        description: "",
        category: "",
        subcategory: "",
        brand: "",
        material: "",
        mrp: "",
        offer: "0",
        rating: "5",
        status: "Active",
    });
    const [variants, setVariants] = useState([createVariant()]);

    const subcategories = useMemo(() => {
        const selected = categories.find((category) => category.name === form.category);
        return Array.isArray(selected?.subcategory) ? selected.subcategory : [];
    }, [categories, form.category]);

    const sizeOptions = useMemo(() => {
        if (footwearCategories.includes(form.category)) return [...footwearSizes, ...customSizes];
        if (oneSizeCategories.includes(form.category)) return [...new Set(["Free Size", ...customSizes])];
        return customSizes;
    }, [form.category, customSizes]);

    const totalStock = useMemo(
        () => variants.reduce(
            (total, variant) => total + Object.values(variant.sizesStock || {}).reduce(
                (sum, quantity) => sum + (Number.parseInt(quantity, 10) || 0),
                0,
            ),
            0,
        ),
        [variants],
    );
    const sellingPrice = useMemo(
        () => (Math.round(Number(form.mrp || 0) * (1 - Number(form.offer || 0) / 100) * 100) / 100).toFixed(2),
        [form.mrp, form.offer],
    );

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const categoryResponse = await api.get("/categories");
                const categoryData = Array.isArray(categoryResponse.data)
                    ? categoryResponse.data
                    : categoryResponse.data?.data;
                if (!Array.isArray(categoryData)) throw new Error("Categories API returned an invalid response.");
                const normalizedCategories = categoryData
                    .filter((category) => category && typeof category === "object")
                    .map(normalizeCategory)
                    .filter((category) => category.name);
                if (!active) return;
                setCategories(normalizedCategories);

                if (isEdit) {
                    const { data: product } = await api.get(`/products/${id}`);
                    if (!active) return;
                    setForm({
                        name: product.name || "",
                        product_code: product.product_code || "",
                        description: product.description || "",
                        category: product.category || "",
                        subcategory: product.subcategory || "",
                        brand: product.brand || "",
                        material: product.material || "",
                        mrp: String(product.mrp ?? ""),
                        offer: String(product.offer ?? 0),
                        rating: String(product.rating ?? 5),
                        status: product.status || "Active",
                    });
                    setVariants(Array.isArray(product.variants) && product.variants.length
                        ? product.variants.map((variant) => ({
                            ...createVariant(),
                            ...variant,
                            selectedSizes: Array.isArray(variant.selectedSizes) ? variant.selectedSizes : [],
                            sizesStock: variant.sizesStock || {},
                            images: Array.isArray(variant.images) ? variant.images : [],
                        }))
                        : [createVariant()]);
                } else {
                    const { data: codeData } = await api.get("/products/latest-code");
                    if (active) {
                        setForm((previous) => ({
                            ...previous,
                            product_code: codeData.latestCode || "SS0001",
                            category: normalizedCategories[0]?.name || "",
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to load product form:", error);
                toast.error(error.response?.data?.message || "Unable to load product data.");
            } finally {
                if (active) setFetching(false);
            }
        };
        load();
        return () => { active = false; };
    }, [id, isEdit]);

    const updateForm = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    const updateVariant = (index, updates) => {
        setVariants((current) => current.map((variant, variantIndex) =>
            variantIndex === index ? { ...variant, ...updates } : variant,
        ));
    };

    const toggleSize = (variantIndex, size) => {
        const variant = variants[variantIndex];
        const selected = variant.selectedSizes.includes(size);
        const selectedSizes = selected
            ? variant.selectedSizes.filter((item) => item !== size)
            : [...variant.selectedSizes, size];
        const sizesStock = { ...variant.sizesStock };
        if (selected) delete sizesStock[size];
        else sizesStock[size] = 0;
        updateVariant(variantIndex, { selectedSizes, sizesStock });
    };

    const handleAddCustomSize = (variantIndex, event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const size = event.currentTarget.value.trim();
        if (!size || size.length > 32) {
            toast.error("Enter a size up to 32 characters.");
            return;
        }
        setCustomSizes((current) => [...new Set([...current, size])]);
        if (!variants[variantIndex].selectedSizes.includes(size)) toggleSize(variantIndex, size);
        event.currentTarget.value = "";
    };

    const uploadImages = async (variantIndex, event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const currentImages = variants[variantIndex].images || [];
        if (currentImages.length + files.length > 5) {
            toast.error("Upload up to 5 images for each color.");
            event.target.value = "";
            return;
        }
        const payload = new FormData();
        files.forEach((file) => payload.append("images", file));
        try {
            const { data } = await api.post("/products/upload", payload);
            if (!Array.isArray(data.images) || data.images.length !== files.length) {
                throw new Error("The image upload response was incomplete.");
            }
            updateVariant(variantIndex, { images: [...currentImages, ...data.images] });
            toast.success("Product images uploaded.");
        } catch (error) {
            console.error("Product image upload failed:", error);
            toast.error(error.response?.data?.message || "Product image upload failed.");
        } finally {
            event.target.value = "";
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.name.trim() || !form.product_code.trim() || !form.category || !Number(form.mrp)) {
            toast.error("Enter product name, code, category, and a valid MRP.");
            return;
        }
        if (!variants.length || variants.some((variant) => !variant.selectedSizes.length)) {
            toast.error("Add at least one size to every product color.");
            return;
        }
        const product = {
            ...form,
            name: form.name.trim(),
            product_code: form.product_code.trim(),
            mrp: Number(form.mrp),
            offer: Number(form.offer || 0),
            offer_price: Number(sellingPrice),
            rating: Number(form.rating),
            total_stock: totalStock,
            variants,
        };
        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/products/${id}`, product);
                toast.success("Product updated.");
            } else {
                await api.post("/products", product);
                toast.success("Product added.");
            }
            navigate("/admin/products/all");
        } catch (error) {
            console.error("Failed to save product:", error);
            toast.error(error.response?.data?.message || "Unable to save product.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <div className="py-20 text-center font-semibold text-gray-500">Loading product...</div>;
    }

    const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-[#1F0A3C]/40 focus:bg-white";
    const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500";

    return (
        <div className="space-y-6 pb-16">
            <header className="flex items-center gap-3">
                <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500">
                    <FiArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-[#1F0A3C]">{isEdit ? "Edit Product" : "Add Product"}</h1>
                    <p className="text-xs text-gray-400">Manage product pricing, colors, sizes, and stock.</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div>
                            <h2 className="text-sm font-bold text-[#1F0A3C]">Product Details</h2>
                            <p className="mt-1 text-xs text-gray-400">Product code {form.product_code || "generating..."}</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label><span className={labelClass}>Product Name *</span><input required name="name" value={form.name} onChange={updateForm} className={inputClass} placeholder="e.g. Leather walking shoes" /></label>
                            <label><span className={labelClass}>SKU / Product Code *</span><input required name="product_code" value={form.product_code} onChange={updateForm} className={inputClass} placeholder="SKU" /></label>
                            <label><span className={labelClass}>Category *</span><select required name="category" value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value, subcategory: "" }))} className={inputClass}><option value="">Select category</option>{categories.map((category) => <option key={category.id || category.catId} value={category.name}>{category.name}</option>)}</select></label>
                            <label><span className={labelClass}>Subcategory</span><select name="subcategory" value={form.subcategory} onChange={updateForm} className={inputClass}><option value="">Select subcategory</option>{form.subcategory && !subcategories.includes(form.subcategory) && <option value={form.subcategory}>{form.subcategory}</option>}{subcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}</select></label>
                            <label><span className={labelClass}>Brand</span><input name="brand" value={form.brand} onChange={updateForm} className={inputClass} placeholder="Brand name" /></label>
                            <label><span className={labelClass}>Material</span><input name="material" value={form.material} onChange={updateForm} className={inputClass} placeholder="e.g. Full-grain leather" /></label>
                            <label className="sm:col-span-2"><span className={labelClass}>Description</span><textarea name="description" value={form.description} onChange={updateForm} rows={3} className={inputClass} placeholder="Product description" /></label>
                        </div>
                    </section>

                    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-sm font-bold text-[#1F0A3C]">Pricing</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <label><span className={labelClass}>MRP (₹) *</span><span className="relative block"><FaRupeeSign className="absolute left-3 top-3 text-gray-400" /><input required min="0.01" step="0.01" type="number" name="mrp" value={form.mrp} onChange={updateForm} className={`${inputClass} pl-8`} /></span></label>
                            <label><span className={labelClass}>Offer (%)</span><input min="0" max="100" step="0.01" type="number" name="offer" value={form.offer} onChange={updateForm} className={inputClass} /></label>
                            <label><span className={labelClass}>Selling Price (₹)</span><input readOnly value={sellingPrice} className={`${inputClass} cursor-not-allowed bg-emerald-50 font-bold text-emerald-700`} /></label>
                            <label><span className={`${labelClass} flex items-center gap-1`}><FiStar className="text-amber-500" /> Rating</span><select name="rating" value={form.rating} onChange={updateForm} className={inputClass}>{[5, 4, 3, 2, 1, 0].map((rating) => <option key={rating} value={rating}>{rating} {rating === 1 ? "star" : "stars"}</option>)}</select></label>
                            <label><span className={labelClass}>Status</span><select name="status" value={form.status} onChange={updateForm} className={inputClass}>{["Active", "Inactive", "Draft"].map((status) => <option key={status}>{status}</option>)}</select></label>
                        </div>
                        <p className="text-xs text-gray-400">Selling price is calculated from MRP and offer. Purchase price is not collected.</p>
                    </section>
                </div>

                <aside className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <div><h2 className="text-sm font-bold text-[#1F0A3C]">Color & Size Stock</h2><p className="text-xs text-gray-400">Total stock: {totalStock}</p></div>
                        <button type="button" aria-label="Add color" onClick={() => setVariants((current) => [...current, createVariant()])} className="rounded-lg bg-[#1F0A3C] p-2 text-white"><FiPlus /></button>
                    </div>

                    {variants.map((variant, index) => (
                        <section key={index} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <input aria-label="Choose color" type="color" value={variant.color} onChange={(event) => {
                                    const colorName = colorChoices.find((color) => color.hex.toLowerCase() === event.target.value.toLowerCase())?.name || "Custom";
                                    updateVariant(index, { color: event.target.value, colorName });
                                }} className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent" />
                                <select aria-label="Color name" value={variant.colorName} onChange={(event) => {
                                    const selected = colorChoices.find((color) => color.name === event.target.value);
                                    updateVariant(index, selected ? { color: selected.hex, colorName: selected.name } : { colorName: event.target.value });
                                }} className={`${inputClass} min-w-0 flex-1`}>
                                    <option value="">Select color</option>
                                    {colorChoices.map((color) => <option key={color.name}>{color.name}</option>)}
                                    {!colorChoices.some((color) => color.name === variant.colorName) && variant.colorName && <option>{variant.colorName}</option>}
                                </select>
                                {variants.length > 1 && <button type="button" aria-label="Remove color" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-2 text-red-500"><FiTrash2 /></button>}
                            </div>

                            <div>
                                <p className={labelClass}>Select sizes</p>
                                <div className="flex flex-wrap gap-2">
                                    {sizeOptions.map((size) => (
                                        <button key={size} type="button" onClick={() => toggleSize(index, size)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${variant.selectedSizes.includes(size) ? "bg-[#1F0A3C] text-white" : "bg-gray-100 text-gray-600"}`}>{size}</button>
                                    ))}
                                </div>
                                <input onKeyDown={(event) => handleAddCustomSize(index, event)} className={`${inputClass} mt-2`} placeholder="Add a size and press Enter" aria-label="Add custom size" />
                            </div>

                            {variant.selectedSizes.map((size) => (
                                <label key={size} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                    <span className="text-sm font-semibold text-gray-700">{size}</span>
                                    <span className="flex items-center gap-2 text-xs text-gray-400">Stock
                                        <input aria-label={`${size} stock`} min="0" step="1" type="number" value={variant.sizesStock[size] ?? 0} onChange={(event) => updateVariant(index, { sizesStock: { ...variant.sizesStock, [size]: Math.max(0, Number.parseInt(event.target.value, 10) || 0) } })} className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-bold text-gray-800" />
                                    </span>
                                </label>
                            ))}

                            <div className="grid grid-cols-3 gap-2">
                                {variant.images.map((image, imageIndex) => (
                                    <div key={`${image}-${imageIndex}`} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                                        <img src={imageUrl(image)} alt={`${variant.colorName} product view ${imageIndex + 1}`} className="h-full w-full object-cover" />
                                        <button type="button" aria-label="Remove image" onClick={() => updateVariant(index, { images: variant.images.filter((_, itemIndex) => itemIndex !== imageIndex) })} className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600"><FiTrash2 /></button>
                                    </div>
                                ))}
                                {variant.images.length < 5 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1F0A3C]"><FiUploadCloud /><span className="mt-1 text-[10px]">Upload image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(event) => uploadImages(index, event)} /></label>}
                            </div>
                        </section>
                    ))}
                </aside>

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 lg:col-span-3">
                    <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600">Cancel</button>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-[#1F0A3C] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                        <FiSave />{loading ? "Saving..." : isEdit ? "Update Product" : "Add Product"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProducts;
