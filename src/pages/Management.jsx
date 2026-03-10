import { useState, useMemo, useEffect } from "react";
import { getStaffList } from "../api/apiFunctions";
import { NavLink } from "react-router-dom";


const ALL_ROLES = ["All", "Baker", "Cashier", "Supervisor", "Delivery", "Cleaner"];
const ALL_STATUSES = ["All", "Active", "On Leave", "Inactive"];
const ALL_SHIFTS = ["Morning", "Afternoon", "Night"];

const ROLE_STYLES = {
  Baker: "bg-amber-50 text-amber-700 border-amber-200",
  Cashier: "bg-blue-50 text-blue-700 border-blue-200",
  Supervisor: "bg-purple-50 text-purple-700 border-purple-200",
  Delivery: "bg-green-50 text-green-700 border-green-200",
  Cleaner: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_STYLES = {
  Active: "bg-black text-white",
  "On Leave": "bg-gray-200 text-gray-700",
  Inactive: "bg-gray-100 text-gray-400",
};

function generateId(staff) {
  const nums = staff.map((s) => parseInt(s.id.replace("STF-", ""))).filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `STF-${String(next).padStart(3, "0")}`;
}

const emptyForm = { name: "", role: "Baker", shift: "Morning", phone: "", email: "", startDate: "", status: "Active", salary: "" };

function Avatar({ name, size = "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-amber-100 text-amber-700", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-rose-100 text-rose-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-black">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function StaffForm({ initial = emptyForm, onSave, onCancel, isEdit = false, existingStaff = [] }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (f, v) => {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.phone.trim()) e.phone = "Phone is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.salary || isNaN(Number(form.salary)) || Number(form.salary) <= 0) e.salary = "Enter a valid salary.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({
      ...form,
      salary: parseFloat(form.salary),
      id: isEdit ? initial.id : generateId(existingStaff),
      startDate: form.startDate
        ? new Date(form.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : form.startDate,
    });
  };

  const Field = ({ label, field, type = "text", placeholder }) => (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label} <span className="text-black">*</span></label>
      <input
        type={type}
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${errors[field] ? "border-red-300 bg-red-50" : "border-gray-200"}`}
      />
      {errors[field] && <p className="text-xs text-red-400 mt-1">{errors[field]}</p>}
    </div>
  );

  const PillSelector = ({ label, field, options }) => (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button key={opt} onClick={() => set(field, opt)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${form[field] === opt ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-white"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Field label="Full Name" field="name" placeholder="e.g. Maria Santos" />
      <div className="grid grid-cols-2 gap-3">
        <PillSelector label="Role" field="role" options={["Baker", "Cashier", "Supervisor", "Delivery", "Cleaner"]} />
        <PillSelector label="Shift" field="shift" options={ALL_SHIFTS} />
      </div>
      <Field label="Phone" field="phone" placeholder="+63 912 345 6789" />
      <Field label="Email" field="email" type="email" placeholder="name@bakery.com" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date" field="startDate" type="date" />
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Monthly Salary <span className="text-black">*</span></label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">₱</span>
            <input type="number" min="0" value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="0"
              className={`w-full pl-7 pr-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.salary ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
          </div>
          {errors.salary && <p className="text-xs text-red-400 mt-1">{errors.salary}</p>}
        </div>
      </div>
      <PillSelector label="Status" field="status" options={["Active", "On Leave", "Inactive"]} />
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        <button onClick={handleSave} className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
          {isEdit ? "Save Changes" : "Add Staff Member"} →
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({ staff, onConfirm, onCancel }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-800 mb-1">Remove {staff.name}?</h3>
      <p className="text-xs text-gray-400 mb-5">This will permanently delete <span className="font-mono">{staff.id}</span> from the staff records.</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">Remove</button>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 15;

export default function Management() {
  const [staff, setStaff] = useState([]);
    
  useEffect(() => {
    const loadInventory = async () => {
      const data = await getStaffList();
      setStaff(data);
    };

    loadInventory();
  }, []);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | { type: "add" | "edit" | "delete" | "view", staff? }

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
      const matchRole = roleFilter === "All" || s.role === roleFilter;
      const matchStatus = statusFilter === "All" || s.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [staff, search, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const stats = useMemo(() => ({
    total: staff.length,
    active: staff.filter((s) => s.status === "Active").length,
    onLeave: staff.filter((s) => s.status === "On Leave").length,
    inactive: staff.filter((s) => s.status === "Inactive").length,
    monthlyCost: staff.filter((s) => s.status === "Active").reduce((sum, s) => sum + s.salary, 0),
  }), [staff]);

  const handleAdd = (newMember) => {
    setStaff((prev) => [...prev, newMember]);
    setModal(null);
  };

  const handleEdit = (updated) => {
    setStaff((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    setModal(null);
  };

  const handleDelete = (id) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setModal(null);
  };

  const resetPage = () => setPage(1);

  return (
    <div className="min-h-screen bg-white">
      {/* Modals */}
      {modal?.type === "add" && (
        <Modal title="Add Staff Member" onClose={() => setModal(null)}>
          <StaffForm onSave={handleAdd} onCancel={() => setModal(null)} existingStaff={staff} />
        </Modal>
      )}
      {modal?.type === "edit" && (
        <Modal title="Edit Staff Member" onClose={() => setModal(null)}>
          <StaffForm
            initial={{ ...modal.staff, startDate: "" }}
            onSave={handleEdit}
            onCancel={() => setModal(null)}
            isEdit
            existingStaff={staff}
          />
        </Modal>
      )}
      {modal?.type === "delete" && (
        <Modal title="Confirm Removal" onClose={() => setModal(null)}>
          <DeleteConfirm staff={modal.staff} onConfirm={() => handleDelete(modal.staff.id)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "view" && (
        <Modal title="Staff Details" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={modal.staff.name} size="lg" />
              <div>
                <p className="font-bold text-gray-800">{modal.staff.name}</p>
                <p className="text-xs font-mono text-gray-400">{modal.staff.id}</p>
              </div>
              <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[modal.staff.status]}`}>{modal.staff.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ["Role", modal.staff.role],
                ["Shift", modal.staff.shift],
                ["Phone", modal.staff.phone],
                ["Email", modal.staff.email],
                ["Start Date", modal.staff.startDate],
                ["Monthly Salary", `₱${modal.staff.salary?.toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 uppercase tracking-wider text-[10px]">{label}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal({ type: "edit", staff: modal.staff })}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                Edit
              </button>
              <button onClick={() => setModal({ type: "delete", staff: modal.staff })}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="container p-4 mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Staff Management</h1>
            <p className="text-sm text-gray-400 mt-1">Manage bakery employees</p>
          </div>
          {/* <NavLink
            key="+ New Staff"
            to="/add-staff"
            className="group flex items-center gap-3 px-3 py-2 mx-2 my-1 text-sm rounded-xl border border-gray-200 text-gray-500 
            shadow-sm transition-all duration-150 bg-black hover:bg-black hover:text-white"
          >
            <span className="!px-2 !py-1 text-xs font-semibold rounded-lg transition-colors">
              + New Staff
            </span>
          </NavLink> */}
          {/* <button onClick={() => setModal({ type: "add" })}
            className="px-4 py-2 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            + Add Staff
          </button> */}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.active}</p>
          </div>
          <div className="bg-black rounded-xl p-4 border border-black shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">On Leave</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.onLeave}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Monthly Cost</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">₱{(stats.monthlyCost / 1000).toFixed(0)}k</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="relative mb-3">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            </span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Search by name, ID, or role..."
              className="w-full pl-9 pr-4 py-2 text-sm text-black border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Role</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map((r) => (
                  <button key={r} onClick={() => { setRoleFilter(r); resetPage(); }}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-150 ${roleFilter === r ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-white"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <button key={s} onClick={() => { setStatusFilter(s); resetPage(); }}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-150 ${statusFilter === s ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-white"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400 mb-3">
          Showing {paginated.length} of {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 uppercase tracking-wider">
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Role</th>
                <th className="p-3 font-semibold">Shift</th>
                <th className="p-3 font-semibold">Contact</th>
                <th className="p-3 font-semibold">Start Date</th>
                <th className="p-3 font-semibold text-right">Salary</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length > 0 ? paginated.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors duration-100">
                  <td className="p-3 font-mono text-gray-400">{member.id}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.name} size="sm" />
                      <span className="font-semibold text-gray-800">{member.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ROLE_STYLES[member.role]}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{member.shift}</td>
                  <td className="p-3 text-gray-500">{member.phone}</td>
                  <td className="p-3 text-gray-500">{member.startDate}</td>
                  <td className="p-3 text-right font-semibold text-gray-800">₱{member.salary.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[member.status]}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal({ type: "view", staff: member })}
                        className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-white transition-colors">
                        View
                      </button>
                      <button onClick={() => setModal({ type: "edit", staff: member })}
                        className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-black hover:text-white transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setModal({ type: "delete", staff: member })}
                        className="px-2.5 py-1 text-[11px] font-medium text-gray-400 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-400">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${page === p ? "bg-black text-white border-black" : "border-gray-200 text-gray-600 hover:border-black"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}