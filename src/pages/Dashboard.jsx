import { useMemo, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getInventory } from "../api/apiFunctions";
import { useAuth } from "./Authcontext";

const STATUS_STYLES = {
  "In Stock":     "bg-black text-white",
  "Low Stock":    "bg-gray-200 text-gray-700",
  "Out of Stock": "bg-gray-100 text-gray-400",
};

const CATEGORY_COLORS = {
  Breads:   "bg-amber-50 text-amber-700 border-amber-200",
  Pastries: "bg-rose-50 text-rose-700 border-rose-200",
  Muffins:  "bg-blue-50 text-blue-700 border-blue-200",
  Cakes:    "bg-purple-50 text-purple-700 border-purple-200",
  Cookies:  "bg-orange-50 text-orange-700 border-orange-200",
};

const WEEK_LABELS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKLY_SALES  = [820, 940, 760, 1100, 980, 1240, 1380]; // simulated

function DonutChart({ segments, size = 80 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = 30, cx = 40, cy = 40, circ = 2 * Math.PI * r;
  let cumulative = 0;
  const slices = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const dash = fraction * circ;
    const offset = circ - cumulative * circ;
    cumulative += fraction;
    return { ...seg, dash, offset };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={10} />
      {slices.map((seg, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={10}
          strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
          strokeDashoffset={seg.offset}
          transform={`rotate(-90 ${cx} ${cy})`} />
      ))}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#111">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="#9ca3af">items</text>
    </svg>
  );
}

function SkeletonBlock({ className }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;
}

export default function Dashboard() {
  console.log("Dashboard_________")

  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getInventory();
        setInventory(data);
      } catch (err) {
        setError("Failed to load inventory.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    if (!inventory.length) return { totalItems: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalStockValue: 0, totalRetailValue: 0, avgMargin: 0, byCategory: [], topValue: [], urgent: [], expiringItems: [] };
    const totalItems    = inventory.length;
    const inStock       = inventory.filter((i) => i.status === "In Stock").length;
    const lowStock      = inventory.filter((i) => i.status === "Low Stock").length;
    const outOfStock    = inventory.filter((i) => i.status === "Out of Stock").length;
    const totalStockValue  = inventory.reduce((s, i) => s + i.stock * i.costPrice, 0);
    const totalRetailValue = inventory.reduce((s, i) => s + i.stock * i.sellPrice, 0);
    const avgMargin = inventory.reduce((s, i) => s + (i.sellPrice > 0 ? ((i.sellPrice - i.costPrice) / i.sellPrice) * 100 : 0), 0) / totalItems;
    const totalStock = inventory.reduce((s, i) => s + i.stock, 0);
    const byCategory = ["Breads","Pastries","Muffins","Cakes","Cookies"].map((cat) => {
      const items = inventory.filter((i) => i.category === cat);
      return { name: cat, stock: items.reduce((s, i) => s + i.stock, 0), pct: totalStock > 0 ? Math.round((items.reduce((s, i) => s + i.stock, 0) / totalStock) * 100) : 0 };
    });
    const topValue      = [...inventory].sort((a, b) => b.stock * b.sellPrice - a.stock * a.sellPrice).slice(0, 5);
    const urgent        = inventory.filter((i) => i.status === "Low Stock" || i.status === "Out of Stock");
    const expiringItems = [...inventory].filter((i) => i.stock > 0).sort((a, b) => new Date(a.expiry) - new Date(b.expiry)).slice(0, 4);
    return { totalItems, inStock, lowStock, outOfStock, totalStockValue, totalRetailValue, avgMargin, byCategory, topValue, urgent, expiringItems };
  }, [inventory]);

  const maxSales = Math.max(...WEEKLY_SALES);
  const today    = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-white">
      <div className="container p-4 mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">{today}</p>
          </div>
          {user?.isAdmin && (
            <NavLink to="/add-stock"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              + New Item
            </NavLink>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {loading ? Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <SkeletonBlock className="h-3 w-20 mb-3" /><SkeletonBlock className="h-7 w-12" />
            </div>
          )) : (
            <>
              <StatCard label="Total Items"   value={stats.totalItems}                     sub={`${stats.inStock} in stock`} />
              <StatCard label="Stock Value"   value={`₱${stats.totalStockValue.toFixed(0)}`} sub="at cost" />
              <StatCard label="Retail Value"  value={`₱${stats.totalRetailValue.toFixed(0)}`} sub="at sell price" dark />
              <StatCard label="Avg Margin"    value={`${stats.avgMargin.toFixed(1)}%`}     sub="across all items" />
            </>
          )}
        </div>

        {/* Stock Health + Weekly Sales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Stock Health</p>
            {loading ? <SkeletonBlock className="h-24 w-full" /> : (
              <div className="flex items-center gap-6 flex-1">
                <DonutChart segments={[
                  { value: stats.inStock,    color: "#111" },
                  { value: stats.lowStock,   color: "#d1d5db" },
                  { value: stats.outOfStock, color: "#e5e7eb" },
                ]} size={90} />
                <div className="space-y-2 text-xs">
                  {[["In Stock", stats.inStock, "bg-black"], ["Low Stock", stats.lowStock, "bg-gray-300"], ["Out of Stock", stats.outOfStock, "bg-gray-100 border border-gray-200"]].map(([label, val, dot]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dot} inline-block shrink-0`} />
                      <span className="text-gray-500">{label}</span>
                      <span className="ml-auto font-bold text-gray-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Weekly Sales</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">₱{WEEKLY_SALES.reduce((a, b) => a + b, 0).toLocaleString()}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">This week</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {WEEKLY_SALES.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t transition-all" style={{ height: `${(val / maxSales) * 48}px`, background: i === WEEKLY_SALES.length - 1 ? "#111" : "#e5e7eb" }} />
                  <span className="text-[10px] text-gray-400">{WEEK_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category + Alerts + Expiring */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">By Category</p>
            {loading ? <SkeletonBlock className="h-32 w-full" /> : (
              <div className="space-y-2">
                {stats.byCategory.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat.name]}`}>{cat.name}</span>
                      <span className="text-xs text-gray-400 font-mono">{cat.stock} units</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Needs Attention</p>
              <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">{stats.urgent.length}</span>
            </div>
            {loading ? <SkeletonBlock className="h-32 w-full" /> : (
              <div className="space-y-2">
                {stats.urgent.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{item.id}</p>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${STATUS_STYLES[item.status]}`}>
                      {item.status === "Out of Stock" ? "OOS" : "Low"}
                    </span>
                  </div>
                ))}
                {stats.urgent.length > 5 && <p className="text-xs text-gray-400 text-center pt-1">+{stats.urgent.length - 5} more</p>}
                {stats.urgent.length === 0 && <p className="text-xs text-gray-400">All items look good ✓</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Expiring Soon</p>
            {loading ? <SkeletonBlock className="h-32 w-full" /> : (
              <div className="space-y-2">
                {stats.expiringItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.expiry}</p>
                    </div>
                    <span className="text-xs text-gray-500 font-mono shrink-0 ml-2">{item.stock} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Top 5 Items by Stock Value</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{Array(5).fill(0).map((_, i) => <SkeletonBlock key={i} className="h-8 w-full" />)}</div>
          ) : (
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 uppercase tracking-wider">
                  <th className="p-3 font-semibold">Item</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold text-right">Stock</th>
                  <th className="p-3 font-semibold text-right">Sell Price</th>
                  <th className="p-3 font-semibold text-right">Value</th>
                  <th className="p-3 font-semibold text-right">Margin</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.topValue.map((item) => {
                  const value  = item.stock * item.sellPrice;
                  const margin = item.sellPrice > 0 ? (((item.sellPrice - item.costPrice) / item.sellPrice) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-semibold text-gray-800">{item.name}</td>
                      <td className="p-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[item.category]}`}>{item.category}</span></td>
                      <td className="p-3 text-right font-bold text-gray-800">{item.stock}</td>
                      <td className="p-3 text-right text-gray-500">₱{item.sellPrice.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-gray-800">₱{value.toFixed(0)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full" style={{ width: `${Math.min(100, parseFloat(margin))}%` }} />
                          </div>
                          <span className="text-gray-600">{margin}%</span>
                        </div>
                      </td>
                      <td className="p-3"><span className={`px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[item.status]}`}>{item.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, sub, dark = false }) {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${dark ? "bg-black border-black" : "bg-white border-gray-200"}`}>
      <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-400"}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${dark ? "text-white" : "text-gray-800"}`}>{value}</p>
      <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{sub}</p>
    </div>
  );
}