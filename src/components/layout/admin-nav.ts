import {
  BarChart3,
  Boxes,
  FileBarChart,
  FileUp,
  Image as ImageIcon,
  LayoutList,
  Package,
  RotateCcw,
  Settings,
  ShoppingBag,
  Star,
  Tags,
  Ticket,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { StaffRole } from "@/lib/auth/access";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: readonly StaffRole[];
  exact?: boolean;
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

const ALL: readonly StaffRole[] = ["owner", "admin", "warehouse", "cs"];
const MANAGERS: readonly StaffRole[] = ["owner", "admin"];

/**
 * Menu panel admin per role (matriks RBAC di plan Fase 1 / CLAUDE.md).
 * Menyembunyikan menu hanya untuk kenyamanan; akses sebenarnya dijaga RLS
 * dan guard server di tiap halaman.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Ringkasan",
    items: [{ label: "Dashboard", href: "/admin", icon: BarChart3, roles: ALL, exact: true }],
  },
  {
    label: "Penjualan",
    items: [
      { label: "Pesanan", href: "/admin/orders", icon: ShoppingBag, roles: ALL },
      {
        label: "Retur & garansi",
        href: "/admin/returns",
        icon: RotateCcw,
        roles: ["owner", "admin", "cs"],
      },
      {
        label: "Pelanggan",
        href: "/admin/customers",
        icon: Users,
        roles: ["owner", "admin", "cs"],
      },
      { label: "Ulasan", href: "/admin/reviews", icon: Star, roles: ["owner", "admin", "cs"] },
    ],
  },
  {
    label: "Katalog",
    items: [
      { label: "Produk", href: "/admin/products", icon: Package, roles: MANAGERS },
      { label: "Kategori", href: "/admin/categories", icon: LayoutList, roles: MANAGERS },
      { label: "Brand", href: "/admin/brands", icon: Tags, roles: MANAGERS },
      { label: "Stok", href: "/admin/stock", icon: Boxes, roles: ["owner", "admin", "warehouse"] },
      { label: "Import produk", href: "/admin/import", icon: FileUp, roles: MANAGERS },
    ],
  },
  {
    label: "Promo & konten",
    items: [
      { label: "Voucher", href: "/admin/coupons", icon: Ticket, roles: MANAGERS },
      { label: "Flash sale", href: "/admin/promotions/flash-sale", icon: Zap, roles: MANAGERS },
      { label: "Banner", href: "/admin/banners", icon: ImageIcon, roles: MANAGERS },
    ],
  },
  {
    label: "Toko",
    items: [
      { label: "Laporan", href: "/admin/reports", icon: FileBarChart, roles: MANAGERS },
      { label: "Pengaturan", href: "/admin/settings", icon: Settings, roles: MANAGERS },
    ],
  },
];

export function navForRole(role: StaffRole): AdminNavGroup[] {
  return ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Admin",
  warehouse: "Gudang",
  cs: "Customer service",
};

/** Label breadcrumb dari segmen URL. */
export const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  import: "Import produk",
  images: "Foto",
  products: "Produk",
  brands: "Brand",
  categories: "Kategori",
  orders: "Pesanan",
  customers: "Pelanggan",
  reviews: "Ulasan",
  complaints: "Komplain",
  returns: "Retur & garansi",
  coupons: "Voucher",
  promotions: "Promo",
  banners: "Banner",
  "main-banner": "Banner utama",
  "flash-sale": "Flash sale",
  "home-sections": "Tampilan beranda",
  reports: "Laporan",
  stock: "Stok",
  notifications: "Notifikasi",
  settings: "Pengaturan",
  new: "Baru",
  edit: "Ubah",
};
