import { useState, useEffect, useCallback, useRef } from "react";
import { Image, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Save, RefreshCw, Upload } from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";

const BANNER_TYPES = ["hero", "offer", "saree", "silks", "popup", "sidebar", "other"];

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  description: "",
  image: "",
  mobile_image: "",
  link: "",
  type: "hero",
  status: "active",
  sort_order: 0,
};

/* ─── tiny helpers ─── */
const badge = (status) =>
  status === "active"
    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
    : "bg-red-100 text-red-600 border border-red-200";

const typePill = (type) =>
  "bg-violet-100 text-violet-700 border border-violet-200";

const resolveBannerImage = (image) => {
  if (!image || !image.startsWith("/uploads/")) return image;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${image}`;
};

/* ════════════════════════════════════════════════════════════════ */
export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [desktopImageFile, setDesktopImageFile] = useState(null);
  const [mobileImageFile, setMobileImageFile] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobilePreview, setMobilePreview] = useState("");
  const desktopPreviewUrl = useRef("");
  const mobilePreviewUrl = useRef("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    return () => {
      if (desktopPreviewUrl.current) URL.revokeObjectURL(desktopPreviewUrl.current);
      if (mobilePreviewUrl.current) URL.revokeObjectURL(mobilePreviewUrl.current);
    };
  }, []);

  const selectDesktopImage = (file) => {
    if (desktopPreviewUrl.current) URL.revokeObjectURL(desktopPreviewUrl.current);
    desktopPreviewUrl.current = file ? URL.createObjectURL(file) : "";
    setDesktopImageFile(file);
    setDesktopPreview(desktopPreviewUrl.current);
  };

  const selectMobileImage = (file) => {
    if (mobilePreviewUrl.current) URL.revokeObjectURL(mobilePreviewUrl.current);
    mobilePreviewUrl.current = file ? URL.createObjectURL(file) : "";
    setMobileImageFile(file);
    setMobilePreview(mobilePreviewUrl.current);
  };

  /* ── fetch ── */
  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/banners");
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  /* ── filtered list ── */
  const filtered = filterType === "all"
    ? banners
    : banners.filter((b) => b.type === filterType);

  /* ── open modal ── */
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    selectDesktopImage(null);
    selectMobileImage(null);
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title:        banner.title        || "",
      subtitle:     banner.subtitle     || "",
      description:  banner.description  || "",
      image:        banner.image        || "",
      mobile_image: banner.mobile_image || "",
      link:         banner.link         || "",
      type:         banner.type         || "hero",
      status:       banner.status       || "active",
      sort_order:   banner.sort_order   ?? 0,
    });
    selectDesktopImage(null);
    selectMobileImage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    selectDesktopImage(null);
    selectMobileImage(null);
  };

  /* ── save ── */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "image" && desktopImageFile) {
          formData.append("image", desktopImageFile);
        } else if (key === "mobile_image" && mobileImageFile) {
          formData.append("mobile_image", mobileImageFile);
        } else {
          formData.append(key, String(value ?? ""));
        }
      });

      if (editingId) {
        await api.put(`/banners/${editingId}`, formData);
        toast.success("Banner updated!");
      } else {
        await api.post("/banners", formData);
        toast.success("Banner created!");
      }
      closeModal();
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  /* ── toggle status ── */
  const toggleStatus = async (banner) => {
    const next = banner.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/banners/${banner.id}/status`, { status: next });
      setBanners((prev) => prev.map((b) => b.id === banner.id ? { ...b, status: next } : b));
      toast.success(`Banner ${next === "active" ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  /* ── delete ── */
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/banners/${deleteId}`);
      setBanners((prev) => prev.filter((b) => b.id !== deleteId));
      toast.success("Banner deleted");
    } catch {
      toast.error("Failed to delete banner");
    } finally {
      setDeleteId(null);
    }
  };

  /* ════════════════════════ RENDER ════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Image className="w-6 h-6 text-violet-600" />
            Promotion Banners
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage hero, offer, and section banners displayed on the storefront.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBanners}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition shadow"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>
      </div>

      {/* ── Type Filter Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {["all", ...BANNER_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition
              ${filterType === t
                ? "bg-violet-600 text-white border-violet-600 shadow"
                : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
              }`}
          >
            {t === "all" ? `All (${banners.length})` : `${t} (${banners.filter(b => b.type === t).length})`}
          </button>
        ))}
      </div>

      {/* ── Banners Table ── */}
      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading banners…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Image className="w-12 h-12 opacity-30" />
            <p className="text-sm">No banners found. Click <strong>Add Banner</strong> to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 w-16">Preview</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Link</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((banner) => (
                  <tr key={banner.id} className="hover:bg-slate-50/60 transition">
                    {/* Preview */}
                    <td className="px-5 py-3">
                      {banner.image ? (
                        <img
                          src={resolveBannerImage(banner.image)}
                          alt={banner.title}
                          className="w-14 h-10 object-cover rounded-lg border border-slate-200 shadow-sm"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Image className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </td>

                    {/* Title + Subtitle */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-slate-800 truncate">{banner.title}</p>
                      {banner.subtitle && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{banner.subtitle}</p>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${typePill(banner.type)}`}>
                        {banner.type}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${badge(banner.status)}`}>
                        {banner.status}
                      </span>
                    </td>

                    {/* Sort order */}
                    <td className="px-4 py-3 text-slate-500 text-center">{banner.sort_order}</td>

                    {/* Link */}
                    <td className="px-4 py-3 max-w-[160px]">
                      {banner.link ? (
                        <a
                          href={banner.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-600 hover:underline text-xs truncate block"
                        >
                          {banner.link}
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle status */}
                        <button
                          onClick={() => toggleStatus(banner)}
                          title={banner.status === "active" ? "Deactivate" : "Activate"}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-violet-600 transition"
                        >
                          {banner.status === "active"
                            ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                            : <ToggleLeft className="w-5 h-5 text-slate-400" />
                          }
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(banner)}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(banner.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════ ADD / EDIT MODAL ════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Edit Banner" : "Add New Banner"}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Summer Sale Collection"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  required
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="e.g. Exclusive Collection"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short banner description (optional)"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>

              {/* Desktop image upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Desktop Image</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => selectDesktopImage(e.target.files?.[0] || null)}
                  className="sr-only"
                  id="banner-desktop-image"
                />
                <label
                  htmlFor="banner-desktop-image"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-violet-400 hover:bg-violet-50/50"
                >
                  <Upload className="h-5 w-5 shrink-0 text-violet-600" />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-700">
                      {desktopImageFile?.name || (form.image ? "Choose a new desktop image" : "Choose desktop image")}
                    </span>
                    <span className="block text-xs text-slate-400">JPG, PNG, WEBP or GIF · max 5 MB</span>
                  </span>
                </label>
                {(desktopPreview || form.image) && (
                  <img
                    src={desktopPreview || resolveBannerImage(form.image)}
                    alt="Desktop banner preview"
                    className="mt-2 h-24 max-w-full rounded-xl border border-slate-200 object-cover"
                  />
                )}
              </div>

              {/* Mobile image upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Image (optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => selectMobileImage(e.target.files?.[0] || null)}
                  className="sr-only"
                  id="banner-mobile-image"
                />
                <label
                  htmlFor="banner-mobile-image"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-violet-400 hover:bg-violet-50/50"
                >
                  <Upload className="h-5 w-5 shrink-0 text-violet-600" />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-700">
                      {mobileImageFile?.name || (form.mobile_image ? "Choose a new mobile image" : "Choose mobile image")}
                    </span>
                    <span className="block text-xs text-slate-400">JPG, PNG, WEBP or GIF · max 5 MB</span>
                  </span>
                </label>
                {(mobilePreview || form.mobile_image) && (
                  <img
                    src={mobilePreview || resolveBannerImage(form.mobile_image)}
                    alt="Mobile banner preview"
                    className="mt-2 h-24 max-w-full rounded-xl border border-slate-200 object-cover"
                  />
                )}
              </div>

              {/* Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CTA Link</label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm(f => ({ ...f, link: e.target.value }))}
                  placeholder="/shop or https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Type + Status + Sort */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {BANNER_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving…" : editingId ? "Update Banner" : "Create Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ DELETE CONFIRM ════════════════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Delete Banner?</h3>
            <p className="text-sm text-slate-500">This action cannot be undone. The banner will be permanently removed.</p>
            <div className="flex gap-3 justify-center pt-1">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
