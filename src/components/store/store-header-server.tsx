import { getCategoryTree, getVehicleCatalog } from "@/server/queries/reference";
import { getActiveVehicle } from "@/server/queries/vehicle";

import { StoreHeader, type HeaderCategory } from "./store-header";

type Props = {
  showCategoryNav?: boolean;
  showBorder?: boolean;
};

/** Header storefront + data server (pohon kategori, kendaraan, Garasi aktif). */
export async function StoreHeaderServer({ showCategoryNav, showBorder }: Props) {
  const [tree, vehicles, active] = await Promise.all([
    getCategoryTree().catch(() => []),
    getVehicleCatalog().catch(() => ({ makes: [], models: [] })),
    getActiveVehicle().catch(() => null),
  ]);

  const categories: HeaderCategory[] = tree
    .filter((c) => c.slug !== "belum-dikategorikan")
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      children: c.children.map((x) => ({ slug: x.slug, name: x.name })),
    }));

  return (
    <StoreHeader
      categories={categories}
      garage={{
        makes: vehicles.makes,
        models: vehicles.models,
        active: active
          ? {
              modelId: active.modelId,
              year: active.year,
              label: active.label,
              shortLabel: active.shortLabel,
            }
          : null,
      }}
      showCategoryNav={showCategoryNav}
      showBorder={showBorder}
    />
  );
}
