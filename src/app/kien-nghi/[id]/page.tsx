import { RecommendationDetailPanel } from "@/components/workflows/recommendation-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <RecommendationDetailPanel id={(await params).id} />;
}
