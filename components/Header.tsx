"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // If the user is on the sign-in page, you might want to hide the header
  if (pathname === "/api/auth/signin") return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="text-2xl">🇹🇭</span> SYCHE{" "}
            {session?.user && (
              <span className="text-slate-400 font-normal text-lg ml-2">
                進銷存管理 - {session.user.name}
              </span>
            )}
          </h1>
          <nav className="hidden md:flex gap-4 ml-4">
            <Link
              href="/"
              className={
                pathname === "/"
                  ? "text-blue-600 font-bold border-b-2 border-blue-600 pb-1"
                  : "text-slate-500 hover:text-blue-600 font-medium transition-colors"
              }
            >
              庫存管理
            </Link>
            <Link
              href="/purchases"
              className={
                pathname?.startsWith("/purchases")
                  ? "text-blue-600 font-bold border-b-2 border-blue-600 pb-1"
                  : "text-slate-500 hover:text-blue-600 font-medium transition-colors"
              }
            >
              採購管理
            </Link>
            <Link
              href="/orders"
              className={
                pathname?.startsWith("/orders")
                  ? "text-blue-600 font-bold border-b-2 border-blue-600 pb-1"
                  : "text-slate-500 hover:text-blue-600 font-medium transition-colors"
              }
            >
              訂單管理
            </Link>
          </nav>
        </div>
        <div className="text-sm text-slate-500 hidden sm:block">v1.2.0</div>
      </div>
    </header>
  );
}
