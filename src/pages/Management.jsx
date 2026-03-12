import { useState, useMemo, useEffect } from "react";
import { getStaffList, getPendingStaff, approveStaff, rejectStaff, updateStaff, deleteStaff } from "../api/apiFunctions";
import { useAuth } from "./Authcontext";
import { supabase } from "../lib/supabase";

const ALL_ROLES = ["All", "Baker", "Cashier", "Supervisor", "Delivery", "Cleaner"];
const ALL_STATUSES = ["All", "Active", "On Leave", "Inactive"];
const ALL_SHIFTS = ["Morning", "Afternoon", "Night"];
const ITEMS_PER_PAGE = 15;

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
  Pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Rejected: "bg-red-50 text-red-500",
};

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
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Admin-only full edit form
function AdminStaffForm({ initial, onSave, onCancel }) {
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
    if (!form.salary || isNaN(Number(form.salary)) || Number(form.salary) <= 0) e.salary = "Enter a valid salary.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ ...form, salary: parseFloat(form.salary) });
  };

  const Field = ({ label, field, type = "text", placeholder }) => (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
        {label} <span className="text-black">*</span>
      </label>
      <input type={type} value={form[field]} onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${errors[field] ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
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
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          Monthly Salary <span className="text-black">*</span>
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">₱</span>
          <input type="number" min="0" value={form.salary} onChange={(e) => set("salary", e.target.value)}
            placeholder="0"
            className={`w-full pl-7 pr-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.salary ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
        </div>
        {errors.salary && <p className="text-xs text-red-400 mt-1">{errors.salary}</p>}
      </div>
      <PillSelector label="Status" field="status" options={["Active", "On Leave", "Inactive"]} />
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
          Save Changes →
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
      <p className="text-xs text-gray-400 mb-5">
        This will permanently delete <span className="font-mono">{staff.id}</span> from staff records.
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">Remove</button>
      </div>
    </div>
  );
}

// Admin view modal — full info + promote button
function AdminViewModal({ staff, onEdit, onDelete, onPromote, onDemote, isSelf }) {
  const [promoting, setPromoting] = useState(false);

  const handlePromoteToggle = async () => {
    setPromoting(true);
    try {
      if (staff.isAdmin) {
        await onDemote(staff.uuid);
      } else {
        await onPromote(staff.uuid);
      }
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar name={staff.name} />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800">{staff.name}</p>
            {staff.isAdmin && (
              <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 rounded-full uppercase">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-gray-400">{staff.id}</p>
        </div>
        <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[staff.status]}`}>
          {staff.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          ["Role", staff.role],
          ["Shift", staff.shift],
          ["Phone", staff.phone],
          ["Email", staff.email],
          ["Start Date", staff.startDate],
          ["Monthly Salary", `₱${staff.salary?.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 uppercase tracking-wider text-[10px]">{label}</p>
            <p className="font-semibold text-gray-800 mt-0.5">{value || "—"}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onEdit}
          className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
          Edit
        </button>
        <button onClick={onDelete}
          className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
          Remove
        </button>
      </div>

      {/* Promote / demote — can't change your own admin status */}
      {!isSelf && (
        <button
          onClick={handlePromoteToggle}
          disabled={promoting}
          className={`w-full px-4 py-2 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
            staff.isAdmin
              ? "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"
              : "border-gray-200 text-gray-500 hover:border-black hover:text-black"
          }`}
        >
          {promoting
            ? "Updating..."
            : staff.isAdmin
            ? "↓ Remove Admin Access"
            : "↑ Promote to Admin"
          }
        </button>
      )}
    </div>
  );
}

// Staff view modal — limited info, no salary
function StaffViewModal({ staff }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar name={staff.name} />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800">{staff.name}</p>
            {staff.isAdmin && (
              <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 rounded-full uppercase">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-gray-400">{staff.id}</p>
        </div>
        <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[staff.status]}`}>
          {staff.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          ["Role", staff.role],
          ["Shift", staff.shift],
          ["Phone", staff.phone || "—"],
          ["Start Date", staff.startDate],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 uppercase tracking-wider text-[10px]">{label}</p>
            <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Management() {
  const { isAdmin, user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [pending, setPending] = useState([]);
  const [activeTab, setActiveTab] = useState("staff");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [staffData, pendingData] = await Promise.all([
        getStaffList(),
        isAdmin ? getPendingStaff() : Promise.resolve([]),
      ]);
      setStaff(staffData);
      setPending(pendingData);
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [isAdmin]);

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
    // Only compute monthly cost for admins
    monthlyCost: staff.filter((s) => s.status === "Active").reduce((sum, s) => sum + (s.salary || 0), 0),
  }), [staff]);

  const handleEdit = async (updated) => {
    try {
      await updateStaff(updated.uuid, updated);
      await loadData();
      setModal(null);
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleDelete = async (uuid) => {
    try {
      await deleteStaff(uuid);
      await loadData();
      setModal(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleApprove = async (uuid) => {
    try {
      await approveStaff(uuid);
      await loadData();
    } catch (err) {
      console.error("Failed to approve:", err);
    }
  };

  const handleReject = async (uuid) => {
    try {
      await rejectStaff(uuid);
      await loadData();
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  };

  const handlePromote = async (uuid) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", uuid);
    if (error) throw error;
    await loadData();
    setModal(null);
  };

  const handleDemote = async (uuid) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: false })
      .eq("id", uuid);
    if (error) throw error;
    await loadData();
    setModal(null);
  };

  const resetPage = () => setPage(1);

  return (
    <div className="min-h-screen bg-white">

      {/* Modals */}
      {modal?.type === "view" && isAdmin && (
        <Modal title="Staff Details" onClose={() => setModal(null)}>
          <AdminViewModal
            staff={modal.staff}
            isSelf={modal.staff.uuid === user?.id}
            onEdit={() => setModal({ type: "edit", staff: modal.staff })}
            onDelete={() => setModal({ type: "delete", staff: modal.staff })}
            onPromote={handlePromote}
            onDemote={handleDemote}
          />
        </Modal>
      )}
      {modal?.type === "view" && !isAdmin && (
        <Modal title="Staff Details" onClose={() => setModal(null)}>
          <StaffViewModal staff={modal.staff} />
        </Modal>
      )}
      {modal?.type === "edit" && isAdmin && (
        <Modal title="Edit Staff Member" onClose={() => setModal(null)}>
          <AdminStaffForm initial={modal.staff} onSave={handleEdit} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "delete" && isAdmin && (
        <Modal title="Confirm Removal" onClose={() => setModal(null)}>
          <DeleteConfirm
            staff={modal.staff}
            onConfirm={() => handleDelete(modal.staff.uuid)}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      <div className="container p-4 mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">
              {isAdmin ? "Staff Management" : "Team"}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin ? "Manage bakery employees" : "Your colleagues"}
            </p>
          </div>
        </div>

        {/* Stats — salary hidden from staff */}
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
          {isAdmin ? (
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Monthly Cost</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                ₱{(stats.monthlyCost / 1000).toFixed(0)}k
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Inactive</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {staff.filter((s) => s.status === "Inactive").length}
              </p>
            </div>
          )}
        </div>

        {/* Admin tabs */}
        {isAdmin && (
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            <button onClick={() => setActiveTab("staff")}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px ${activeTab === "staff" ? "border-black text-white" : "border-transparent text-gray-500 hover:text-white"}`}>
              Staff List
            </button>
            <button onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px ${activeTab === "pending" ? "border-black text-white" : "border-transparent text-gray-500 hover:text-white"}`}>
              Pending Approvals
              {pending.length > 0 && (
                <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pending.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Pending approvals tab */}
        {activeTab === "pending" && isAdmin && (
          <div>
            {isLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
            ) : pending.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((member) => (
                  <div key={member.uuid} className="flex items-center gap-4 p-4 bg-white rounded-xl border shadow-sm">
                    <Avatar name={member.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                      <p className="text-[10px] font-mono text-gray-300 mt-0.5">
                        {member.id} · Registered {member.startDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleReject(member.uuid)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
                        Reject
                      </button>
                      <button onClick={() => handleApprove(member.uuid)}
                        className="px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Staff list tab */}
        {activeTab === "staff" && (
          <>
            {/* Search + Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
              <div className="relative mb-3">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                  </svg>
                </span>
                <input type="text" value={search}
                  onChange={(e) => { setSearch(e.target.value); resetPage(); }}
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
                {isAdmin && (
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
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Showing {paginated.length} of {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
            </p>

            {/* Table — columns differ by role */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-500 uppercase tracking-wider">
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold">Shift</th>
                    <th className="p-3 font-semibold">Contact</th>
                    {isAdmin && (
                      <>
                        <th className="p-3 font-semibold">Start Date</th>
                        <th className="p-3 font-semibold text-right">Salary</th>
                      </>
                    )}
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 7} className="p-10 text-center text-gray-400">Loading...</td>
                    </tr>
                  ) : paginated.length > 0 ? paginated.map((member) => (
                    <tr key={member.uuid} className="hover:bg-gray-50 transition-colors duration-100">
                      <td className="p-3 font-mono text-gray-400">{member.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={member.name} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-800">{member.name}</span>
                              {member.isAdmin && (
                                <span className="text-[8px] font-bold bg-black text-white px-1 py-0.5 rounded-full uppercase">
                                  Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ROLE_STYLES[member.role]}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{member.shift}</td>
                      <td className="p-3 text-gray-500">{member.phone || "—"}</td>
                      {isAdmin && (
                        <>
                          <td className="p-3 text-gray-500">{member.startDate}</td>
                          <td className="p-3 text-right font-semibold text-gray-800">
                            ₱{member.salary?.toLocaleString()}
                          </td>
                        </>
                      )}
                      <td className="p-3">
                        <span className={`px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[member.status]}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setModal({ type: "view", staff: member })}
                            className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-black transition-colors">
                            View
                          </button>
                          {isAdmin && (
                            <>
                              <button onClick={() => setModal({ type: "edit", staff: member })}
                                className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors">
                                Edit
                              </button>
                              <button onClick={() => setModal({ type: "delete", staff: member })}
                                className="px-2.5 py-1 text-[11px] font-medium text-gray-400 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 7} className="p-10 text-center text-gray-400">
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
          </>
        )}
      </div>
    </div>
  );
}