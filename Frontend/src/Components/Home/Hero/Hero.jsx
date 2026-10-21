import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { StoreContext } from "../../../PrivateRouter/StoreContext";
import api from "../../../api";
import PageContainer from "../../CommenComponents/PageContainer";

/* ─── helpers ─────────────────────────────────────── */
const resolveBannerImage = (image) => {
  if (!image) return null;
  if (/^(https?:|data:|blob:|\/(?!uploads))/i.test(image)) return image;
  const base = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${base}${image.startsWith("/") ? image : `/${image}`}`;
};

const normalizeSlides = (slides) =>
  slides.map((s) => ({
    ...s,
    image:        resolveBannerImage(s.image),
    mobile_image: resolveBannerImage(s.mobile_image),
  }));

/* ─── fallback slides (shown when API returns nothing) */
const DEFAULT_SLIDES = [
  {
    id: "d1",
    title: "GULPOSH",
    subtitle: "Luxury Saree Collection",
    description: "Experience the elegance of traditional craftsmanship.",
    image: "/Hero/download.jpg",
    mobile_image: "/Hero/download.jpg",
    link: "/shop",
  },
  {
    id: "d2",
    title: "ROYAL SAREES",
    subtitle: "Timeless Traditional Elegance",
    description: "A heritage of beauty in every fold.",
    image: "/Hero/images.jpg",
    mobile_image: "/Hero/images.jpg",
    link: "/shop",
  },
];

/* ══════════════════════════════════════════════════════
   HERO COMPONENT
═══════════════════════════════════════════════════════ */
export default function Hero() {
  const { bannersCache, setBannersCache } = useContext(StoreContext);

  const [slides, setSlides]   = useState(bannersCache.hero || []);
  const [loading, setLoading] = useState(!bannersCache.hero);
  const [active, setActive]   = useState(0);
  const [fading, setFading]   = useState(false);
  const timerRef              = useRef(null);

  /* ── fetch hero banners ── */
  useEffect(() => {
    if (bannersCache.hero) {
      setSlides(bannersCache.hero);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res     = await api.get("/banners/type/hero");
        const fetched = Array.isArray(res.data) ? res.data : [];
        const final   = fetched.length > 0 ? normalizeSlides(fetched) : DEFAULT_SLIDES;
        setSlides(final);
        setBannersCache((p) => ({ ...p, hero: final }));
      } catch {
        setSlides(DEFAULT_SLIDES);
      } finally {
        setLoading(false);
      }
    })();
  }, [bannersCache, setBannersCache]);

  /* ── auto-advance ── */
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      goTo("next", true);
    }, 5500);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (slides.length > 1) startTimer();
    return () => clearInterval(timerRef.current);
  }, [slides, startTimer]);

  /* ── slide transition ── */
  const goTo = (dir, auto = false) => {
    if (fading || slides.length < 2) return;
    setFading(true);
    setTimeout(() => {
      setActive((prev) => {
        if (dir === "next") return (prev + 1) % slides.length;
        return (prev - 1 + slides.length) % slides.length;
      });
      setFading(false);
    }, 400);
    if (!auto) startTimer();
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="w-full h-[55vh] bg-gradient-to-br from-slate-900 to-slate-800 animate-pulse flex items-center justify-center">
        <p className="text-slate-500 font-serif italic text-xl tracking-widest">Curating Elegance…</p>
      </div>
    );
  }

  const slide = slides[active] || DEFAULT_SLIDES[0];

  return (
    <section className="relative w-full h-[55vh] md:h-[70vh] overflow-hidden bg-slate-900 select-none">

      {/* ── Background Image ── */}
      {slides.map((s, i) => (
        <picture
          key={s.id ?? i}
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out
            ${i === active && !fading ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        >
          {s.mobile_image && (
            <source media="(max-width: 768px)" srcSet={s.mobile_image} />
          )}
          <img
            src={s.image}
            alt={s.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </picture>
      ))}

      {/* ── Gradient Overlays ── */}
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* ── Decorative Glow ── */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-amber-500/10 blur-[140px] z-20 pointer-events-none" />

      {/* ── Content ── */}
      <div
        className={`absolute inset-0 z-30 flex items-center transition-all duration-500
          ${fading ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}
      >
        <PageContainer>
          <div className="text-white max-w-2xl px-2 md:px-0 space-y-5 md:space-y-7">

            {/* Subtitle pill */}
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-8 bg-amber-400 hidden sm:block" />
              <p className="text-[8px] md:text-[10px] tracking-[4px] md:tracking-[6px] uppercase text-amber-400 font-bold">
                {slide.subtitle || "Premium Collection"}
              </p>
            </div>

            {/* Main title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-light leading-[1.15] tracking-tight">
              {slide.title}
            </h1>

            {/* Description */}
            {slide.description && (
              <p className="hidden md:block text-gray-300 text-base md:text-lg leading-relaxed max-w-lg">
                {slide.description}
              </p>
            )}

            {/* CTA */}
            <div className="flex items-center gap-5 pt-2">
              <Link
                to={slide.link || "/shop"}
                className="group relative inline-flex items-center gap-3 px-8 md:px-12 py-3.5 md:py-4
                  border border-white/30 text-white text-xs font-bold tracking-[0.3em] uppercase
                  overflow-hidden transition-all duration-500
                  hover:border-amber-400 hover:shadow-[0_0_40px_rgba(251,191,36,0.15)]"
              >
                <span className="absolute inset-0 bg-white translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 ease-in-out" />
                <span className="relative z-10 group-hover:text-black transition-colors duration-300">
                  Explore Collection
                </span>
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center border border-amber-400 bg-amber-400 px-8 md:px-10 py-3.5 md:py-4
                  text-xs font-bold tracking-[0.3em] uppercase text-slate-950
                  transition-all duration-300 hover:border-amber-300 hover:bg-amber-300"
              >
                Shop Now
              </Link>
            </div>

          </div>
        </PageContainer>
      </div>

      {/* ── Dot Indicators ── */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i !== active) {
                  setFading(true);
                  setTimeout(() => { setActive(i); setFading(false); }, 400);
                  startTimer();
                }
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-500
                ${i === active
                  ? "w-8 h-2 bg-amber-400"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
            />
          ))}
        </div>
      )}

      {/* ── Slide Counter ── */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 right-6 md:right-10 z-40 text-white/40 text-xs font-mono tracking-widest">
          {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>
      )}

    </section>
  );
}
