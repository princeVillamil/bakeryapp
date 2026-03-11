import { useState, useMemo, useEffect } from "react";
import { getStaffList, updateStaff, deactivateStaff } from "../api/apiFunctions";
import { supabase } from "../api/SupabaseClient";
import { useAuth } from "../pages/Authcontext";

const ALL_JOB_TITLES = ["All", "Baker", "Cashier", "Supervisor", "Delivery", "Cleaner"];
const ALL_STATUSES   = ["All", "Active", "On Leave", "Inactive"];
const ALL_SHIFTS     = ["Morning", "Afternoon", "Night"];
const ITEMS_PER_PAGE = 15;

const JOB_STYLES = {
  Baker:      "bg-amber-50 text-amber-700 border-amber-200",
  Cashier:    "bg-blue-50 text-blue-700 border-blue-200",
  Supervisor: "bg-purple-50 text-purple-700 border-purple-200",
  Delivery:   "bg-green-50 text-green-700 border-green-200",
  Cleaner:    "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_STYLES = {
  Active:     "bg-black text-white",
  "On Leave": "bg-gray-200 text-gray-700",
  Inactive:   "bg-gray-100 text-gray-400",
};

function Avatar({ name, size = "md" }) {
  const initials = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors   = ["bg-amber-100 text-amber-700","bg-blue-100 text-blue-700","bg-purple-100 text-purple-700","bg-green-100 text-green-700","bg-rose-100 text-rose-700"];
  const color    = colors[(name || "?").charCodeAt(0) % colors.length];
  const sz       = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-sm" : "w-9 h-9 text-xs";
  return <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>{initials}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-black">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors text-lg">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Edit form — only edits employment details, not auth fields
function StaffEditForm({ initial, onSave, onCancel }) {
  const [form,   setForm]   = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (f, v) => { setForm((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.name?.trim())  e.name  = "Name is required.";
    if (!form.phone?.trim()) e.phone = "Phone is required.";
    if (!form.salary || isNaN(Number(form.salary)) || Number(form.salary) <= 0) e.salary = "Enter a valid salary.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        salary: parseFloat(form.salary),
        startDate: form.startDate && form.startDate.includes("-")
          ? new Date(form.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : form.startDate,
      });
    } finally { setSaving(false); }
  };

  const Field = ({ label, field, type = "text", placeholder }) => (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={form[field] || ""} onChange={(e) => set(field, e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors[field] ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
      {errors[field] && <p className="text-xs text-red-400 mt-1">{errors[field]}</p>}
    </div>
  );

  const PillSelector = ({ label, field, options }) => (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button key={opt} onClick={() => set(field, opt)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${form[field] === opt ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
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
        <PillSelector label="Job Title" field="jobTitle" options={["Baker","Cashier","Supervisor","Delivery","Cleaner"]} />
        <PillSelector label="Shift"     field="shift"    options={ALL_SHIFTS} />
      </div>
      <Field label="Phone" field="phone" placeholder="+63 912 345 6789" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date" field="startDate" type="date" />
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Monthly Salary</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">₱</span>
            <input type="number" min="0" value={form.salary || ""} onChange={(e) => set("salary", e.target.value)}
              placeholder="0"
              className={`w-full pl-7 pr-3 py-2 text-sm text-black border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all ${errors.salary ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
          </div>
          {errors.salary && <p className="text-xs text-red-400 mt-1">{errors.salary}</p>}
        </div>
      </div>
      <PillSelector label="Employment Status" field="status" options={["Active","On Leave","Inactive"]} />
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes →"}
        </button>
      </div>
    </div>
  );
}

function DeactivateConfirm({ staff, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-800 mb-1">Deactivate {staff.name}?</h3>
      <p className="text-xs text-gray-400 mb-5">
        Their account will be revoked. They won't be able to log in.<br />
        <span className="font-mono">{staff.staffId}</span>
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        <button onClick={handleConfirm} disabled={loading}
          className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
          {loading ? "Deactivating..." : "Deactivate"}
        </button>
      </div>
    </div>
  );
}

// ── Pending Approvals ────────────────────────────────────────────────────────
function PendingApprovals({ onApproved }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, staff_id, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (!error) setPending(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleApprove = async (profile) => {
    setActing(profile.id);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", profile.id);

    if (!error) {
      setPending((prev) => prev.filter((p) => p.id !== profile.id));
      onApproved();
    }
    setActing(null);
  };

  const handleReject = async (id) => {
    setActing(id);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("id", id);

    if (!error) setPending((prev) => prev.filter((p) => p.id !== id));
    setActing(null);
  };

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 animate-pulse">
      <div className="h-3 w-32 bg-gray-100 rounded mb-3" />
      <div className="space-y-2">{Array(2).fill(0).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>
    </div>
  );

  if (pending.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold">Pending Approvals</p>
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">{pending.length}</span>
        </div>
        <p className="text-xs text-gray-400">New accounts awaiting activation</p>
      </div>
      <div className="space-y-2">
        {pending.map((profile) => (
          <div key={profile.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              : <Avatar name={profile.full_name || "?"} />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{profile.full_name}</p>
              <p className="text-[10px] text-gray-400 truncate">{profile.email}</p>
            </div>
            <p className="text-[10px] text-gray-400 shrink-0 hidden sm:block font-mono">{profile.staff_id}</p>
            <p className="text-[10px] text-gray-400 shrink-0 hidden sm:block">
              {new Date(profile.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => handleApprove(profile)} disabled={acting === profile.id}
                className="px-3 py-1.5 text-[11px] font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                {acting === profile.id ? "..." : "Approve"}
              </button>
              <button onClick={() => handleReject(profile.id)} disabled={acting === profile.id}
                className="px-3 py-1.5 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors disabled:opacity-50">
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Management() {
  const { user } = useAuth();
  const [staff,        setStaff]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [jobFilter,    setJobFilter]    = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getStaffList();
      setStaff(data);
    } catch (err) {
      setError("Failed to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => staff.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.name?.toLowerCase().includes(q) || s.staffId?.toLowerCase().includes(q) || s.jobTitle?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) &&
      (jobFilter    === "All" || s.jobTitle === jobFilter) &&
      (statusFilter === "All" || s.status   === statusFilter)
    );
  }), [staff, search, jobFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const resetPage  = () => setPage(1);

  const stats = useMemo(() => ({
    total:       staff.length,
    active:      staff.filter((s) => s.status === "Active").length,
    onLeave:     staff.filter((s) => s.status === "On Leave").length,
    monthlyCost: staff.filter((s) => s.status === "Active").reduce((sum, s) => sum + (s.salary || 0), 0),
  }), [staff]);

  const handleEdit = async (updated) => {
    try {
      const saved = await updateStaff(updated.id, updated);
      setStaff((prev) => prev.map((s) => s.id === saved.id ? saved : s));
      setModal(null);
    } catch (err) { setError("Failed to update. " + err.message); }
  };

  const handleDeactivate = async (id) => {
    try {
      await deactivateStaff(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setModal(null);
    } catch (err) { setError("Failed to deactivate. " + err.message); }
  };

  return (
    <div className="min-h-screen bg-white">
      {modal?.type === "edit" && (
        <Modal title="Edit Staff Member" onClose={() => setModal(null)}>
          <StaffEditForm initial={modal.staff} onSave={handleEdit} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "deactivate" && (
        <Modal title="Deactivate Staff" onClose={() => setModal(null)}>
          <DeactivateConfirm staff={modal.staff} onConfirm={() => handleDeactivate(modal.staff.id)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "view" && (
        <Modal title="Staff Details" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {modal.staff.avatarUrl
                ? <img src={modal.staff.avatarUrl} alt={modal.staff.name} className="w-12 h-12 rounded-full object-cover" />
                : <Avatar name={modal.staff.name || "?"} size="lg" />}
              <div>
                <p className="font-bold text-gray-800">{modal.staff.name}</p>
                <p className="text-xs font-mono text-gray-400">{modal.staff.staffId}</p>
                <p className="text-xs text-gray-400">{modal.staff.email}</p>
              </div>
              <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[modal.staff.status] || "bg-gray-100 text-gray-400"}`}>
                {modal.staff.status || "—"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ["Job Title",  modal.staff.jobTitle   || "—"],
                ["Shift",      modal.staff.shift       || "—"],
                ["Phone",      modal.staff.phone       || "—"],
                ["Start Date", modal.staff.startDate   || "—"],
                ...(user?.isAdmin ? [["Monthly Salary", modal.staff.salary ? `₱${modal.staff.salary?.toLocaleString()}` : "—"]] : []),
                ["Auth Role",  modal.staff.role],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 uppercase tracking-wider text-[10px]">{label}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            {user?.isAdmin && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal({ type: "edit", staff: modal.staff })}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                  Edit
                </button>
                <button onClick={() => setModal({ type: "deactivate", staff: modal.staff })}
                  className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
                  Deactivate
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      <div className="container p-4 mx-auto max-w-6xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Staff Management</h1>
            <p className="text-sm text-gray-400 mt-1">Manage bakery employees</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {user?.isAdmin && <PendingApprovals onApproved={load} />}

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

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="relative mb-3">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            </span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Search by name, ID, email or job title..."
              className="w-full pl-9 pr-4 py-2 text-sm text-black border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Job Title</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_JOB_TITLES.map((r) => (
                  <button key={r} onClick={() => { setJobFilter(r); resetPage(); }}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${jobFilter === r ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
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
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${statusFilter === s ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          Showing {paginated.length} of {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 uppercase tracking-wider">
                <th className="p-3 font-semibold">Staff ID</th>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Job Title</th>
                <th className="p-3 font-semibold">Shift</th>
                <th className="p-3 font-semibold">Contact</th>
                <th className="p-3 font-semibold">Start Date</th>
                {user?.isAdmin && <th className="p-3 font-semibold text-right">Salary</th>}
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}>{Array(user?.isAdmin ? 9 : 8).fill(0).map((_, j) => (
                    <td key={j} className="p-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : paginated.length > 0 ? paginated.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors duration-100">
                  <td className="p-3 font-mono text-gray-400">{member.staffId}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      {member.avatarUrl
                        ? <img src={member.avatarUrl} alt={member.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        : <Avatar name={member.name || "?"} size="sm" />}
                      <div>
                        <p className="font-semibold text-gray-800">{member.name}</p>
                        <p className="text-[10px] text-gray-400">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {member.jobTitle
                      ? <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${JOB_STYLES[member.jobTitle] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{member.jobTitle}</span>
                      : <span className="text-[10px] text-gray-400">—</span>}
                  </td>
                  <td className="p-3 text-gray-500">{member.shift || "—"}</td>
                  <td className="p-3 text-gray-500">{member.phone || "—"}</td>
                  <td className="p-3 text-gray-500">{member.startDate || "—"}</td>
                  {user?.isAdmin && (
                    <td className="p-3 text-right font-semibold text-gray-800">
                      {member.salary ? `₱${member.salary.toLocaleString()}` : "—"}
                    </td>
                  )}
                  <td className="p-3">
                    <span className={`px-2.5 py-1 font-semibold rounded-full text-[11px] ${STATUS_STYLES[member.status] || "bg-gray-100 text-gray-400"}`}>
                      {member.status || "—"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal({ type: "view", staff: member })}
                        className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-black transition-colors">
                        View
                      </button>
                      {user?.isAdmin && (
                        <>
                          <button onClick={() => setModal({ type: "edit", staff: member })}
                            className="px-2.5 py-1 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors">
                            Edit
                          </button>
                          <button onClick={() => setModal({ type: "deactivate", staff: member })}
                            className="px-2.5 py-1 text-[11px] font-medium text-gray-400 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-400 transition-colors">
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={user?.isAdmin ? 9 : 8} className="p-10 text-center text-gray-400">No staff members found.</td></tr>
              )}
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