import React, { useContext, useEffect, useState } from "react";
import { FiArrowRight, FiHeart, FiShoppingCart } from "react-icons/fi";
import { Link } from "react-router-dom";
import api from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import ProductCard from "./ProductsCard";

const RelatedProducts = ({ category, currentProductId, compact = false }) => {
  const [products, setProducts] = useState([]);
  const { addToCart, toggleWishlist, wishlist } = useContext(StoreContext);

  const fetchRelatedProducts = async () => {
    try {
      const res = await api.get("/products");

      const products = Array.isArray(res.data) ? res.data : res.data?.products || [];
      const filtered = products.filter(
        (p) =>
          p.category?.toLowerCase() === category?.toLowerCase() &&
          p.id !== currentProductId,
      );

      setProducts(filtered.slice(0, 4));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (category) {
      fetchRelatedProducts();
    }
  }, [category]);

  if (!products.length) return null;

  if (compact) {
    const resolveImage = (product) => {
      let images = product?.variants?.[0]?.images || product?.images || [];
      if (typeof images === "string") {
        try {
          images = JSON.parse(images);
        } catch {
          images = [];
        }
      }
      const image = Array.isArray(images) ? images[0] : images;
      if (typeof image !== "string" || !image) return null;
      if (/^(https?:|data:|blob:)/i.test(image)) return image;
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
      const cleanPath = image.replace(/\\/g, "/");
      return `${backendUrl}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
    };

    return (
      <section className="min-w-0" aria-label="Recommended products">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <FiHeart className="fill-[#ff4b0b] text-[#ff4b0b]" size={18} />
            You May Also Like
          </h2>
          <Link to="/shop" className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:border-[#ff4b0b] hover:text-[#ff4b0b]">
            View All <FiArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {products.slice(0, 2).map((product) => {
            const image = resolveImage(product);
            const variant = product.variants?.[0] || null;
            const isSaved = wishlist.some((item) => item.product_id === product.id || item.id === product.id);
            return (
              <article key={product.id} className="min-w-0 overflow-hidden border border-slate-200 bg-white">
                <Link to={`/products/${product.id}`} className="relative block bg-slate-50">
                  {image ? (
                    <img src={image} alt={product.name} loading="lazy" className="h-24 w-full object-cover sm:h-28" />
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-slate-100 text-[10px] text-slate-400 sm:h-28">No image</div>
                  )}
                  <button type="button" aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"} onClick={(event) => { event.preventDefault(); toggleWishlist(product, variant); }} className={`absolute right-1.5 top-1.5 rounded-full bg-white p-1.5 shadow-sm ${isSaved ? "text-[#ff4b0b]" : "text-slate-500"}`}>
                    <FiHeart size={13} className={isSaved ? "fill-current" : ""} />
                  </button>
                </Link>
                <div className="p-2">
                  <Link to={`/products/${product.id}`} className="line-clamp-2 min-h-7 text-[10px] font-bold leading-snug text-slate-800 hover:text-[#ff4b0b]">{product.name}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5">
                    <span className="text-[11px] font-extrabold text-[#ff4b0b]">₹{Number(product.offer_price || product.price || 0).toLocaleString("en-IN")}</span>
                    {Number(product.mrp) > Number(product.offer_price) && <span className="text-[9px] text-slate-400 line-through">₹{Number(product.mrp).toLocaleString("en-IN")}</span>}
                  </div>
                  <button type="button" onClick={() => addToCart(product, variant, variant?.selectedSizes?.[0] || null, 1)} className="mt-2 flex w-full items-center justify-center gap-1 bg-[#ff4b0b] px-1.5 py-1.5 text-[9px] font-bold text-white transition hover:bg-[#dc3e08]">
                    <FiShoppingCart size={12} /> Add to Cart
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-16">
      <h2 className="text-2xl font-bold mb-6 text-primary-dark">
        Related Products
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="mb-4">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
