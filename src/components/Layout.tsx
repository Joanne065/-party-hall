import { Outlet, NavLink } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, LayoutGrid, Settings, LogOut } from "lucide-react";

export function Layout() {
  const { isAdmin, logout } = useAuth();

  const navItems = [
    { to: "/calendar", label: "日历", icon: Calendar },
    { to: "/events", label: "发现", icon: LayoutGrid },
    { to: "/settings", label: "设置", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight" style={{ color: "#FF2442", fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif' }}>
              派对大厅
            </span>
            {isAdmin && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-500">
                管理员
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ${
                    isActive ? "font-medium bg-black/5" : "text-gray-400 hover:text-gray-600"
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? "#333" : undefined,
                })}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm ml-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 bg-white">
        <Outlet />
      </main>
    </div>
  );
}
