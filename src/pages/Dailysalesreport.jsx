import { useState, useEffect, useMemo } from "react";
import { getSales, deleteSale } from "../api/apiFunctions";
import { NavLink } from "react-router-dom";

const CATEGORY_COLORS = {
  Breads:   "bg-amber-50  text-amber-700  border border-amber-200",
  Pastries: "bg-rose-50   text-rose-700   border border-rose-200",
  Muffins:  "bg-blue-50   text-blue-700   border border-blue-200",
  Cakes:    "bg-purple-50 text-purple-700 border border-purple-200",
  Cookies:  "bg-orange-50 text-orange-700 border border-orange-200",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function StatCard({ label, value, sub, dark = false }) {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${dark ? "bg-black border-black" : "bg-white border-gray-200"}`}>
      <p className="text-xs uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${dark ? "text-white" : "text-gray-800"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-6">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{children}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, colorClass = "bg-black" }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
            <div
              className={`w-full rounded-t-sm ${colorClass} transition-all`}
              style={{ height: `${Math.max((d[valueKey] / max) * 80, 2)}px` }}
            />
          </div>
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function DailySalesReport() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [sales,     setSales]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId,  setDeleteId]  = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSales();
        setSales(s);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, []);

  const filteredSales = useMemo(() => sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  }), [sales, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) =>
      sum + s.items.reduce((a, i) => a + i.qty * i.unitPrice, 0), 0);
    const totalQty = filteredSales.reduce((sum, s) =>
      sum + s.items.reduce((a, i) => a + i.qty, 0), 0);
    const avgPerDay = filteredSales.length > 0
      ? totalRevenue / filteredSales.length : 0;

    const catMap = {};
    filteredSales.forEach(s => s.items.forEach(i => {
      catMap[i.category] = (catMap[i.category] || 0) + i.qty * i.unitPrice;
    }));
    const byCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const itemMap = {};
    filteredSales.forEach(s => s.items.forEach(i => {
      if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, category: i.category, qty: 0, revenue: 0 };
      itemMap[i.name].qty     += i.qty;
      itemMap[i.name].revenue += i.qty * i.unitPrice;
    }));
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailyTotals = Array.from({ length: daysInMonth }, (_, idx) => {
      const day    = idx + 1;
      const dayStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const total  = filteredSales
        .filter(s => s.date === dayStr)
        .reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.qty * i.unitPrice, 0), 0);
      return { day: String(day), total };
    });

    return { totalRevenue, totalQty, avgPerDay, byCategory, topItems, dailyTotals };
  }, [filteredSales, selectedMonth, selectedYear]);

  async function handleDelete(id) {
    try {
      await deleteSale(id);
      setSales(prev => prev.filter(s => s.id !== id));
      setDeleteId(null);
    } catch (e) { console.error(e); }
  }

  const years = [now.getFullYear() - 1, now.getFullYear()];

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="container p-4 mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Sales Report</h1>
            <p className="text-sm text-gray-400 mt-1">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-black">
              {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-black">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <NavLink to="/add-sale"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-black text-white rounded-xl hover:text-white">
              + Add Sale
            </NavLink>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          <StatCard label="Total Revenue" value={`₱${stats.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} sub={`${filteredSales.length} transactions`} />
          <StatCard label="Units Sold"    value={stats.totalQty.toLocaleString()} />
          <StatCard label="Avg per Day"   value={`₱${stats.avgPerDay.toFixed(0)}`} sub="with sales" dark />
          <StatCard label="Best Category" value={stats.byCategory[0]?.name ?? "—"} sub={stats.byCategory[0] ? `₱${stats.byCategory[0].value.toFixed(0)}` : ""} />
        </div>

        {/* Daily bar chart + Category breakdown */}
        <SectionLabel>Monthly Overview</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

          <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
              Daily Revenue — {MONTH_NAMES[selectedMonth]}
            </p>
            {stats.totalRevenue === 0
              ? <p className="text-xs text-gray-400 text-center py-8">No sales recorded this month</p>
              : <BarChart data={stats.dailyTotals} valueKey="total" labelKey="day" />
            }
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Revenue by Category</p>
            <div className="space-y-2.5">
              {stats.byCategory.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No data</p>
                : stats.byCategory.map(cat => {
                    const pct = stats.totalRevenue > 0 ? (cat.value / stats.totalRevenue) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat.name] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">₱{cat.value.toFixed(0)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>

        {/* Top Items + Transaction log */}
        <SectionLabel>Details</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Top Sellers</p>
            <div className="space-y-2">
              {stats.topItems.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No data</p>
                : stats.topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-300 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.qty} units sold</p>
                    </div>
                    <span className="text-xs font-bold text-gray-800 shrink-0">₱{item.revenue.toFixed(0)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Transactions</p>
              <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">
                {filteredSales.length}
              </span>
            </div>
            <div className="overflow-y-auto max-h-80">
              {filteredSales.length === 0
                ? <p className="text-xs text-gray-400 text-center py-8">No transactions this month</p>
                : [...filteredSales].sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => {
                    const total = sale.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
                    return (
                      <div key={sale.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold text-gray-800">
                                {new Date(sale.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              </p>
                              {sale.note && <p className="text-[10px] text-gray-400 truncate">— {sale.note}</p>}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {sale.items.map((item, i) => (
                                <span key={i} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                                  {item.name} ×{item.qty}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-gray-800">₱{total.toFixed(2)}</span>
                            <button onClick={() => setDeleteId(sale.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors text-xs">✕</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <p className="text-sm font-semibold text-gray-800 mb-1">Delete this transaction?</p>
            <p className="text-xs text-gray-400 mb-5">This cannot be undone.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-xs font-semibold bg-black text-white rounded-xl hover:bg-gray-800">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}