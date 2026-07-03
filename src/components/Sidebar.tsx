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
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">School ERP</h1>
        <p className="text-sm text-gray-400 mt-1">{user.name}</p>
        <p className="text-xs text-gray-500 capitalize">{user.role.replace("_", " ")}</p>
      </div>

      <nav className="flex-1 p-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
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

      <div className="p-4 border-t border-gray-700">
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
