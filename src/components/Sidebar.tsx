"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", roles: ["super_admin", "school_admin", "teacher", "student"] },
  { href: "/schools", label: "Schools", roles: ["super_admin"] },
  { href: "/teachers", label: "Teachers", roles: ["super_admin", "school_admin"] },
  { href: "/students", label: "Students", roles: ["super_admin", "school_admin", "teacher"] },
  { href: "/subjects", label: "Subjects", roles: ["super_admin", "school_admin", "teacher", "student"] },
  { href: "/attendance", label: "Attendance", roles: ["super_admin", "school_admin", "teacher", "student"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-full md:w-64 bg-gray-900 text-white md:min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold whitespace-nowrap">School ERP</h1>
          <p className="text-sm text-gray-400 mt-1 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user.role.replace("_", " ")}</p>
        </div>
        <button
          onClick={logout}
          className="md:hidden px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>

      <nav className="flex md:flex-col gap-1 md:gap-0 overflow-x-auto md:overflow-visible p-2 md:flex-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block shrink-0 px-4 py-2.5 rounded-lg md:mb-1 text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:block p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
