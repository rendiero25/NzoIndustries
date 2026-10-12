import { Car } from "lucide-react";

import { GarageList } from "@/components/account/garage-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleSelector } from "@/components/storefront/vehicle-selector";
import { listMyVehicles } from "@/server/queries/account";
import { getVehicleCatalog } from "@/server/queries/reference";
import { getActiveVehicle } from "@/server/queries/vehicle";

export const metadata = { title: "Garasi" };

export default async function AccountGaragePage() {
  const [vehicles, catalog, active] = await Promise.all([
    listMyVehicles(),
    getVehicleCatalog(),
    getActiveVehicle(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Garasi saya"
        description="Kendaraan aktif dipakai untuk menyaring part yang cocok di seluruh toko."
        className="pb-0"
      />

      <section
        aria-labelledby="add-vehicle"
        className="flex flex-col gap-3 rounded-xl border border-border p-4"
      >
        <h2 id="add-vehicle" className="text-base">
          Tambah kendaraan
        </h2>
        <VehicleSelector
          makes={catalog.makes}
          models={catalog.models}
          active={null}
          variant="compact"
        />
        <p className="text-caption text-muted-foreground">
          Kendaraan yang ditambahkan langsung jadi kendaraan aktif.
        </p>
      </section>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Garasi masih kosong"
          description="Tambahkan motor atau mobilmu supaya kami bisa menandai part yang cocok."
        />
      ) : (
        <GarageList
          vehicles={vehicles}
          active={active ? { modelId: active.modelId, year: active.year } : null}
        />
      )}
    </div>
  );
}
