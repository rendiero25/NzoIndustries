"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

import { formatRelativeDate, formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";

export type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  order_count: number;
  total_spent: number;
};

interface CustomerTableProps {
  customers: CustomerRow[];
  page: number;
  totalPages: number;
}

export function CustomerTable({ customers, page, totalPages }: CustomerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (customers.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <Users size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada pelanggan</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Pelanggan
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase md:table-cell">
                  Email
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                  No. HP
                </th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold text-foreground uppercase lg:table-cell">
                  Total Belanja
                </th>
                <th className="hidden px-4 py-3 text-center text-[10px] font-semibold text-foreground uppercase md:table-cell">
                  Order
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase xl:table-cell">
                  Bergabung
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {customers.map((customer) => {
                const initials = customer.full_name
                  ? customer.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "?";

                return (
                  <tr key={customer.id} className="transition-colors hover:bg-muted/30">
                    {/* Pelanggan */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {customer.avatar_url ? (
                            <Image
                              src={customer.avatar_url}
                              alt={customer.full_name ?? ""}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-foreground">
                              {initials}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {customer.full_name ?? (
                              <span className="text-foreground italic">Belum diisi</span>
                            )}
                          </p>
                          <p className="font-mono text-[11px] text-foreground">
                            {customer.id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-foreground">{customer.email ?? "—"}</span>
                    </td>

                    {/* No. HP */}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-sm text-foreground">{customer.phone ?? "—"}</span>
                    </td>

                    {/* Total Belanja */}
                    <td className="hidden px-4 py-3 text-right lg:table-cell">
                      <span className="text-xs font-semibold">
                        {customer.total_spent > 0 ? formatRupiah(customer.total_spent) : "—"}
                      </span>
                    </td>

                    {/* Order count */}
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      <span className="text-sm font-semibold">{customer.order_count}</span>
                    </td>

                    {/* Bergabung */}
                    <td className="hidden px-4 py-3 xl:table-cell">
                      <span className="text-xs text-foreground">
                        {formatRelativeDate(customer.created_at)}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="dark" size="sm">
                        <Link href={`/admin/customers/${customer.id}`}>Detail</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
