import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../pages/Authcontext";

const navItems = [
  {
    section: "MAIN",
    links: [
      { label: "Dashboard", icon: "▪", href: "/dashboard" },
      { label: "Inventory", icon: "◈", href: "/inventory" },
      { label: "Management", icon: "⬡", href: "/management" },
    ],
  },
  {
    section: "OPERATIONS",
    links: [
      { label: "Add Stock", icon: "✎", href: "/add-stock" },
      // { label: "Low Stock Alerts", icon: "⚠", href: "/low-stock" },
    ],
  },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  // Get initials from user name or email
  const getInitials = () => {
    if (user?.fullName) {
      return user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <aside className="relative flex flex-col bg-white shadow-sm w-70 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-gray-200">
        <span className="tracking-tight text-xs font-bold text-black uppercase flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-3 h-3"
          >
            <rect x="2" y="2" width="20" height="20" strokeWidth="2" />
            <path d="M2 2L22 22M22 2L2 22" strokeWidth="2" strokeLinecap="square" />
          </svg>
          ¡Vamos Coffee
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="mb-2 px-4 text-[10px] font-semibold tracking-[0.25em] text-black">
              {group.section}
            </p>
            {group.links.map((item) => (
              <NavLink
                key={item.label}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2 mx-2 my-1 text-sm rounded-xl border border-gray-200 !text-black shadow-sm transition-all duration-150 ${
                    isActive
                      ? "bg-black text-white"
                      : "text-black hover:bg-black hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`text-base ${
                        isActive ? "text-white" : "group-hover:text-white"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`flex-1 tracking-wide text-xs uppercase font-medium ${
                        isActive ? "text-white" : "group-hover:text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-3 space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-black bg-black text-xs font-bold text-white">
            {getInitials()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-black uppercase tracking-wider">
              {user?.fullName || user?.email?.split("@")[0] || "User"}
            </p>
            <p className="truncate text-[10px] text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-150"
        >
          <span className="text-sm">↪</span>
          <span className="uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </aside>
  );
}