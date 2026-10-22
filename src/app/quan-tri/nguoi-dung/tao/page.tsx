import { UserEditor } from "@/components/admin/users";
import { requireAdminPageActor } from "@/components/admin/page-guard";
export default async function NewUserPage() {
  const actor = await requireAdminPageActor();
  return <UserEditor currentUserId={actor.userId} />;
}
