import {
  DeleteAccountCard,
  PasswordForm,
  ProfileForm,
  SessionsCard,
} from "@/components/account/profile-forms";
import { PageHeader } from "@/components/shared/page-header";
import { getMyProfile } from "@/server/queries/account";

export const metadata = { title: "Profil & keamanan" };

export default async function AccountProfilePage() {
  const profile = await getMyProfile();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profil & keamanan" className="pb-0" />
      <ProfileForm email={profile.email} fullName={profile.fullName} phone={profile.phone} />
      <PasswordForm />
      <SessionsCard />
      <DeleteAccountCard email={profile.email} />
    </div>
  );
}
