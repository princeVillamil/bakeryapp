import { useState, useEffect } from "react";
import { addSale, getInventory } from "../api/apiFunctions";
import { NavLink } from "react-router-dom";

export default function AddSale() {
  const [inventory, setInventory] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    note: "",
    items: [{ inventoryId: "", name: "", category: "", qty: 1, unitPrice: "" }],
  });

  useEffect(() => {
    getInventory().then(setInventory).catch(console.error);
  }, []);

  function setItem(idx, field, value) {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "inventoryId") {
        const inv = inventory.find(i => i.id === value);
        if (inv) {
          items[idx].name      = inv.name;
          items[idx].category  = inv.category;
          items[idx].unitPrice = inv.sellPrice ?? "";
        } else {
          items[idx].name      = "";
          items[idx].category  = "";
          items[idx].unitPrice = "";
        }
      }
      return { ...f, items };
    });
    setErrors(e => ({ ...e, items: undefined }));
  }

  function addItem() {
    setForm(f => ({
      ...f,
      items: [...f.items, { inventoryId: "", name: "", category: "", qty: 1, unitPrice: "" }],
    }));
  }

  function removeItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function validate() {
    const e = {};
    if (!form.date) e.date = "Date is required.";
    const hasEmpty = form.items.some(i => !i.inventoryId || !i.qty || i.unitPrice === "");
    if (hasEmpty) e.items = "All items must have a product, quantity, and price.";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setIsLoading(true);
    try {
      const saved = await addSale(form);
      setSavedId(saved.id);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setForm({
      date: new Date().toISOString().split("T")[0],
      note: "",
      items: [{ inventoryId: "", name: "", category: "", qty: 1, unitPrice: "" }],
    });
    setErrors({});
    setSubmitted(false);
    setSavedId(null);
  }

  const total = form.items.reduce((s, i) => s + (i.qty || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const filledItems = form.items.filter(i => i.inventoryId);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              stroke="white" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black mb-1">Sale Recorded</h2>
          <p className="text-sm text-gray-400 mb-2">
            Transaction <span className="font-mono text-gray-500">{savedId?.slice(0, 8)}…</span> has been saved.
          </p>
          <p className="text-lg font-bold text-black mb-6">
            ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600">
              + Add Another
            </button>
            <NavLink to="/sales"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              View Sales Report
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <div className="container p-4 mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black tracking-tight">Record Sale</h1>
          <p className="text-sm text-gray-400 mt-1">Log a new sales transaction</p>
        </div>

        {/* Date preview strip */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Transaction Date</p>
            <p className="font-mono font-bold text-gray-800 mt-0.5">
              {form.date
                ? new Date(form.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "—"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
            <p className="font-mono font-bold text-gray-800 mt-0.5">
              ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="space-y-4">

          {/* Date + Note */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Date <span className="text-black">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => {
                    setForm(f => ({ ...f, date: e.target.value }));
                    setErrors(er => ({ ...er, date: undefined }));
                  }}
                  className={`w-full sm:w-48 px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                    errors.date ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                />
                {errors.date && <p className="text-xs text-red-400 mt-1.5">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Note <span className="text-gray-300 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. Morning shift, catering order…"
                  className="w-full px-3 py-2 text-sm text-black border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>

            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs text-gray-400 uppercase tracking-wider">
                Items <span className="text-black">*</span>
              </label>
              <button onClick={addItem}
                className="text-[11px] font-semibold text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-black hover:text-white transition-all">
                + Add item
              </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-1 mb-1">
              <span className="col-span-5 text-[10px] text-gray-400 uppercase tracking-wider">Product</span>
              <span className="col-span-3 text-[10px] text-gray-400 uppercase tracking-wider">Qty</span>
              <span className="col-span-3 text-[10px] text-gray-400 uppercase tracking-wider">Unit Price</span>
            </div>

            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={idx}>
                  <div className="grid grid-cols-12 gap-2 items-center">

                    {/* Product */}
                    <div className="col-span-5">
                      <select
                        value={item.inventoryId}
                        onChange={e => setItem(idx, "inventoryId", e.target.value)}
                        className={`w-full text-xs border rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-black bg-white text-black transition-all ${
                          errors.items && !item.inventoryId ? "border-red-300 bg-red-50" : "border-gray-200"
                        }`}
                      >
                        <option value="">Select item…</option>
                        {inventory.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Qty */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        placeholder="0"
                        onChange={e => setItem(idx, "qty", +e.target.value)}
                        className={`w-full text-xs border rounded-lg px-2 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black transition-all ${
                          errors.items && !item.qty ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
                        }`}
                      />
                    </div>

                    {/* Price */}
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-2 flex items-center text-gray-400 text-xs">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          placeholder="0.00"
                          onChange={e => setItem(idx, "unitPrice", e.target.value)}
                          className={`w-full text-xs border rounded-lg pl-5 pr-2 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black transition-all ${
                            errors.items && item.unitPrice === "" ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex justify-center">
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-400 text-sm transition-colors leading-none">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtotal row */}
                  {item.inventoryId && (
                    <div className="flex items-center justify-between px-1 mt-1">
                      <span className="text-[10px] text-gray-400">{item.name}</span>
                      <span className="text-[10px] font-semibold text-gray-600">
                        subtotal: ₱{((item.qty || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="text-xs text-red-400 mt-2">{errors.items}</p>
            )}
          </div>

          {/* Total preview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Order Total</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {filledItems.length} product{filledItems.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {form.items.reduce((s, i) => s + (i.qty || 0), 0)} units total
                </p>
              </div>
            </div>

            {/* Per-item breakdown bar */}
            {filledItems.length > 1 && (
              <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                {filledItems.map((item, i) => {
                  const sub = (item.qty || 0) * (parseFloat(item.unitPrice) || 0);
                  const pct = total > 0 ? (sub / total) * 100 : 0;
                  return (
                    <div key={i} className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: i % 2 === 0 ? "#111" : "#d1d5db" }} />
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <button onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-white transition-colors">
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-6 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Sale →"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}