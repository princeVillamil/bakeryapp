import { useMemo, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getInventory, getStaffList, getSales } from "../api/apiFunctions";
import { useAuth } from "./Authcontext";

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const STATUS_STYLES = {
  "In Stock":     "bg-black text-white",
  "Low Stock":    "bg-gray-200 text-gray-700",
  "Out of Stock": "bg-gray-100 text-gray-400",
};

const CATEGORY_COLORS = {
  Breads:   "bg-amber-50  text-amber-700  border border-amber-200",
  Pastries: "bg-rose-50   text-rose-700   border border-rose-200",
  Muffins:  "bg-blue-50   text-blue-700   border border-blue-200",
  Cakes:    "bg-purple-50 text-purple-700 border border-purple-200",
  Cookies:  "bg-orange-50 text-orange-700 border border-orange-200",
};

const CAT_BAR = {
  Breads: "#000", Pastries: "#000", Muffins: "#000", Cakes: "#000", Cookies: "#000",
};

const ROLE_COLORS = {
  Baker:      { pill: "bg-amber-100  text-amber-700",  bar: "#f59e0b" },
  Cashier:    { pill: "bg-blue-100   text-blue-700",   bar: "#3b82f6" },
  Supervisor: { pill: "bg-purple-100 text-purple-700", bar: "#8b5cf6" },
  Delivery:   { pill: "bg-green-100  text-green-700",  bar: "#10b981" },
  Cleaner:    { pill: "bg-gray-100   text-gray-600",   bar: "#9ca3af" },
};

const SHIFT_COLORS = {
  Morning:   { dot: "#f59e0b", text: "text-amber-700",  bg: "bg-amber-50"  },
  Afternoon: { dot: "#3b82f6", text: "text-blue-700",   bg: "bg-blue-50"   },
  Night:     { dot: "#8b5cf6", text: "text-purple-700", bg: "bg-purple-50" },
};

/* ─────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────── */
function DonutChart({ segments, size = 80, centerLabel, centerSub }) {
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
      {total > 0 && slices.map((seg, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={seg.color} strokeWidth={10}
          strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
          strokeDashoffset={seg.offset}
          transform={`rotate(-90 ${cx} ${cy})`} />
      ))}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="11" fontWeight="bold" fill="#111">
        {centerLabel ?? total}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" dominantBaseline="middle"
        fontSize="6" fill="#9ca3af">
        {centerSub ?? "items"}
      </text>
    </svg>
  );
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${accent ? "bg-black border-black" : "bg-white border-gray-200"}`}>
      <p className="text-xs uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-white" : "text-gray-800"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-gray-500" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

function Avatar({ name, size = "sm" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-amber-100 text-amber-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-rose-100 text-rose-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {initials}
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

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, badge }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{children}</p>
      {badge != null && (
        <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

function Bar({ pct, color = "#000" }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADMIN DASHBOARD
───────────────────────────────────────────── */
function AdminDashboard({ inventory, staff, invStats, staffStats, salesStats }) {
  const totalStock = inventory.reduce((s, i) => s + i.stock, 0);

  const categoryData = invStats.byCategory.map((cat) => ({
    ...cat,
    pct:      totalStock > 0 ? Math.round((cat.stock / totalStock) * 100) : 0,
    valuePct: invStats.totalRetailValue > 0
      ? Math.round((cat.value / invStats.totalRetailValue) * 100) : 0,
  }));

  const roles = ["Baker", "Cashier", "Supervisor", "Delivery", "Cleaner"];
  const roleData = roles.map((role) => ({
    role,
    count: staff.filter((s) => s.role === role && s.status === "Active").length,
  })).filter((r) => r.count > 0);
  const maxRole = Math.max(...roleData.map((r) => r.count), 1);

  const shiftData = ["Morning", "Afternoon", "Night"].map((shift) => ({
    shift,
    count: staff.filter((s) => s.shift === shift && s.status === "Active").length,
  }));

  const stockDonut = [
    { value: invStats.inStock,    color: "#111" },
    { value: invStats.lowStock,   color: "#d1d5db" },
    { value: invStats.outOfStock, color: "#e5e7eb" },
  ];
  const staffDonut = [
    { value: staffStats.active,   color: "#111" },
    { value: staffStats.onLeave,  color: "#d1d5db" },
    { value: staffStats.inactive, color: "#e5e7eb" },
  ];

  return (
    <>
      {/* ── INVENTORY ── */}
      <SectionLabel>Inventory Overview</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Items"  value={invStats.totalItems} sub={`${invStats.inStock} in stock`} />
        <StatCard label="Cost Value"   value={`₱${(invStats.totalStockValue/1000).toFixed(1)}k`} sub="at cost price" />
        <StatCard label="Retail Value" value={`₱${(invStats.totalRetailValue/1000).toFixed(1)}k`} sub="at sell price" accent />
        <StatCard label="Avg Margin"   value={`${invStats.avgMargin.toFixed(1)}%`} sub="across all items" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        {/* Stock health */}
        <Card>
          <CardTitle>Stock Health</CardTitle>
          <div className="flex items-center gap-5">
            <DonutChart segments={stockDonut} size={88} />
            <div className="space-y-2 flex-1">
              {[
                { label: "In Stock",     val: invStats.inStock,    dot: "bg-black" },
                { label: "Low Stock",    val: invStats.lowStock,   dot: "bg-gray-300" },
                { label: "Out of Stock", val: invStats.outOfStock, dot: "bg-gray-100 border border-gray-200" },
              ].map(({ label, val, dot }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <span className="text-gray-500 flex-1">{label}</span>
                  <span className="font-bold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardTitle>Stock by Category</CardTitle>
          <div className="space-y-3">
            {categoryData.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat.name]}`}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{cat.stock} units</span>
                </div>
                <Bar pct={cat.pct} color={CAT_BAR[cat.name]} />
              </div>
            ))}
          </div>
        </Card>

        {/* Needs attention */}
        <Card>
          <CardTitle badge={invStats.urgent.length}>Needs Attention</CardTitle>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {invStats.urgent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-1">
                <span className="text-2xl">✓</span>
                <p className="text-xs text-gray-400">All items healthy</p>
              </div>
            ) : invStats.urgent.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{item.id}</p>
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${STATUS_STYLES[item.status]}`}>
                  {item.status === "Out of Stock" ? "OOS" : "Low"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── STAFF ── */}
      <SectionLabel>Staff Overview</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Staff"  value={staffStats.total}    sub={`${staffStats.active} active`} />
        <StatCard label="On Leave"     value={staffStats.onLeave} />
        <StatCard label="Monthly Cost" value={`₱${(staffStats.monthlyCost/1000).toFixed(0)}k`} sub="active staff" accent />
        <StatCard label="Pending"      value={staffStats.pending}
          sub={staffStats.pending > 0 ? "needs approval" : "all approved"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Staff health */}
        <Card>
          <CardTitle>Staff Health</CardTitle>
          <div className="flex items-center gap-5">
            <DonutChart segments={staffDonut} size={88} centerSub="staff" />
            <div className="space-y-2 flex-1">
              {[
                { label: "Active",   val: staffStats.active,   dot: "bg-black" },
                { label: "On Leave", val: staffStats.onLeave,  dot: "bg-gray-300" },
                { label: "Inactive", val: staffStats.inactive, dot: "bg-gray-100 border border-gray-200" },
              ].map(({ label, val, dot }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <span className="text-gray-500 flex-1">{label}</span>
                  <span className="font-bold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Role distribution */}
        <Card>
          <CardTitle>Active Staff by Role</CardTitle>
          <div className="space-y-3">
            {roleData.map(({ role, count }) => (
              <div key={role}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role]?.pill}`}>
                    {role}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{count} staff</span>
                </div>
                <Bar pct={(count / maxRole) * 100} color={ROLE_COLORS[role]?.bar} />
              </div>
            ))}
          </div>
        </Card>

        {/* Shift distribution */}
        <Card>
          <CardTitle>Active Staff by Shift</CardTitle>
          <div className="space-y-3 mb-4">
            {shiftData.map(({ shift, count }) => (
              <div key={shift} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: SHIFT_COLORS[shift].dot }} />
                <div className="flex-1">
                  <div className="flex justify-between mb-0.5">
                    <span className={`text-xs font-medium ${SHIFT_COLORS[shift].text}`}>{shift}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </div>
                  <Bar pct={staffStats.active > 0 ? (count / staffStats.active) * 100 : 0}
                    color={SHIFT_COLORS[shift].dot} />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-gray-400 mb-2">Active Members</p>
            <div className="flex flex-wrap gap-1.5">
              {staff.filter((s) => s.status === "Active").slice(0, 8).map((s) => (
                <div key={s.uuid} title={`${s.name} — ${s.role}`}>
                  <Avatar name={s.name} size="sm" />
                </div>
              ))}
              {staff.filter((s) => s.status === "Active").length > 8 && (
                <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-400 font-bold ring-2 ring-white">
                  +{staff.filter((s) => s.status === "Active").length - 8}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── SALES ── */}
      <SectionLabel>Sales Overview</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="This Month"      value={`₱${salesStats.thisRevenue.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`} sub={`${salesStats.transactions} transactions`} accent />
        <StatCard label="Today's Revenue" value={`₱${salesStats.todayRevenue.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`} />
        <StatCard label="Last Month"      value={`₱${salesStats.lastRevenue.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`} />
        <StatCard label="Growth"          value={salesStats.growth !== null ? `${salesStats.growth > 0 ? "+" : ""}${salesStats.growth}%` : "—"} sub="vs last month" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardTitle>Top Sellers This Month</CardTitle>
          <div className="space-y-2">
            {salesStats.topItems.length === 0
              ? <p className="text-xs text-gray-400 text-center py-6">No sales recorded this month</p>
              : salesStats.topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 py-1">
                  <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.qty} units sold</p>
                  </div>
                  <span className="text-xs font-bold text-gray-800 shrink-0">₱{item.revenue.toFixed(0)}</span>
                </div>
              ))
            }
          </div>
        </Card>

        <Card>
          <CardTitle>Revenue by Category</CardTitle>
          <div className="space-y-3">
            {salesStats.byCategory.length === 0
              ? <p className="text-xs text-gray-400 text-center py-6">No sales recorded this month</p>
              : salesStats.byCategory.map(cat => {
                  const pct = salesStats.thisRevenue > 0 ? (cat.value / salesStats.thisRevenue) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat.name] ?? "bg-gray-100 text-gray-600"}`}>
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">₱{cat.value.toFixed(0)}</span>
                      </div>
                      <Bar pct={pct} />
                    </div>
                  );
                })
            }
          </div>
        </Card>
      </div>

      {/* ── DETAILS ── */}
      <SectionLabel>Item Details</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardTitle>Expiring Soon</CardTitle>
          <div className="space-y-2">
            {invStats.expiringItems.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-1">
                <span className="text-2xl">📦</span>
                <p className="text-xs text-gray-400">No items expiring soon</p>
              </div>
            ) : invStats.expiringItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-400">{item.expiry}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-gray-800">{item.stock}</p>
                  <p className="text-[10px] text-gray-400">{item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Top 5 Items by Retail Value</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 uppercase tracking-wider text-[10px]">
                  {["Item","Category","Stock","Sell","Value","Margin","Status"].map(h => (
                    <th key={h} className="p-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invStats.topValue.map((item) => {
                  const value  = item.stock * item.sellPrice;
                  const margin = item.sellPrice > 0
                    ? (((item.sellPrice - item.costPrice) / item.sellPrice) * 100).toFixed(1)
                    : "0.0";
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-semibold text-gray-800">{item.name}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-gray-800">{item.stock}</td>
                      <td className="p-3 text-right text-gray-500">₱{item.sellPrice.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-gray-800">₱{value.toFixed(0)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full" style={{ width: `${margin}%` }} />
                          </div>
                          <span className="text-gray-600 w-8 text-right">{margin}%</span>
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
    </>
  );
}

/* ─────────────────────────────────────────────
   STAFF DASHBOARD
───────────────────────────────────────────── */
function StaffDashboard({ inventory, staff, invStats, profile, salesStats }) {
  const totalStock = inventory.reduce((s, i) => s + i.stock, 0);

  const stockDonut = [
    { value: invStats.inStock,    color: "#111" },
    { value: invStats.lowStock,   color: "#d1d5db" },
    { value: invStats.outOfStock, color: "#e5e7eb" },
  ];

  const sameShift = staff.filter(
    (s) => s.shift === profile?.shift && s.status === "Active" && s.uuid !== profile?.id
  );

  const categoryData = ["Breads","Pastries","Muffins","Cakes","Cookies"].map((cat) => ({
    name:   cat,
    stock:  inventory.filter((i) => i.category === cat).reduce((s, i) => s + i.stock, 0),
    issues: inventory.filter((i) => i.category === cat && i.status !== "In Stock").length,
  }));

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dayNum  = new Date().toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const year    = new Date().getFullYear();

  return (
    <>
      {/* Welcome banner */}
      <div className="border-b border-black/20 p-5 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-black uppercase tracking-wider mb-0.5">Welcome back</p>
          <p className="text-xl font-bold text-black">{profile?.name || "Staff"}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {profile?.role && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[profile.role]?.pill}`}>
                {profile.role}
              </span>
            )}
            {profile?.shift && (
              <span className={`text-[10px] font-medium flex items-center gap-1 ${SHIFT_COLORS[profile.shift]?.text}`}>
                <span className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: SHIFT_COLORS[profile.shift]?.dot }} />
                {profile.shift} shift
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-black">{dayName}</p>
          <p className="text-2xl font-bold text-black">{dayNum}</p>
          <p className="text-xs text-black">{year}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Items"  value={invStats.totalItems} sub={`${invStats.inStock} in stock`} />
        <StatCard label="Low Stock"    value={invStats.lowStock} />
        <StatCard label="Out of Stock" value={invStats.outOfStock} accent />
        <StatCard label="Total Units"  value={totalStock} sub="across all items" />
      </div>

      {/* Sales summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardTitle>This Month's Sales</CardTitle>
          <p className="text-2xl font-bold text-gray-800">
            ₱{salesStats.thisRevenue.toLocaleString("en-PH", { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{salesStats.transactions} transactions</p>
        </Card>
        <Card>
          <CardTitle>Today's Revenue</CardTitle>
          <p className="text-2xl font-bold text-gray-800">
            ₱{salesStats.todayRevenue.toLocaleString("en-PH", { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {salesStats.growth !== null
              ? `${salesStats.growth > 0 ? "↑" : "↓"} ${Math.abs(salesStats.growth)}% vs last month`
              : "No comparison data"}
          </p>
        </Card>
      </div>

      <SectionLabel>Inventory</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardTitle>Stock Health</CardTitle>
          <div className="flex items-center gap-6">
            <DonutChart segments={stockDonut} size={88} />
            <div className="space-y-2 flex-1">
              {[
                { label: "In Stock",     val: invStats.inStock,    dot: "bg-black" },
                { label: "Low Stock",    val: invStats.lowStock,   dot: "bg-gray-300" },
                { label: "Out of Stock", val: invStats.outOfStock, dot: "bg-gray-100 border border-gray-200" },
              ].map(({ label, val, dot }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <span className="text-gray-500 flex-1">{label}</span>
                  <span className="font-bold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle badge={invStats.urgent.length}>Needs Attention</CardTitle>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {invStats.urgent.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-1">
                <span className="text-2xl">✓</span>
                <p className="text-xs text-gray-400">All items healthy</p>
              </div>
            ) : invStats.urgent.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-400">{item.category}</p>
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${STATUS_STYLES[item.status]}`}>
                  {item.status === "Out of Stock" ? "OOS" : "Low"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardTitle>Stock by Category</CardTitle>
          <div className="space-y-3">
            {categoryData.map((cat) => {
              const pct = totalStock > 0 ? Math.round((cat.stock / totalStock) * 100) : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat.name]}`}>
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {cat.issues > 0 && (
                        <span className="text-[10px] text-amber-600">{cat.issues} issue{cat.issues > 1 ? "s" : ""}</span>
                      )}
                      <span className="text-[10px] font-mono text-gray-400">{cat.stock} units</span>
                    </div>
                  </div>
                  <Bar pct={pct} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>Expiring Soon</CardTitle>
          {invStats.expiringItems.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-1">
              <span className="text-2xl">📦</span>
              <p className="text-xs text-gray-400">No items expiring soon</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invStats.expiringItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.expiry}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-800">{item.stock}</p>
                    <p className="text-[10px] text-gray-400">{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <SectionLabel>Team</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardTitle>{profile?.shift} Shift Team</CardTitle>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
              <Avatar name={profile?.name || "You"} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {profile?.name} <span className="text-gray-400 font-normal">(you)</span>
                </p>
                <p className="text-[10px] text-gray-400">{profile?.role}</p>
              </div>
            </div>
            {sameShift.slice(0, 5).map((s) => (
              <div key={s.uuid} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <Avatar name={s.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="text-[10px] text-gray-400">{s.role}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[s.role]?.pill}`}>
                  {s.role}
                </span>
              </div>
            ))}
            {sameShift.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No other staff on this shift</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Active Team</CardTitle>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {staff.filter((s) => s.status === "Active").map((s) => (
              <div key={s.uuid} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                <Avatar name={s.name} size="sm" />
                <p className="text-xs font-semibold text-gray-800 flex-1 truncate">{s.name}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[s.role]?.pill}`}>
                    {s.role}
                  </span>
                  <span className={`text-[9px] font-medium ${SHIFT_COLORS[s.shift]?.text}`}>
                    {s.shift}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function Dashboard() {
  const { isAdmin, profile } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [staff,     setStaff]     = useState([]);
  const [sales,     setSales]     = useState([]);
  const [pendingCount]            = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inv, stf, sal] = await Promise.all([
          getInventory(),
          getStaffList(),
          getSales(),
        ]);
        setInventory(inv);
        setStaff(stf);
        setSales(sal);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const invStats = useMemo(() => {
    const totalItems       = inventory.length;
    const inStock          = inventory.filter((i) => i.status === "In Stock").length;
    const lowStock         = inventory.filter((i) => i.status === "Low Stock").length;
    const outOfStock       = inventory.filter((i) => i.status === "Out of Stock").length;
    const totalStockValue  = inventory.reduce((s, i) => s + i.stock * i.costPrice, 0);
    const totalRetailValue = inventory.reduce((s, i) => s + i.stock * i.sellPrice, 0);
    const avgMargin        = inventory.length > 0
      ? inventory.reduce((s, i) =>
          s + (i.sellPrice > 0 ? ((i.sellPrice - i.costPrice) / i.sellPrice) * 100 : 0), 0
        ) / inventory.length
      : 0;

    const byCategory = ["Breads","Pastries","Muffins","Cakes","Cookies"].map((cat) => ({
      name:  cat,
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
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))
      .slice(0, 5);

    return { totalItems, inStock, lowStock, outOfStock, totalStockValue,
      totalRetailValue, avgMargin, byCategory, topValue, urgent, expiringItems };
  }, [inventory]);

  const staffStats = useMemo(() => ({
    total:       staff.length,
    active:      staff.filter((s) => s.status === "Active").length,
    onLeave:     staff.filter((s) => s.status === "On Leave").length,
    inactive:    staff.filter((s) => s.status === "Inactive").length,
    pending:     pendingCount,
    monthlyCost: staff.filter((s) => s.status === "Active").reduce((sum, s) => sum + (s.salary || 0), 0),
  }), [staff, pendingCount]);

  const salesStats = useMemo(() => {
    const now = new Date();
    const thisMonth = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = sales.filter(s => {
      const d = new Date(s.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const revenue = (list) => list.reduce((sum, s) =>
      sum + s.items.reduce((a, i) => a + i.qty * i.unitPrice, 0), 0);

    const thisRevenue = revenue(thisMonth);
    const lastRevenue = revenue(lastMonth);
    const growth = lastRevenue > 0
      ? (((thisRevenue - lastRevenue) / lastRevenue) * 100).toFixed(1)
      : null;

    const itemMap = {};
    thisMonth.forEach(s => s.items.forEach(i => {
      if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, category: i.category, qty: 0, revenue: 0 };
      itemMap[i.name].qty     += i.qty;
      itemMap[i.name].revenue += i.qty * i.unitPrice;
    }));
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const catMap = {};
    thisMonth.forEach(s => s.items.forEach(i => {
      catMap[i.category] = (catMap[i.category] || 0) + i.qty * i.unitPrice;
    }));
    const byCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const today = now.toISOString().split("T")[0];
    const todayRevenue = sales
      .filter(s => s.date === today)
      .reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.qty * i.unitPrice, 0), 0);

    return { thisRevenue, lastRevenue, growth, topItems, byCategory, transactions: thisMonth.length, todayRevenue };
  }, [sales]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container p-4 mx-auto max-w-6xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>
          <NavLink to="/add-stock"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-black text-white rounded-xl transition-colors">
            + Add Stock
          </NavLink>
        </div>

        {isAdmin
          ? <AdminDashboard inventory={inventory} staff={staff} invStats={invStats} staffStats={staffStats} salesStats={salesStats} />
          : <StaffDashboard inventory={inventory} staff={staff} invStats={invStats} profile={profile} salesStats={salesStats} />
        }
      </div>
    </div>
  );
}