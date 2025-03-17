"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, Lock, Activity, Settings, Menu, X, Radio } from "lucide-react";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Security", href: "/", icon: Shield },
  { name: "Network", href: "/network", icon: Activity },
  { name: "Port Dashboard", href: "/ports", icon: Radio },
  { name: "Vault", href: "/vault", icon: Lock },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar");
      const menuButton = document.getElementById("mobile-menu-button");

      if (
        isMobileMenuOpen &&
        sidebar &&
        menuButton &&
        !sidebar.contains(event.target as Node) &&
        !menuButton.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        id="mobile-menu-button"
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-purple-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 bg-gray-900/50 backdrop-blur-sm"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span className="sr-only">Open main menu</span>
        {isMobileMenuOpen ? (
          <X className="block h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="block h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden z-40" />
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-gray-900/80 backdrop-blur-lg border-r border-gray-800/50 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-gray-800/50 px-6">
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
              DarkGeeks Security
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-purple-500/10 text-purple-400"
                      : "text-gray-300 hover:bg-purple-500/5 hover:text-purple-400"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors duration-200",
                      isActive
                        ? "text-purple-400"
                        : "text-gray-400 group-hover:text-purple-400"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-800/50 p-4">
            <div className="flex items-center px-4 py-2 text-sm text-gray-400">
              <Shield className="mr-3 h-5 w-5" />
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
