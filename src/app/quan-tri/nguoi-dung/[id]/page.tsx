import { notFound } from "next/navigation";
import { UserEditor } from "@/components/admin/users";
import { requireAdminPageActor } from "@/components/admin/page-guard";
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdminPageActor();
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  return <UserEditor userId={id} currentUserId={actor.userId} />;
}
