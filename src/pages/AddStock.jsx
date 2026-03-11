import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { addInventory, generateId } from "../api/apiFunctions";
import { useAuth } from "./Authcontext";

const ALL_CATEGORIES = ["Breads", "Pastries", "Muffins", "Cakes", "Cookies"];
const ALL_UNITS      = ["loaf", "pc", "whole", "slice", "dozen", "kg", "g"];

const STATUS_STYLES = {
  "In Stock":     "bg-black text-white",
  "Low Stock":    "bg-gray-200 text-gray-700",
  "Out of Stock": "bg-gray-100 text-gray-400",
};

function deriveStatus(stock) {
  const s = parseInt(stock);
  if (isNaN(s) || s === 0) return "Out of Stock";
  if (s <= 5) return "Low Stock";
  return "In Stock";
}

export default function AddStock() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Wait for auth to resolve before checking role — avoids premature redirect
  useEffect(() => {
    if (!isLoading && user && !user.isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const [form, setForm] = useState({
    name: "", category: "Breads", stock: "", unit: "pc", costPrice: "", sellPrice: "", expiry: "",
  });
  const [errors,      setErrors]      = useState({});
  const [submitted,   setSubmitted]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [serverError, setServerError] = useState(null);
  const [generatedId, setGeneratedId] = useState("");

  useEffect(() => {
    generateId().then(setGeneratedId).catch(() => setGeneratedId("BKR-???"));
  }, []);

  const derivedStatus = deriveStatus(form.stock);
  const margin = form.costPrice && form.sellPrice
    ? (((parseFloat(form.sellPrice) - parseFloat(form.costPrice)) / parseFloat(form.sellPrice)) * 100).toFixed(1)
    : null;

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
    setServerError(null);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Item name is required.";
    if (form.stock === "" || isNaN(Number(form.stock)) || Number(form.stock) < 0) e.stock = "Enter a valid stock quantity.";
    if (!form.costPrice || isNaN(Number(form.costPrice)) || Number(form.costPrice) <= 0) e.costPrice = "Enter a valid cost price.";
    if (!form.sellPrice || isNaN(Number(form.sellPrice)) || Number(form.sellPrice) <= 0) e.sellPrice = "Enter a valid sell price.";
    if (!form.expiry) e.expiry = "Expiry date is required.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    setServerError(null);
    try {
      await addInventory({
        id:        generatedId,
        name:      form.name.trim(),
        category:  form.category,
        stock:     parseInt(form.stock),
        unit:      form.unit,
        costPrice: parseFloat(form.costPrice),
        sellPrice: parseFloat(form.sellPrice),
        expiry:    new Date(form.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status:    derivedStatus,
      });
      setSubmitted(true);
    } catch (err) {
      setServerError(err.message || "Failed to add item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ name: "", category: "Breads", stock: "", unit: "pc", costPrice: "", sellPrice: "", expiry: "" });
    setErrors({});
    setSubmitted(false);
    setServerError(null);
    generateId().then(setGeneratedId).catch(() => setGeneratedId("BKR-???"));
  };

  // Show spinner while auth is resolving
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black mb-1">Stock Item Created</h2>
          <p className="text-sm text-gray-400 mb-6">
            <span className="font-mono text-gray-600">{generatedId}</span> has been added to inventory.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleReset}
              className="px-5 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 transition-colors">
              + Add Another
            </button>
            <NavLink to="/inventory"
              className="px-5 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
              View Inventory
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container p-4 mx-auto max-w-xl">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black tracking-tight">New Stock Item</h1>
          <p className="text-sm text-gray-400 mt-1">Add a new baked good to the inventory</p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{serverError}</div>
        )}

        {/* ID Preview */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Auto-assigned ID</p>
            <p className="font-mono font-bold text-gray-800 mt-0.5">{generatedId || "—"}</p>
          </div>
          <div className="ml-auto">
            <span className={`px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[derivedStatus]}`}>{derivedStatus}</span>
          </div>
        </div>

        <div className="space-y-4">

          {/* Item Name */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Item Name <span className="text-black">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sourdough Bread"
              className={`w-full px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.name ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
            {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name}</p>}
          </div>

          {/* Category + Unit */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => set("category", cat)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${form.category === cat ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Unit</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_UNITS.map((u) => (
                    <button key={u} onClick={() => set("unit", u)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${form.unit === u ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Stock Quantity <span className="text-black">*</span></label>
            <div className="flex items-center gap-3">
              <input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0"
                className={`w-32 px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.stock ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
              <span className="text-xs text-gray-400">{form.unit}</span>
              {form.stock !== "" && (
                <span className={`ml-auto px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[derivedStatus]}`}>{derivedStatus}</span>
              )}
            </div>
            {errors.stock && <p className="text-xs text-red-400 mt-1.5">{errors.stock}</p>}
            <p className="text-xs text-gray-400 mt-2">0 = Out of Stock · 1–5 = Low Stock · 6+ = In Stock</p>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">Pricing <span className="text-black">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Cost Price</p>
                <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.costPrice ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
                {errors.costPrice && <p className="text-xs text-red-400 mt-1">{errors.costPrice}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Sell Price</p>
                <input type="number" min="0" step="0.01" value={form.sellPrice} onChange={(e) => set("sellPrice", e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.sellPrice ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
                {errors.sellPrice && <p className="text-xs text-red-400 mt-1">{errors.sellPrice}</p>}
              </div>
            </div>
            {margin !== null && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, parseFloat(margin)))}%` }} />
                </div>
                <p className="text-xs text-gray-500 shrink-0"><span className="font-semibold text-gray-800">{margin}%</span> margin</p>
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Expiry Date <span className="text-black">*</span></label>
            <input type="date" value={form.expiry} onChange={(e) => set("expiry", e.target.value)}
              className={`w-full sm:w-48 px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.expiry ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
            {errors.expiry && <p className="text-xs text-red-400 mt-1.5">{errors.expiry}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <button onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
              Reset
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 sm:flex-none px-6 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
              {saving ? "Adding..." : "Add to Inventory →"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}