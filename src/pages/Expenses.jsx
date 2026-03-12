import { useState, useEffect, useMemo } from "react";
import { getInventory, getStaffList } from "../api/apiFunctions";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const INVENTORY_CATEGORIES = ["All", "Breads", "Pastries", "Muffins", "Cakes", "Cookies"];

const CATEGORY_COLORS = {
  Breads:   "bg-amber-50 text-amber-700 border border-amber-200",
  Pastries: "bg-rose-50 text-rose-700 border border-rose-200",
  Muffins:  "bg-blue-50 text-blue-700 border border-blue-200",
  Cakes:    "bg-purple-50 text-purple-700 border border-purple-200",
  Cookies:  "bg-orange-50 text-orange-700 border border-orange-200",
};

const ROLE_COLORS = {
  Baker:      "bg-amber-100 text-amber-700",
  Cashier:    "bg-blue-100 text-blue-700",
  Supervisor: "bg-purple-100 text-purple-700",
  Delivery:   "bg-green-100 text-green-700",
  Cleaner:    "bg-gray-100 text-gray-600",
};

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

function Avatar({ name }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-amber-100 text-amber-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-rose-100 text-rose-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-7 h-7 ${color} rounded-full flex items-center justify-center font-bold text-[10px] shrink-0`}>
      {initials}
    </div>
  );
}

export default function Expenses() {
  const [inventory, setInventory] = useState([]);
  const [staff,     setStaff]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "staff"

  useEffect(() => {
    (async () => {
      try {
        const [inv, stf] = await Promise.all([getInventory(), getStaffList()]);
        setInventory(inv);
        setStaff(stf);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, []);

  // ── Staff costs ──────────────────────────────────────────────────────────────
  const activeStaff = useMemo(() => staff.filter(s => s.status === "Active"), [staff]);
  const totalSalary = useMemo(() =>
    activeStaff.reduce((sum, s) => sum + (s.salary || 0), 0), [activeStaff]);

  // Staff by role breakdown
  const staffByRole = useMemo(() => {
    const roles = ["Baker", "Cashier", "Supervisor", "Delivery", "Cleaner"];
    return roles.map(role => ({
      role,
      count:  activeStaff.filter(s => s.role === role).length,
      total:  activeStaff.filter(s => s.role === role).reduce((sum, s) => sum + (s.salary || 0), 0),
    })).filter(r => r.count > 0);
  }, [activeStaff]);

  // ── Inventory costs ──────────────────────────────────────────────────────────
  const filteredInventory = useMemo(() =>
    catFilter === "All" ? inventory : inventory.filter(i => i.category === catFilter),
    [inventory, catFilter]
  );

  const totalInventoryCost = useMemo(() =>
    inventory.reduce((sum, i) => sum + i.stock * i.costPrice, 0), [inventory]);

  const inventoryCostByCategory = useMemo(() => {
    const cats = ["Breads", "Pastries", "Muffins", "Cakes", "Cookies"];
    return cats.map(cat => ({
      name:  cat,
      cost:  inventory.filter(i => i.category === cat).reduce((sum, i) => sum + i.stock * i.costPrice, 0),
      items: inventory.filter(i => i.category === cat).length,
    }));
  }, [inventory]);

  // ── Grand total ──────────────────────────────────────────────────────────────
  const grandTotal = totalSalary + totalInventoryCost;

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
            <h1 className="text-3xl font-bold text-black tracking-tight">Expenses</h1>
            <p className="text-sm text-gray-400 mt-1">Staff salaries + inventory cost overview</p>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          <StatCard
            label="Total Expenses"
            value={`₱${grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
            sub="salaries + stock cost"
            dark
          />
          <StatCard
            label="Staff Salaries"
            value={`₱${totalSalary.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`}
            sub={`${activeStaff.length} active staff`}
          />
          <StatCard
            label="Inventory Cost"
            value={`₱${totalInventoryCost.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`}
            sub={`${inventory.length} items`}
          />
          <StatCard
            label="Salary Share"
            value={grandTotal > 0 ? `${((totalSalary / grandTotal) * 100).toFixed(1)}%` : "—"}
            sub="of total expenses"
          />
        </div>

        {/* Overview charts */}
        <SectionLabel>Breakdown</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

          {/* Staff by role */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Staff Cost by Role</p>
            <div className="space-y-2.5">
              {staffByRole.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No active staff</p>
                : staffByRole.map(r => {
                    const pct = totalSalary > 0 ? (r.total / totalSalary) * 100 : 0;
                    return (
                      <div key={r.role}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[r.role]}`}>
                              {r.role}
                            </span>
                            <span className="text-[10px] text-gray-400">{r.count} staff</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            ₱{r.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
              }
              <div className="pt-2 border-t border-gray-100 flex justify-between">
                <span className="text-xs text-gray-400">Total</span>
                <span className="text-xs font-bold text-gray-800">
                  ₱{totalSalary.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory cost by category */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Inventory Cost by Category</p>
            <div className="space-y-2.5">
              {inventoryCostByCategory.map(cat => {
                const pct = totalInventoryCost > 0 ? (cat.cost / totalInventoryCost) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat.name]}`}>
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-gray-400">{cat.items} items</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        ₱{cat.cost.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 flex justify-between">
                <span className="text-xs text-gray-400">Total</span>
                <span className="text-xs font-bold text-gray-800">
                  ₱{totalInventoryCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail tables */}
        <SectionLabel>Details</SectionLabel>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              activeTab === "inventory"
                ? "bg-black text-white border-black hover:text-white"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-white"
            }`}>
            Inventory Costs
          </button>
          <button onClick={() => setActiveTab("staff")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              activeTab === "staff"
                ? "bg-black text-white border-black hover:text-white"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-white"
            }`}>
            Staff Salaries
          </button>
        </div>

        {/* Inventory tab */}
        {activeTab === "inventory" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">

            {/* Category filters */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="flex gap-1.5 flex-wrap">
                {INVENTORY_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCatFilter(cat)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      catFilter === cat
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-white"
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-500 uppercase tracking-wider">
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 font-semibold">Item</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold text-right">Stock</th>
                  <th className="p-3 font-semibold text-right">Cost / Unit</th>
                  <th className="p-3 font-semibold text-right">Total Cost</th>
                  <th className="p-3 font-semibold text-right">% of Inv. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInventory.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-400">No items found.</td>
                    </tr>
                  )
                  : [...filteredInventory]
                      .sort((a, b) => (b.stock * b.costPrice) - (a.stock * a.costPrice))
                      .map(item => {
                        const totalCost = item.stock * item.costPrice;
                        const pct = totalInventoryCost > 0
                          ? ((totalCost / totalInventoryCost) * 100).toFixed(1)
                          : "0.0";
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 font-mono text-gray-400">{item.id}</td>
                            <td className="p-3 font-semibold text-gray-800">{item.name}</td>
                            <td className="p-3">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 text-right text-gray-700">{item.stock} {item.unit}</td>
                            <td className="p-3 text-right text-gray-500">₱{item.costPrice.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-gray-800">₱{totalCost.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-gray-500 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                }
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-400">{filteredInventory.length} items</span>
              <span className="text-sm font-bold text-gray-800">
                ₱{filteredInventory.reduce((s, i) => s + i.stock * i.costPrice, 0)
                  .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Staff tab */}
        {activeTab === "staff" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-500 uppercase tracking-wider">
                  <th className="p-3 font-semibold">Staff</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Shift</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Monthly Salary</th>
                  <th className="p-3 font-semibold text-right">% of Payroll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeStaff.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-gray-400">No active staff.</td>
                    </tr>
                  )
                  : [...activeStaff]
                      .sort((a, b) => b.salary - a.salary)
                      .map(member => {
                        const pct = totalSalary > 0
                          ? ((member.salary / totalSalary) * 100).toFixed(1)
                          : "0.0";
                        return (
                          <tr key={member.uuid} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={member.name} />
                                <div>
                                  <p className="font-semibold text-gray-800">{member.name}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{member.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[member.role]}`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500">{member.shift}</td>
                            <td className="p-3">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black text-white">
                                {member.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-gray-800">
                              ₱{(member.salary || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-gray-500 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                }
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-400">{activeStaff.length} active staff</span>
              <span className="text-sm font-bold text-gray-800">
                ₱{totalSalary.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}