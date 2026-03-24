"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navItems = [
    {
      href: "/inventory",
      label: "庫存管理",
      active: pathname === "/inventory",
    },
    {
      href: "/purchases",
      label: "採購管理",
      active: pathname?.startsWith("/purchases"),
    },
    {
      href: "/orders",
      label: "訂單管理",
      active: pathname?.startsWith("/orders"),
    },
    {
      href: "/reports",
      label: "財務報表",
      active: pathname?.startsWith("/reports"),
    },
  ];

  // If the user is on the sign-in page, you might want to hide the header
  if (pathname === "/api/auth/signin") return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            <Link href="/" className="text-2xl">
              🇹🇭 SYCHE{" "}
            </Link>
            <span className="ml-1 hidden text-lg font-normal text-slate-400 sm:ml-2 sm:inline">
              進銷存系統
            </span>
          </h1>
          <nav className="hidden md:flex gap-4 ml-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.active
                    ? "border-b-2 border-blue-600 pb-1 font-bold text-blue-600"
                    : "font-medium text-slate-500 transition-colors hover:text-blue-600"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden text-sm text-slate-500 sm:block">
          {session?.user && (
            <span className="text-slate-400 font-normal mr-2">
              {session.user.name ?? ""}
            </span>
          )}
          v1.2.0
        </div>
        <button
          type="button"
          aria-label="開啟選單"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 md:hidden"
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
      </div>
      <div
        className={`absolute left-0 right-0 z-50 overflow-hidden transition-all duration-500 ease-in-out md:hidden ${
          menuOpen
            ? "max-h-96 opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="border-y border-slate-200 bg-white px-4 py-3 shadow-lg">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.active
                    ? "block rounded-xl bg-blue-50 px-4 py-3 font-semibold text-blue-700"
                    : "block rounded-xl px-4 py-3 font-medium text-slate-600 hover:bg-slate-50"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-slate-100 px-4 pt-3 text-sm text-slate-500">
            {session?.user && (
              <div className="mb-1 text-slate-700">
                {session.user.name ?? ""}
              </div>
            )}
            <div>v1.2.0</div>
          </div>
        </div>
      </div>
    </header>
  );
}
