import { useState } from "react";
import { useAuth } from "./Authcontext";
import { supabase } from "../lib/supabase";

const ROLE_STYLES = {
  Baker: "bg-amber-50 text-amber-700 border-amber-200",
  Cashier: "bg-blue-50 text-blue-700 border-blue-200",
  Supervisor: "bg-purple-50 text-purple-700 border-purple-200",
  Delivery: "bg-green-50 text-green-700 border-green-200",
  Cleaner: "bg-gray-100 text-gray-600 border-gray-200",
};

function Avatar({ name }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-amber-100 text-amber-700", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-rose-100 text-rose-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center text-xl font-bold`}>
      {initials}
    </div>
  );
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-white">
      <div className="container p-4 mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black tracking-tight">My Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Your staff information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Top banner */}
          <div className="bg-black h-20" />

          {/* Avatar + name */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-8 mb-4">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar"
                  className="w-16 h-16 rounded-full border-4 border-white object-cover" />
              ) : (
                <div className="border-4 border-white rounded-full">
                  <Avatar name={profile.name} />
                </div>
              )}
              <div className="mb-1">
                <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ROLE_STYLES[profile.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {profile.role}
                  </span>
                  <span className="text-xs text-gray-400">{profile.shift} shift</span>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                ["Staff ID", profile.staff_id],
                ["Status", profile.status],
                ["Email", profile.email],
                ["Start Date", profile.start_date],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{value || "—"}</p>
                </div>
              ))}
            </div>

            {/* Editable phone */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Phone Number</p>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)}
                    className="text-xs font-medium text-gray-500 hover:text-black transition-colors">
                    Edit
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 912 345 6789"
                    className="w-full px-3 py-2 text-sm text-black border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setIsEditing(false); setPhone(profile.phone || ""); }}
                      className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-800">{profile.phone || "Not set"}</p>
              )}
            </div>

            {success && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 text-center">
                Profile updated successfully
              </div>
            )}
          </div>
        </div>

        {/* Read-only note */}
        <p className="text-xs text-gray-400 text-center mt-4">
          To update your role, shift, or salary, contact an admin.
        </p>
      </div>
    </div>
  );
}