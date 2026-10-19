"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bike,
  Boxes,
  Cigarette,
  Coffee,
  CupSoda,
  Droplets,
  History,
  LayoutDashboard,
  Leaf,
  Package,
  PiggyBank,
  Settings,
  ShoppingBag,
  ShoppingBasket,
  SlidersHorizontal,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
  Warehouse,
  Wrench,
  LogOut,
} from "lucide-react";
import { navItemsForRole, ROLE_LABELS, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/timezone";
import { useEffect, useState } from "react";

const ICONS = {
  LayoutDashboard,
  Coffee,
  ShoppingBag,
  SlidersHorizontal,
  Droplets,
  Package,
  Warehouse,
  UtensilsCrossed,
  Wrench,
  Cigarette,
  CupSoda,
  Leaf,
  ShoppingBasket,
  Boxes,
  Bike,
  Truck,
  Users,
  PiggyBank,
  BarChart3,
  UserCog,
  History,
  Settings,
} as const;

type Props = {
  user: { fullName: string; role: Role; email: string };
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navItemsForRole(user.role);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-brand-900 text-slate-200">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">MBC</p>
          <h1 className="mt-1 font-display text-lg font-semibold text-white">Marouane Business Center</h1>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS];
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-medium text-white">{user.fullName}</p>
          <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>
      <div className="pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-8 py-3 backdrop-blur">
          <p className="text-sm text-slate-500">Logiciel de gestion — Café, Eau, Transport</p>
          <p className="text-sm font-medium text-slate-700">{formatDateTime(now)}</p>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
