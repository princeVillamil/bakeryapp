import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../pages/Authcontext";

const NAV_ITEMS = [
  {
    section: "MAIN",
    links: [
      { label: "Dashboard",  icon: "▪", href: "/dashboard"  },
      { label: "Inventory",  icon: "◈", href: "/inventory"  },
      { label: "Management", icon: "⬡", href: "/management" },
    ],
  },
  {
    section: "OPERATIONS",
    links: [
      { label: "Add Stock", icon: "✎", href: "/add-stock", adminOnly: true },
    ],
  },
];

export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const getInitials = () => {
    if (user?.fullName) return user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  // Don't render navbar while auth is still resolving
  if (isLoading) return null;

  return (
    <aside className="flex flex-col bg-white w-56 shrink-0 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-gray-200 gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 shrink-0">
          <rect x="2" y="2" width="20" height="20" strokeWidth="2" />
          <path d="M2 2L22 22M22 2L2 22" strokeWidth="2" strokeLinecap="square" />
        </svg>
        <span className="text-[11px] font-bold text-black uppercase tracking-widest">¡Vamos Coffee</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_ITEMS.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="mb-2 px-4 text-[10px] font-semibold tracking-[0.2em] text-gray-400 uppercase">{group.section}</p>
            {group.links.map((item) => {
              if (item.adminOnly && !user?.isAdmin) return null;
              return (
                <NavLink key={item.label} to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 mx-2 my-0.5 text-sm rounded-xl border transition-all duration-150 ${
                      isActive ? "bg-black text-white border-black" : "text-gray-600 border-gray-200 hover:bg-black hover:text-white hover:border-black"
                    }`
                  }>
                  {({ isActive }) => (
                    <>
                      <span className={`text-base ${isActive ? "text-white" : "group-hover:text-white"}`}>{item.icon}</span>
                      <span className={`flex-1 text-xs uppercase font-medium tracking-wide ${isActive ? "text-white" : "group-hover:text-white"}`}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 p-3 space-y-3">
        <div className="flex items-center gap-3">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.fullName} className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" />
            : (
              <div className="w-8 h-8 rounded border border-black bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials()}
              </div>
            )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[11px] font-semibold text-black uppercase tracking-wider">
                {user?.fullName || user?.email?.split("@")[0] || "User"}
              </p>
              {user?.isAdmin && (
                <span className="shrink-0 px-1 py-0.5 text-[8px] font-bold bg-black text-white rounded">ADMIN</span>
              )}
            </div>
            <p className="truncate text-[10px] text-gray-400">{user?.staffId || user?.email}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all">
          <span className="text-sm">↪</span>
          <span className="uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </aside>
  );
}