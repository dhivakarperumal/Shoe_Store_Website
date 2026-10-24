import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import toast from "react-hot-toast";

import api from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { getProductStock } from "../../utils/stock";
import {
  FiHeart,
  FiShoppingCart,
  FiChevronDown,
  FiChevronUp,
  FiTruck,
  FiRotateCcw,
  FiShield,
  FiCreditCard,
  FiCheck,
  FiCheckCircle,
  FiPackage,
  FiArrowRight,
} from "react-icons/fi";
import RelatedProducts from "./RelatedProducts";
import PageHeader from "../CommenComponents/PageHeader";
import PageContainer from "../CommenComponents/PageContainer";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { useNavigate } from "react-router-dom";

const ProductDetails = () => {
  const { addToCart, toggleWishlist, wishlist } = useContext(StoreContext);

  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();



  const [product, setProduct] = useState(null);
  const [productError, setProductError] = useState("");

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [reviewImage, setReviewImage] = useState(null);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const [userReviewed, setUserReviewed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [showDetails, setShowDetails] = useState(true);
  const [activeInfoTab, setActiveInfoTab] = useState("details");
  const [reviewStats, setReviewStats] = useState({
    total_reviews: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
  });
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [zoomed, setZoomed] = useState(false);
  const [backgroundPosition, setBackgroundPosition] = useState("50% 50%");
  const zoomLevel = 2.5;

  const resolveImageUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    const cleanPath = url.replace(/\\/g, "/");
    return `${backendUrl}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
  };

  const parseImages = (images) => {
    if (!images) return [];
    try {
      const parsed = typeof images === "string" ? JSON.parse(images) : images;
      return (Array.isArray(parsed) ? parsed : [parsed]).map(resolveImageUrl).filter(Boolean);
    } catch {
      return [];
    }
  };

  const getVariantColorName = (variant) =>
    variant?.colorName || variant?.color || "Default Color";

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await api.get(`/reviews/product/${id}`);
      setReviews(res.data?.reviews || []);
      setReviewStats(
        res.data?.stats || {
          total_reviews: 0,
          average_rating: 0,
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchProduct = async () => {
    try {
      setProductError("");
      setProduct(null);
      const res = await api.get(`/products/${id}`);
      const data = res.data;
      if (!data) throw new Error("Product data not found");

      const normalizedVariants = (Array.isArray(data.variants) ? data.variants : []).map((variant) => ({
        ...variant,
        images: parseImages(variant.images),
      }));
      const normalizedProduct = {
        ...data,
        images: parseImages(data.images),
        variants: normalizedVariants,
      };
      setProduct(normalizedProduct);

      const firstVariant = normalizedVariants[0] || null;
      setSelectedVariant(firstVariant);
      setSelectedImage(firstVariant?.images?.[0] || normalizedProduct.images[0] || null);
      setSelectedSize(firstVariant?.selectedSizes?.[0] || null);
    } catch (error) {
      console.error(error);
      setProductError(error.response?.data?.message || "Unable to load this product.");
    }
  };

  const handleBuyNow = () => {

    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    if (!selectedVariant) {
      alert("Please select a variant");
      return;
    }

    navigate("/checkout", {
      state: {
        product: product,
        variant: selectedVariant,
        size: selectedSize,
        quantity: quantity
      }
    });

  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();

    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setBackgroundPosition(`${x}% ${y}%`);
  };

  const increaseQty = () => {
    if (!selectedVariant || !selectedSize) return;

    const stock = selectedVariant?.sizesStock?.[selectedSize] || 0;

    setQuantity((prev) => {
      if (prev < stock) return prev + 1;
      return prev;
    });
  };

  const decreaseQty = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // review submitting section
  const submitReview = async () => {
    try {
      if (!rating) {
        alert("Please select rating");
        return;
      }
      const reviewerName = user?.name || user?.username || "";
      if (!reviewerName) {
        alert("Please login before submitting a review");
        return;
      }
      console.log("Submitting Review:", {
        product_id: product.id,
        user_name: reviewerName,
        user_email: user?.email,
        rating,
        comment: reviewText,
      });

      await api.post("/reviews", {
        product_id: product.id,
        user_name: reviewerName,
        user_email: user?.email,
        user_id: user?.user_id || user?.id,
        rating: rating,
        comment: reviewText,
        review_image: reviewImage,
      });

      alert("Review submitted successfully!");

      setRating(0);
      setReviewText("");
      setReviewImage(null);
      setShowReviewForm(false);

      // ⭐ IMPORTANT
      setUserReviewed(true);
      fetchReviews(); // Refresh the reviews list immediately
    } catch (error) {
      console.error(error);
      const errorMsg =
        error.response?.data?.message || "Failed to submit review";
      alert(errorMsg);

      if (errorMsg.includes("already submitted")) {
        setUserReviewed(true);
        setShowReviewForm(false);
      }
    }
  };

  //  check if the user already submitted a review for this product
  const checkUserReview = async () => {
    try {
      const uId = user?.user_id || user?.id;
      if (!uId) {
        setUserReviewed(false);
        return;
      }

      const res = await api.get(`/reviews/check/${id}/${uId}`);
      console.log("Check Review Response:", res.data);

      if (res.data.hasReviewed) {
        setUserReviewed(true);
      } else {
        setUserReviewed(false);
      }
    } catch (err) {
      console.log("Review check error:", err);
      setUserReviewed(false);
    }
  };
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Review image is too large. Maximum size is 5 MB.");
      return;
    }

    setUploadingReviewImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post("/reviews/upload", formData);
      setReviewImage(response.data.url);
      toast.success("Review image uploaded!");
    } catch (error) {
      console.error("Review image upload failed:", error);
      toast.error("Review image upload failed");
    } finally {
      setUploadingReviewImage(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    setUserReviewed(false);
  }, [id]);

  useEffect(() => {
    if (user) {
      checkUserReview();
    }
  }, [user, id]);

  if (!product)
    return (
      <>
        {productError ? (
          <div className="mx-auto flex min-h-[45vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
            <h1 className="text-2xl font-bold text-secondary">Product unavailable</h1>
            <p role="alert" className="mt-2 text-sm text-slate-500">{productError}</p>
            <button type="button" onClick={() => navigate("/shop")} className="mt-5 bg-[#ff4b0b] px-5 py-2.5 text-sm font-bold text-white">Back to shop</button>
          </div>
        ) : <>
        <PageHeader title="Loading..." />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 grid lg:grid-cols-2 gap-8 lg:gap-12 animate-pulse">
          {/* LEFT IMAGE SKELETON */}
          <div>
            <div className="w-full h-[320px] sm:h-[420px] lg:h-[480px] bg-gray-200 rounded-xl"></div>

            <div className="flex gap-3 mt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* RIGHT DETAILS SKELETON */}
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-gray-200 rounded"></div>

            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded"></div>

            <div className="h-6 w-32 bg-gray-200 rounded mt-6"></div>

            <div className="flex gap-3 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-14 h-10 bg-gray-200 rounded-lg"></div>
              ))}
            </div>

            <div className="h-32 bg-gray-200 rounded-xl mt-6"></div>

            <div className="flex gap-4 mt-6">
              <div className="h-12 flex-1 bg-gray-200 rounded-lg"></div>
              <div className="h-12 w-40 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
        </>}
      </>
    );

  const displayImages = selectedVariant?.images?.length
    ? selectedVariant.images
    : product.images || [];
  const isSareeCategory = product.category?.trim().toLowerCase() === "saree";
  const availableStock = getProductStock(product, selectedVariant, selectedSize);
  const isOutOfStock = availableStock < 1;

  return (
    <>
      <PageHeader
        title={product.category || "Shop"}
        subtitle={product.description || "Step into comfort and style"}
        background="/images/pageheader1.png"
        backgroundPosition="center 54%"
        contentAlignment="left"
        heightClassName="h-[105px] sm:h-[120px] md:h-[135px]"
        titleClassName="text-xl sm:text-2xl"
        subtitleClassName="text-xs sm:text-sm"
        breadcrumbClassName="text-[9px] sm:text-[10px]"
        overlayClassName="bg-gradient-to-r from-black/70 via-black/35 to-transparent"
      />
      <PageContainer className="grid gap-5 py-5 sm:gap-7 sm:py-7 lg:grid-cols-[.9fr_1fr] xl:grid-cols-[.9fr_1fr_210px]">
        {/* LEFT SIDE IMAGES */}
          <div className="min-w-0 lg:h-fit lg:sticky lg:top-24">
          {/* Main Image */}
          <div
            className="relative group w-full mx-auto h-[300px] sm:h-[360px] lg:h-[350px] bg-[#f6f4f1] border border-slate-100 shadow-sm"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            <div className="w-full h-full overflow-hidden">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-[60%_center] transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>

            {zoomed && (
              <div
                className="pointer-events-none absolute top-0 left-full ml-4 w-[420px] h-[350px] border border-gray-200 overflow-hidden z-50 hidden lg:block bg-white shadow-lg"
                style={{
                  backgroundImage: `url(${selectedImage})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${zoomLevel * 100}%`,
                  backgroundPosition: backgroundPosition,
                }}
              ></div>
            )}
          </div>
          {/* Thumbnails */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {displayImages.map((img, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedImage(img)}
                aria-label={`View product image ${index + 1}`}
                className={`h-14 w-14 shrink-0 overflow-hidden border bg-white ${selectedImage === img ? "border-[#ff4b0b] ring-1 ring-[#ff4b0b]" : "border-slate-200"}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover object-[60%_center]" />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE DETAILS */}
        <div className="min-w-0">
          <span className="inline-flex bg-[#ff4b0b] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">{product.subcategory || product.category}</span>
          <h1 className="mt-2 text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl">
            {product.name}
          </h1>

          {reviewStats.total_reviews > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-[#ff4b0b]">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    size={14}
                    className={
                      i < Math.round(reviewStats.average_rating)
                        ? "text-[#ff4b0b]"
                        : "text-gray-200"
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({reviewStats.total_reviews} reviews)
              </span>
            </div>
          )}

          <p className="mt-1 text-xs leading-relaxed text-slate-600">{product.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-black text-[#f04b0b]">
              ₹{Number(product.offer_price || product.price || 0).toLocaleString("en-IN")}
            </span>

            {product.mrp && Number(product.mrp) > Number(product.offer_price) && (
              <span className="text-sm text-gray-400 line-through">
                ₹{Number(product.mrp).toLocaleString("en-IN")}
              </span>
            )}

            {Number(product.offer) > 0 && (
              <span className="bg-[#ff4b0b] px-2 py-1 text-[10px] font-bold text-white">
                {Math.floor(product.offer)}% OFF
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">Inclusive of all taxes</p>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-slate-800">Color: {getVariantColorName(selectedVariant)}</p>

            <div className="flex gap-2 flex-wrap">
              {product?.variants?.map((variant, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Select ${getVariantColorName(variant)} color`}
                  onClick={() => {
                    setSelectedVariant(variant);
                    setSelectedImage(variant.images?.[0] || product.images?.[0] || null);
                    setSelectedSize(variant.selectedSizes?.[0] || null);
                    setQuantity(1);
                  }}
                  className={`flex h-11 w-11 items-center justify-center overflow-hidden border bg-white ${selectedVariant === variant ? "border-[#ff4b0b] ring-1 ring-[#ff4b0b]" : "border-slate-200"}`}
                >
                  {variant.images?.[0] ? (
                    <img src={variant.images[0]} alt="" className="h-full w-full object-cover object-[60%_center]" />
                  ) : (
                    <span className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: variant.color || "#fff" }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {!isSareeCategory && !(selectedVariant?.selectedSizes?.length === 1 && selectedVariant?.selectedSizes[0].toLowerCase() === "free size") && (
              <>
                <p className="mb-2 text-xs font-bold">Size</p>

                <div className="flex gap-1.5 flex-wrap">
                  {selectedVariant?.selectedSizes?.map((size, index) => {
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedSize(size);
                          setQuantity(1);
                        }}
                        className={`min-w-9 border px-2.5 py-1.5 text-xs font-semibold transition
              ${selectedSize === size
                            ? "border-[#ff4b0b] bg-[#ff4b0b] text-white"
                            : "border-gray-300 hover:border-[#ff4b0b]"
                          }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {!isSareeCategory && selectedSize && (
              <p className="mt-2 text-[10px] text-gray-600">
                Stock available:{" "}
                <span className="font-semibold text-emerald-700">
                  {availableStock}
                </span>
              </p>
            )}

            {/* QUANTITY SELECTOR */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold">Quantity</p>

              <div className="flex items-center border border-gray-200 rounded-lg w-fit overflow-hidden">
                <button
                  onClick={decreaseQty}
                  className="px-4 py-2 text-lg font-bold cursor-pointer hover:bg-gray-100"
                >
                  -
                </button>

                <span className="px-5 py-2 font-semibold text-gray-700 border-x border-gray-200">
                  {quantity}
                </span>

                <button
                  onClick={increaseQty}
                  disabled={isOutOfStock || quantity >= availableStock}
                  className="px-4 py-2 text-lg cursor-pointer font-bold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          </div>


            {/* ACTION BUTTONS */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">

            <button
              onClick={() =>
                addToCart(product, selectedVariant, selectedSize, quantity)
              }
              disabled={isOutOfStock}
              className="flex-1 cursor-pointer flex items-center justify-center gap-2 bg-[#ff4b0b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#dc3e08] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <FiShoppingCart size={18} />
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="flex-1 cursor-pointer border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isOutOfStock ? "Out of Stock" : "Buy Now"}
            </button>

            <button
              onClick={() => toggleWishlist(product, selectedVariant)}
              aria-label="Add to wishlist"
              className={`flex items-center justify-center border px-4 py-2.5 transition active:scale-95 ${wishlist.some((w) => w.product_id === product.id)
                ? "border-rose-300 bg-rose-50 text-rose-500"
                : "border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500"
                }`}
            >
              <FiHeart
                size={18}
                className={

                  wishlist.some((w) => w.product_id === product.id)
                    ? "fill-current cursor-pointer"
                    : "cursor-pointer "
                }
              />
              {/* {wishlist.some((w) => w.product_id === product.id)
                ? "Saved"
                : "Wishlist"} */}
            </button>

          </div>

          {/* PRODUCT DETAILS */}
          {/* PRODUCT DETAILS */}
          <div className="hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Product Details
              </h3>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-primary hover:text-primary-dark transition"
              >
                {showDetails ? (
                  <FiChevronUp size={22} />
                ) : (
                  <FiChevronDown size={22} />
                )}
              </button>
            </div>

            {showDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                {product.material && (
                  <>
                    <span className="text-gray-500">Material</span>
                    <span className="font-medium text-gray-800">
                      {product.material}
                    </span>
                  </>
                )}

                {product.color && (
                  <>
                    <span className="text-gray-500">Color</span>
                    <span className="font-medium text-gray-800">
                      {product.color}
                    </span>
                  </>
                )}

                {product.wash_care && (
                  <>
                    <span className="text-gray-500">Wash Care</span>
                    <span className="font-medium text-gray-800">
                      {product.wash_care}
                    </span>
                  </>
                )}

                {product.saree_length && (
                  <>
                    <span className="text-gray-500">Saree Length</span>
                    <span className="font-medium text-gray-800">
                      {product.saree_length}
                    </span>
                  </>
                )}

                {product.blouse_length && (
                  <>
                    <span className="text-gray-500">Blouse Length</span>
                    <span className="font-medium text-gray-800">
                      {product.blouse_length}
                    </span>
                  </>
                )}

                {product.work_type && (
                  <>
                    <span className="text-gray-500">Work Type</span>
                    <span className="font-medium text-gray-800">
                      {product.work_type}
                    </span>
                  </>
                )}

                {product.zari_color && (
                  <>
                    <span className="text-gray-500">Zari Color</span>
                    <span className="font-medium text-gray-800">
                      {product.zari_color}
                    </span>
                  </>
                )}

                {product.top_length && (
                  <>
                    <span className="text-gray-500">Top Length</span>
                    <span className="font-medium text-gray-800">
                      {product.top_length}
                    </span>
                  </>
                )}

                {product.bottom_length && (
                  <>
                    <span className="text-gray-500">Bottom Length</span>
                    <span className="font-medium text-gray-800">
                      {product.bottom_length}
                    </span>
                  </>
                )}

                {product.dupatta_length && (
                  <>
                    <span className="text-gray-500">Dupatta Length</span>
                    <span className="font-medium text-gray-800">
                      {product.dupatta_length}
                    </span>
                  </>
                )}

                {product.gown_length && (
                  <>
                    <span className="text-gray-500">Gown Length</span>
                    <span className="font-medium text-gray-800">
                      {product.gown_length}
                    </span>
                  </>
                )}

                {product.sleeve_type && (
                  <>
                    <span className="text-gray-500">Sleeve Type</span>
                    <span className="font-medium text-gray-800">
                      {product.sleeve_type}
                    </span>
                  </>
                )}

                {product.neck_type && (
                  <>
                    <span className="text-gray-500">Neck Type</span>
                    <span className="font-medium text-gray-800">
                      {product.neck_type}
                    </span>
                  </>
                )}

                {product.fit_type && (
                  <>
                    <span className="text-gray-500">Fit Type</span>
                    <span className="font-medium text-gray-800">
                      {product.fit_type}
                    </span>
                  </>
                )}

                {product.age && (
                  <>
                    <span className="text-gray-500">Age</span>
                    <span className="font-medium text-gray-800">
                      {product.age}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

        
        </div>

        <aside className="min-w-0 lg:col-span-2 xl:col-span-1">
          <div className="space-y-3 xl:sticky xl:top-24">
            <section aria-label="Shopping services" className="bg-[#fffaf6] px-4">
              {[
                [FiTruck, "Free Shipping", "On Orders Above ₹999"],
                [FiPackage, "Easy Returns", "Hassle Free Returns"],
                [FiShield, "100% Original", "Genuine Leather Products"],
                [FiCreditCard, "Cash on Delivery", "Available"],
              ].map(([Icon, title, description], index) => (
                <div key={title} className={`flex min-h-[64px] items-center gap-3 ${index < 3 ? "border-b border-[#f0e4dc]" : ""}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffeddf] text-[#ff4b0b]">
                    <Icon size={19} />
                  </span>
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900">{title}</h2>
                    <p className="mt-0.5 text-[11px] text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </section>

            <section aria-label="StyleHub promise" className="bg-[#fffaf6] p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff4b0b] text-white">
                  <FiCheckCircle size={19} />
                </span>
                <h2 className="text-xs font-extrabold text-slate-900">StyleHub Promise</h2>
              </div>
              <ul className="mt-3 space-y-2 pl-1">
                {["Premium Quality", "Comfort Fit", "Durable & Long Lasting", "Stylish Design", "Trusted by Thousands"].map((promise) => (
                  <li key={promise} className="flex items-center gap-2.5 text-xs text-slate-600">
                    <FiCheck className="shrink-0 text-[#ff4b0b]" size={15} />
                    {promise}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      </PageContainer>
      <PageContainer className="pt-2">
        <section aria-label="Product benefits" className="grid grid-cols-2 gap-px border border-[#f5e8df] bg-[#f5e8df] sm:grid-cols-3 xl:grid-cols-5">
          {[
            ["Quality materials", "Selected for lasting wear"],
            ["Comfort first", "Made for everyday comfort"],
            ["Built to last", "Made for regular use"],
            ["Thoughtful design", "Style for every occasion"],
            ["Easy to wear", "A fit for your routine"],
          ].map(([title, description]) => (
            <div key={title} className="flex min-h-[68px] items-center gap-2.5 bg-[#fffaf6] px-3 py-3 sm:px-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0e6] text-[#ff4b0b]">
                <FiCheck size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold text-slate-900">{title}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <section className="min-w-0 overflow-hidden border border-slate-200 bg-white" aria-label="Product information">
            <div role="tablist" aria-label="Product information tabs" className="flex overflow-x-auto border-b border-slate-100">
              {[
                ["details", "Product Details"],
                ["specifications", "Specifications"],
                ["size", "Size Guide"],
                ["shipping", "Shipping & Returns"],
                ["reviews", `Reviews (${reviewStats.total_reviews})`],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  id={`product-tab-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={activeInfoTab === tab}
                  aria-controls="product-information-panel"
                  onClick={() => setActiveInfoTab(tab)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-[11px] font-bold transition sm:px-5 ${activeInfoTab === tab ? "border-[#ff4b0b] text-[#ff4b0b]" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              id="product-information-panel"
              role="tabpanel"
              aria-labelledby={`product-tab-${activeInfoTab}`}
              className="grid gap-5 p-4 sm:grid-cols-[minmax(0,1fr)_190px] sm:p-5"
            >
              <div>
                {activeInfoTab === "details" && (
                  <>
                    <h2 className="text-base font-extrabold text-slate-900">Product Details</h2>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{product.description || "Thoughtfully selected for quality, comfort, and everyday style."}</p>
                    <ul className="mt-3 space-y-1.5">
                      {[
                        product.material && ["Material", product.material],
                        product.brand && ["Brand", product.brand],
                        product.color && ["Color", product.color],
                        product.wash_care && ["Care instructions", product.wash_care],
                        product.subcategory && ["Style", product.subcategory],
                      ].filter(Boolean).map(([label, value]) => (
                        <li key={label} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600">
                          <FiCheck className="mt-0.5 shrink-0 text-[#ff4b0b]" size={14} />
                          <span><strong className="text-slate-800">{label}:</strong> {value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {activeInfoTab === "specifications" && (
                  <>
                    <h2 className="text-base font-extrabold text-slate-900">Specifications</h2>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                      {[
                        ["Category", product.category],
                        ["Subcategory", product.subcategory],
                        ["Brand", product.brand],
                        ["Material", product.material],
                        ["Color", getVariantColorName(selectedVariant)],
                        ["Product code", product.product_code],
                      ].filter(([, value]) => value).map(([label, value]) => (
                        <div key={label} className="border-b border-slate-100 pb-2">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
                {activeInfoTab === "size" && (
                  <>
                    <h2 className="text-base font-extrabold text-slate-900">Size Guide</h2>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">Available sizes for the selected option:</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedVariant?.selectedSizes || []).map((size) => (
                        <span key={size} className="border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">{size}</span>
                      ))}
                      {!selectedVariant?.selectedSizes?.length && <span className="text-xs text-slate-500">Refer to the available size options above.</span>}
                    </div>
                  </>
                )}
                {activeInfoTab === "shipping" && (
                  <>
                    <h2 className="text-base font-extrabold text-slate-900">Shipping & Returns</h2>
                    <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                      <li className="flex gap-2"><FiTruck className="mt-0.5 shrink-0 text-[#ff4b0b]" /> Delivery availability and charges are confirmed during checkout.</li>
                      <li className="flex gap-2"><FiRotateCcw className="mt-0.5 shrink-0 text-[#ff4b0b]" /> Return eligibility and timelines follow the store return policy.</li>
                      <li className="flex gap-2"><FiShield className="mt-0.5 shrink-0 text-[#ff4b0b]" /> Please keep the product and packaging in original condition for eligible returns.</li>
                    </ul>
                  </>
                )}
                {activeInfoTab === "reviews" && (
                  <>
                    <h2 className="text-base font-extrabold text-slate-900">Customer Reviews</h2>
                    <p className="mt-2 text-xs text-slate-600">{reviewStats.total_reviews ? `${reviewStats.average_rating} out of 5 from ${reviewStats.total_reviews} reviews` : "No reviews have been added yet."}</p>
                    <button type="button" onClick={() => document.getElementById("customer-reviews")?.scrollIntoView({ behavior: "smooth" })} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#ff4b0b] hover:underline">
                      View reviews <FiArrowRight size={13} />
                    </button>
                  </>
                )}
              </div>
              {displayImages[0] && (
                <img src={displayImages[0]} alt={`${product.name} product view`} className="hidden h-[190px] w-full border border-slate-100 object-cover sm:block" />
              )}
            </div>
          </section>
          <RelatedProducts
            category={product.category}
            currentProductId={product.id}
            compact
          />
        </div>
      </PageContainer>

      {/* REVIEW SECTION */}

      <div id="customer-reviews" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-12">
        {/* HEADER */}

        <div className="flex items-center justify-between border-t border-gray-200 pt-10 mb-6">
          <h2 className="text-2xl font-bold text-primary-light">Add Reviews</h2>

          {userReviewed ? (
            <p className="text-green-600 font-semibold">
              You already reviewed this product
            </p>
          ) : (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-6 py-2 rounded-xl font-semibold text-white 
    bg-gradient-to-r from-primary-light to-secondary 
    shadow-md hover:scale-105 transition cursor-pointer"
            >
              {showReviewForm ? "Hide Review Form" : "Write Review"}
            </button>
          )}
        </div>

        {/* REVIEW FORM */}

        {showReviewForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 shadow-sm max-w-4xl">
            <h3 className="text-lg font-semibold mb-6">
              Share your experience
            </h3>

            {/* STAR RATING */}

            <div className="mb-6">
              <p className="font-medium mb-2">Rating</p>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    size={22}
                    className={`cursor-pointer transition
                ${star <= (hoverRating || rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                      }
              `}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>

            {/* REVIEW TEXT */}

            <div className="mb-6">
              <p className="font-medium mb-2">Review</p>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review here..."
                className="w-full border border-gray-300 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="mb-6">
              <p className="font-medium mb-2">Upload Image (optional)</p>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full border border-gray-300 rounded-xl p-2"
              />

              {reviewImage && (
                <img
                  src={resolveImageUrl(reviewImage)}
                  alt="preview"
                  className="mt-4 w-32 h-32 object-cover rounded-lg border"
                />
              )}
            </div>

            {/* SUBMIT BUTTON */}

            <button
              onClick={submitReview}
              disabled={uploadingReviewImage}
              className="bg-gradient-to-r from-primary-light to-secondary text-white 
  px-6 py-3 rounded-xl font-semibold shadow-md hover:scale-105 transition"
            >
              Submit Review
            </button>
          </div>
        )}
      </div>

      {/* REVIEWS LIST & STATS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mb-20 overflow-hidden">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* STATS LEFT */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-bold mb-6">Customer Reviews</h3>

            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-gray-800">
                {reviewStats.average_rating}
              </div>
              <div>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={
                        i < Math.round(reviewStats.average_rating)
                          ? "text-yellow-400"
                          : "text-gray-200"
                      }
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Based on {reviewStats.total_reviews} reviews
                </p>
              </div>
            </div>

            {/* PROGRESS BARS */}
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count =
                  reviewStats[
                  `${star === 5
                    ? "five"
                    : star === 4
                      ? "four"
                      : star === 3
                        ? "three"
                        : star === 2
                          ? "two"
                          : "one"
                  }_star`
                  ] || 0;
                const percentage =
                  reviewStats.total_reviews > 0
                    ? (count / reviewStats.total_reviews) * 100
                    : 0;

                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-3">{star}</span>
                    <FaStar className="text-yellow-400" size={12} />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REVIEWS LIST RIGHT */}
          <div className="lg:col-span-2">
            {loadingReviews ? (
              <div className="animate-pulse space-y-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="border-b pb-6">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((review) => (
                    <article key={review.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">
                            {review.user_name}
                          </h4>
                          <div className="flex text-yellow-400 gap-0.5 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <FaStar
                                key={i}
                                size={14}
                                className={
                                  i < review.rating
                                    ? "text-yellow-400"
                                    : "text-gray-200"
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-gray-600 leading-relaxed italic">
                        "{review.comment}"
                      </p>

                      {review.review_image && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 w-fit">
                          <img
                            src={resolveImageUrl(review.review_image)}
                            alt="Review"
                            className="w-40 h-40 object-cover hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                      )}

                      {review.admin_reply && (
                        <div className="mt-6 bg-primary/5 p-4 rounded-xl border-l-4 border-primary/30">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                            Response from Seller
                          </p>
                          <p className="text-gray-600 text-sm italic">
                            "{review.admin_reply}"
                          </p>
                        </div>
                      )}
                    </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 font-medium">
                  No reviews yet. Be the first to share your experience!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;
