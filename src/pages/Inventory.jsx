import { useState, useMemo, useEffect } from "react";
import { getInventory, addInventory, updateInventory, deleteInventory, generateId } from "../api/apiFunctions";
import { useAuth } from "./Authcontext";

const ITEMS_PER_PAGE = 15;
const ALL_CATEGORIES = ["All", "Breads", "Pastries", "Muffins", "Cakes", "Cookies"];
const ALL_STATUSES   = ["All", "In Stock", "Low Stock", "Out of Stock"];
const ALL_UNITS      = ["loaf", "pc", "whole", "slice", "dozen", "kg", "g"];

const CATEGORY_COLORS = {
  Breads:   "bg-amber-50 text-amber-700 border-amber-200",
  Pastries: "bg-rose-50 text-rose-700 border-rose-200",
  Muffins:  "bg-blue-50 text-blue-700 border-blue-200",
  Cakes:    "bg-purple-50 text-purple-700 border-purple-200",
  Cookies:  "bg-orange-50 text-orange-700 border-orange-200",
};

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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-black">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-lg">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: "", category: "Breads", stock: "", unit: "pc", costPrice: "", sellPrice: "", expiry: "" };

function ItemForm({ initial = EMPTY_FORM, onSave, onCancel, isEdit = false }) {
  const [form,   setForm]   = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (f, v) => { setForm((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) e.stock = "Enter a valid stock.";
    if (!form.costPrice || isNaN(Number(form.costPrice)) || Number(form.costPrice) <= 0) e.costPrice = "Enter a valid cost price.";
    if (!form.sellPrice || isNaN(Number(form.sellPrice)) || Number(form.sellPrice) <= 0) e.sellPrice = "Enter a valid sell price.";
    if (!form.expiry) e.expiry = "Expiry date is required.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        stock:     parseInt(form.stock),
        costPrice: parseFloat(form.costPrice),
        sellPrice: parseFloat(form.sellPrice),
        status:    deriveStatus(form.stock),
        expiry:    form.expiry && form.expiry.includes("-")
          ? new Date(form.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : form.expiry,
      });
    } finally { setSaving(false); }
  };

  const Field = ({ label, field, type = "text", placeholder }) => (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label} <span className="text-black">*</span></label>
      <input type={type} value={form[field] ?? ""} onChange={(e) => set(field, e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors[field] ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
      {errors[field] && <p className="text-xs text-red-400 mt-1">{errors[field]}</p>}
    </div>
  );

  const Pills = ({ label, field, opts }) => (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button key={o} onClick={() => set(field, o)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${form[field] === o ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Field label="Item Name" field="name" placeholder="e.g. Chocolate Croissant" />
      <Pills label="Category" field="category" opts={["Breads","Pastries","Muffins","Cakes","Cookies"]} />
      <Pills label="Unit"     field="unit"     opts={ALL_UNITS} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock"      field="stock"     type="number" placeholder="0" />
        <Field label="Cost Price" field="costPrice" type="number" placeholder="0.00" />
      </div>
      <Field label="Sell Price"  field="sellPrice" type="number" placeholder="0.00" />
      <Field label="Expiry Date" field="expiry"    type="date" />
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
          {saving ? "Saving..." : isEdit ? "Save Changes →" : "Add Item →"}
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({ item, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-800 mb-1">Remove {item.name}?</h3>
      <p className="text-xs text-gray-400 mb-5">This permanently deletes <span className="font-mono">{item.id}</span> from inventory.</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        <button disabled={loading} onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
          className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
          {loading ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}

function SkeletonRow({ cols }) {
  return (
    <tr>{Array(cols).fill(0).map((_, i) => (
      <td key={i} className="p-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
    ))}</tr>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const [inventory,      setInventory]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [page,           setPage]           = useState(1);
  const [modal,          setModal]          = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setInventory(data);
    } catch (err) { setError("Failed to load inventory."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => inventory.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)) &&
      (categoryFilter === "All" || item.category === categoryFilter) &&
      (statusFilter   === "All" || item.status   === statusFilter)
    );
  }), [inventory, search, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const resetPage  = () => setPage(1);

  const totalItems = inventory.length;
  const lowStock   = inventory.filter((i) => i.status === "Low Stock").length;
  const outOfStock = inventory.filter((i) => i.status === "Out of Stock").length;
  const totalValue = inventory.reduce((s, i) => s + i.stock * i.costPrice, 0);

  const handleAdd = async (form) => {
    try {
      const newId   = await generateId();
      const newItem = await addInventory({ ...form, id: newId });
      setInventory((prev) => [...prev, newItem]);
      setModal(null);
    } catch (err) { setError("Failed to add item. " + err.message); }
  };

  const handleEdit = async (form) => {
    try {
      const updated = await updateInventory(modal.item.id, form);
      setInventory((prev) => prev.map((i) => i.id === updated.id ? updated : i));
      setModal(null);
    } catch (err) { setError("Failed to update item. " + err.message); }
  };

  const handleDelete = async () => {
    try {
      await deleteInventory(modal.item.id);
      setInventory((prev) => prev.filter((i) => i.id !== modal.item.id));
      setModal(null);
    } catch (err) { setError("Failed to delete item. " + err.message); }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Modals */}
      {modal?.type === "add" && (
        <Modal title="Add Inventory Item" onClose={() => setModal(null)}>
          <ItemForm onSave={handleAdd} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "edit" && (
        <Modal title="Edit Item" onClose={() => setModal(null)}>
          <ItemForm initial={modal.item} onSave={handleEdit} onCancel={() => setModal(null)} isEdit />
        </Modal>
      )}
      {modal?.type === "view" && (
        <Modal title="Item Details" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-800">{modal.item.name}</p>
                <p className="text-xs font-mono text-gray-400">{modal.item.id}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[modal.item.status]}`}>{modal.item.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ["Category",   modal.item.category],
                ["Stock",      `${modal.item.stock} ${modal.item.unit}`],
                ["Cost Price", `₱${modal.item.costPrice?.toFixed(2)}`],
                ["Sell Price", `₱${modal.item.sellPrice?.toFixed(2)}`],
                ["Expiry",     modal.item.expiry],
                ["Value",      `₱${(modal.item.stock * modal.item.sellPrice).toFixed(2)}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 uppercase tracking-wider text-[10px]">{label}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            {user?.isAdmin && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal({ type: "edit", item: modal.item })}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">Edit</button>
                <button onClick={() => setModal({ type: "delete", item: modal.item })}
                  className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">Remove</button>
              </div>
            )}
          </div>
        </Modal>
      )}
      {modal?.type === "delete" && (
        <Modal title="Confirm Removal" onClose={() => setModal(null)}>
          <DeleteConfirm item={modal.item} onConfirm={handleDelete} onCancel={() => setModal(null)} />
        </Modal>
      )}

      <div className="container p-4 mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Bakery Inventory</h1>
            <p className="text-sm text-gray-400 mt-1">Manage baked goods stock</p>
          </div>
          {user?.isAdmin && (
            <button onClick={() => setModal({ type: "add" })}
              className="px-4 py-2 text-xs font-semibold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              + Add Item
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{totalItems}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Low Stock</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{lowStock}</p>
          </div>
          <div className="bg-black rounded-xl p-4 border border-black shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-white mt-1">{outOfStock}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Stock Value</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">₱{totalValue.toFixed(0)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="relative mb-3">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            </span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Search by item name or ID..."
              className="w-full pl-9 pr-4 py-2 text-sm text-black border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => { setCategoryFilter(cat); resetPage(); }}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${categoryFilter === cat ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <button key={s} onClick={() => { setStatusFilter(s); resetPage(); }}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${statusFilter === s ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          Showing {paginated.length} of {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 uppercase tracking-wider">
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">Item</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold text-right">Stock</th>
                <th className="p-3 font-semibold text-right">Cost</th>
                <th className="p-3 font-semibold text-right">Sell Price</th>
                <th className="p-3 font-semibold">Expiry</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array(8).fill(0).map((_, i) => <SkeletonRow key={i} cols={9} />)
                : paginated.length > 0
                  ? paginated.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-mono text-gray-400">{item.id}</td>
                      <td className="p-3 font-semibold text-gray-800">{item.name}</td>
                      <td className="p-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[item.category]}`}>{item.category}</span></td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${item.stock === 0 ? "text-gray-300" : item.stock <= 5 ? "text-gray-500" : "text-gray-800"}`}>{item.stock}</span>
                      </td>
                      <td className="p-3 text-right text-gray-500">₱{item.costPrice?.toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold text-gray-800">₱{item.sellPrice?.toFixed(2)}</td>
                      <td className="p-3 text-gray-500">{item.expiry}</td>
                      <td className="p-3"><span className={`px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[item.status]}`}>{item.status}</span></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setModal({ type: "view", item })}
                            className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-black transition-colors">
                            View
                          </button>
                          {user?.isAdmin && (
                            <>
                              <button onClick={() => setModal({ type: "edit", item })}
                                className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors">
                                Edit
                              </button>
                              <button onClick={() => setModal({ type: "delete", item })}
                                className="px-2.5 py-1 text-[11px] font-medium text-gray-400 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                  : (
                    <tr><td colSpan={9} className="p-10 text-center text-gray-400">No items found.</td></tr>
                  )
              }
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed">← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${page === p ? "bg-black text-white border-black" : "border-gray-200 text-gray-600 hover:border-black"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}