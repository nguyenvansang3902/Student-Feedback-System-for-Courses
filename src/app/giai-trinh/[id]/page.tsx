import { ImprovementDetailPanel } from "@/components/workflows/improvement-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ImprovementDetailPanel id={(await params).id} />;
}
