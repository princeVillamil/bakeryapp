import { useMemo, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getInventory } from "../api/apiFunctions";

const STATUS_STYLES = {
  "In Stock": "bg-black text-white",
  "Low Stock": "bg-gray-200 text-gray-700",
  "Out of Stock": "bg-gray-100 text-gray-400",
};

const CATEGORY_COLORS = {
  Breads: "bg-amber-50 text-amber-700 border-amber-200",
  Pastries: "bg-rose-50 text-rose-700 border-rose-200",
  Muffins: "bg-blue-50 text-blue-700 border-blue-200",
  Cakes: "bg-purple-50 text-purple-700 border-purple-200",
  Cookies: "bg-orange-50 text-orange-700 border-orange-200",
};

// Sparkline bar chart using SVG
function SparkBars({ data, color = "#000" }) {
  const max = Math.max(...data);
  return (
    <svg viewBox={`0 0 ${data.length * 10} 32`} className="w-full h-8" preserveAspectRatio="none">
      {data.map((v, i) => (
        <rect
          key={i}
          x={i * 10 + 1}
          y={32 - (v / max) * 28}
          width={7}
          height={(v / max) * 28}
          rx={1.5}
          fill={color}
          opacity={i === data.length - 1 ? 1 : 0.2 + (i / data.length) * 0.5}
        />
      ))}
    </svg>
  );
}

// Donut chart
function DonutChart({ segments, size = 80 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = 30;
  const cx = 40;
  const cy = 40;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;
  const slices = segments.map((seg) => {
    const fraction = seg.value / total;
    const dash = fraction * circ;
    const offset = circ - cumulative * circ;
    cumulative += fraction;
    return { ...seg, dash, offset };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={10} />
      {slices.map((seg, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={10}
          strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
          strokeDashoffset={seg.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#111">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="#9ca3af">
        items
      </text>
    </svg>
  );
}

// Simulated weekly sales data
const weeklySales = [820, 940, 760, 1100, 980, 1240, 1380];
const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Dashboard() {
  // const inventory = initialInventory;
  const [inventory, setInventory] = useState([]);
  
  useEffect(() => {
    const loadInventory = async () => {
      const data = await getInventory();
      setInventory(data);
    };

    loadInventory();
  }, []);

  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const inStock = inventory.filter((i) => i.status === "In Stock").length;
    const lowStock = inventory.filter((i) => i.status === "Low Stock").length;
    const outOfStock = inventory.filter((i) => i.status === "Out of Stock").length;
    const totalStockValue = inventory.reduce((s, i) => s + i.stock * i.costPrice, 0);
    const totalRetailValue = inventory.reduce((s, i) => s + i.stock * i.sellPrice, 0);
    const avgMargin =
      inventory.reduce((s, i) => {
        const m = i.sellPrice > 0 ? ((i.sellPrice - i.costPrice) / i.sellPrice) * 100 : 0;
        return s + m;
      }, 0) / inventory.length;

    const byCategory = ["Breads", "Pastries", "Muffins", "Cakes", "Cookies"].map((cat) => ({
      name: cat,
      count: inventory.filter((i) => i.category === cat).length,
      stock: inventory.filter((i) => i.category === cat).reduce((s, i) => s + i.stock, 0),
      value: inventory.filter((i) => i.category === cat).reduce((s, i) => s + i.stock * i.sellPrice, 0),
    }));

    const topValue = [...inventory]
      .sort((a, b) => b.stock * b.sellPrice - a.stock * a.sellPrice)
      .slice(0, 5);

    const urgent = inventory.filter(
      (i) => i.status === "Low Stock" || i.status === "Out of Stock"
    );

    const expiringItems = [...inventory]
      .filter((i) => i.stock > 0)
      .sort((a, b) => {
        const toDate = (s) => new Date(s);
        return toDate(a.expiry) - toDate(b.expiry);
      })
      .slice(0, 4);

    return { totalItems, inStock, lowStock, outOfStock, totalStockValue, totalRetailValue, avgMargin, byCategory, topValue, urgent, expiringItems };
  }, [inventory]);

  const donutSegments = [
    { value: stats.inStock, color: "#111" },
    { value: stats.lowStock, color: "#d1d5db" },
    { value: stats.outOfStock, color: "#e5e7eb" },
  ];

  const maxSales = Math.max(...weeklySales);

  return (
    <div className="min-h-screen bg-white">
      <div className="container p-4 mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Monday, 2 March 2026</p>
          </div>
          <div className="flex gap-2">
            <button className="group flex items-center !gap-3 !px-3 !py-1 text-sm rounded-xl text-black
              transition-all duration-150 !bg-white hover:bg-black hover:text-gray-500 underline">
              Export
            </button>
            <NavLink
              key="+ New Item"
              to="/add-stock"
              className="group flex items-center gap-3 px-3 py-2 mx-2 my-1 text-sm rounded-xl border border-gray-200 text-gray-500 
              shadow-sm transition-all duration-150 bg-black hover:bg-black hover:text-white"
            >
              <span className="!px-2 !py-1 text-xs font-semibold rounded-lg transition-colors">
                + New Item
              </span>
            </NavLink>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Item</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalItems}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.inStock} in stock</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Stock Value</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">₱{stats.totalStockValue.toFixed(0)}</p>
            <p className="text-xs text-gray-400 mt-1">at cost</p>
          </div>

          <div className="bg-black rounded-xl p-4 border border-black shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Retail Value</p>
            <p className="text-2xl font-bold text-white mt-1">₱{stats.totalRetailValue.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">at sell price</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Margin</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.avgMargin.toFixed(1)}%</p>
            <p className="text-xs text-gray-400 mt-1">across all items</p>
          </div>
        </div>

        {/* Middle Row: Stock Health + Weekly Sales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

          {/* Stock Health Donut */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Stock Health</p>
            <div className="flex items-center gap-6 flex-1">
              <DonutChart segments={donutSegments} size={90} />
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
                  <span className="text-gray-500">In Stock</span>
                  <span className="ml-auto font-bold text-gray-800">{stats.inStock}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                  <span className="text-gray-500">Low Stock</span>
                  <span className="ml-auto font-bold text-gray-800">{stats.lowStock}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-gray-200 inline-block" />
                  <span className="text-gray-500">Out of Stock</span>
                  <span className="ml-auto font-bold text-gray-800">{stats.outOfStock}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Sales Sparkline */}
          <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Weekly Sales</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ₱{weeklySales.reduce((a, b) => a + b, 0).toLocaleString()}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">This week</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {weeklySales.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${(val / maxSales) * 48}px`,
                      background: i === weeklySales.length - 1 ? "#111" : "#e5e7eb",
                    }}
                  />
                  <span className="text-[10px] text-gray-400">{weekLabels[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Category Breakdown + Alerts + Expiring */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">By Category</p>
            <div className="space-y-2">
              {stats.byCategory.map((cat) => {
                const pct = Math.round((cat.stock / inventory.reduce((s, i) => s + i.stock, 0)) * 100);
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat.name]}`}>
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{cat.stock} units</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts: Low / Out of Stock */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Needs Attention</p>
              <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">
                {stats.urgent.length}
              </span>
            </div>
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
              {stats.urgent.length > 5 && (
                <p className="text-xs text-gray-400 text-center pt-1">+{stats.urgent.length - 5} more</p>
              )}
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Expiring Soon</p>
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
          </div>
        </div>

        {/* Top Value Items Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Top 5 Items by Stock Value</p>
          </div>
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
                const value = item.stock * item.sellPrice;
                const margin = (((item.sellPrice - item.costPrice) / item.sellPrice) * 100).toFixed(1);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-semibold text-gray-800">{item.name}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[item.category]}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-gray-800">{item.stock}</td>
                    <td className="p-3 text-right text-gray-500">₱{item.sellPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-gray-800">₱{value.toFixed(0)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full" style={{ width: `${margin}%` }} />
                        </div>
                        <span className="text-gray-600">{margin}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}