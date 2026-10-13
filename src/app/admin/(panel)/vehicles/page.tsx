import type { Metadata } from "next";
import { z } from "zod";

import { VehicleManager } from "@/components/admin/catalog/vehicle-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { listAdminVehicleMakes, listAdminVehicleModels } from "@/server/queries/admin/catalog";

export const metadata: Metadata = { title: "Data kendaraan" };
export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ make?: string }>;
}) {
  await requireRole(["owner", "admin"]);
  const { make } = await searchParams;
  const makes = await listAdminVehicleMakes();
  const selectedId = make && z.uuid().safeParse(make).success ? make : makes[0]?.id;
  const selected = makes.find((m) => m.id === selectedId) ?? null;
  const models = selected ? await listAdminVehicleModels(selected.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data kendaraan"
        description="Merek dan model untuk pemilih kendaraan, Garasi pelanggan, dan kecocokan produk."
      />
      <VehicleManager makes={makes} selected={selected} models={models} />
    </div>
  );
}
