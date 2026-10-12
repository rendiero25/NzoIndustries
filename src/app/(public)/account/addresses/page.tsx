import { AddressBook } from "@/components/account/address-book";
import { PageHeader } from "@/components/shared/page-header";
import { requireAccountUser } from "@/server/queries/account";
import { getUserAddresses } from "@/server/queries/checkout";

export const metadata = { title: "Alamat" };

export default async function AccountAddressesPage() {
  const user = await requireAccountUser();
  const addresses = await getUserAddresses(user.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alamat"
        description="Alamat utama dipilih otomatis saat checkout."
        className="pb-0"
      />
      <AddressBook addresses={addresses} />
    </div>
  );
}
