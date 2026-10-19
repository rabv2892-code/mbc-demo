export type Role = "SUPER_ADMIN" | "ADMIN_CAFE" | "MOTARD";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_CAFE: "Vendeur café",
  MOTARD: "Livreur",
};

const SELLER = ["SUPER_ADMIN", "ADMIN_CAFE"] as Role[];
const ADMIN = ["SUPER_ADMIN"] as Role[];

export const PERMISSIONS = {
  users: { manage: ADMIN },
  cafe: { access: SELLER },
  water: { access: SELLER },
  lipton: { access: SELLER },
  transport: {
    admin: ADMIN,
    ownDeliveries: ["SUPER_ADMIN", "MOTARD"] as Role[],
  },
  reports: { access: ADMIN },
  audit: { access: ADMIN },
  settings: { access: ADMIN },
  dashboard: { access: ADMIN },
  purchases: { access: ADMIN },
  catalog: { manage: ADMIN },
} as const;

const SELLER_EXACT = ["/cafe", "/water", "/lipton", "/cigarettes", "/juice"];
const SELLER_PREFIXES = [
  "/cafe/sales",
  "/water/sales",
  "/lipton/sales",
  "/cigarettes/sales",
  "/juice/sales",
];

export function hasRole(user: { role: Role }, roles: readonly Role[]): boolean {
  return roles.includes(user.role);
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "SUPER_ADMIN") return true;

  if (role === "ADMIN_CAFE") {
    if (SELLER_EXACT.includes(pathname)) return true;
    return SELLER_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
  }

  if (role === "MOTARD") {
    return matchesPrefix(pathname, "/transport/deliveries") || matchesPrefix(pathname, "/my-deliveries");
  }

  return false;
}

export function homePathForRole(role: Role): string {
  if (role === "MOTARD") return "/transport/deliveries";
  if (role === "ADMIN_CAFE") return "/cafe/sales";
  return "/dashboard";
}

export function navItemsForRole(role: Role) {
  const items = [
    { href: "/dashboard", label: "Tableau de bord", icon: "LayoutDashboard", roles: ADMIN },
    { href: "/cafe/sales", label: "Ventes café", icon: "Coffee", roles: SELLER },
    { href: "/cafe/purchases", label: "Achats café", icon: "ShoppingBag", roles: ADMIN },
    { href: "/cafe/settings", label: "Paramètres café", icon: "SlidersHorizontal", roles: ADMIN },
    { href: "/cafe/stock", label: "Stock café", icon: "Warehouse", roles: ADMIN },
    { href: "/supplies", label: "Tasses & cuillères", icon: "UtensilsCrossed", roles: ADMIN },
    { href: "/machines", label: "Machines", icon: "Wrench", roles: ADMIN },
    { href: "/water/sales", label: "Ventes eau", icon: "Droplets", roles: SELLER },
    { href: "/water/purchases", label: "Achats eau", icon: "Package", roles: ADMIN },
    { href: "/water/stock", label: "Stock eau", icon: "Warehouse", roles: ADMIN },
    { href: "/lipton/sales", label: "Ventes Lipton", icon: "Leaf", roles: SELLER },
    { href: "/lipton/purchases", label: "Achats Lipton", icon: "ShoppingBasket", roles: ADMIN },
    { href: "/lipton/stock", label: "Stock Lipton", icon: "Boxes", roles: ADMIN },
    { href: "/cigarettes/sales", label: "Ventes cigarettes", icon: "Cigarette", roles: SELLER },
    { href: "/cigarettes/purchases", label: "Achats cigarettes", icon: "ShoppingBasket", roles: ADMIN },
    { href: "/cigarettes/types", label: "Types cigarettes", icon: "SlidersHorizontal", roles: ADMIN },
    { href: "/juice/sales", label: "Ventes jus", icon: "CupSoda", roles: SELLER },
    { href: "/juice/purchases", label: "Achats jus", icon: "ShoppingBasket", roles: ADMIN },
    { href: "/juice/types", label: "Types de jus", icon: "SlidersHorizontal", roles: ADMIN },
    { href: "/transport/deliveries", label: "Livraisons", icon: "Truck", roles: ["SUPER_ADMIN", "MOTARD"] as Role[] },
    { href: "/transport/motorcycles", label: "Motos", icon: "Bike", roles: ADMIN },
    { href: "/transport/riders", label: "Livreurs", icon: "Users", roles: ADMIN },
    { href: "/transport/amortization", label: "Amortissement", icon: "PiggyBank", roles: ADMIN },
    { href: "/reports", label: "Rapports", icon: "BarChart3", roles: ADMIN },
    { href: "/users", label: "Utilisateurs", icon: "UserCog", roles: ADMIN },
    { href: "/audit", label: "Historique", icon: "History", roles: ADMIN },
    { href: "/settings", label: "Paramètres", icon: "Settings", roles: ADMIN },
  ];
  return items.filter((item) => item.roles.includes(role));
}
