import { PublicCardPage } from "@/components/public-card-page";

export default async function CardPage({
  params
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  return <PublicCardPage cardId={cardId} />;
}
