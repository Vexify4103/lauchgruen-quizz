import { ObsClient } from "./ObsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SearchParams {
  chat?: string;
  hidecam?: string;
  hideself?: string;
  nosfx?: string;
  compact?: string;
}

export default async function ObsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { gameId } = await params;
  const sp = await searchParams;
  return (
    <ObsClient
      gameId={gameId}
      chatChannel={sp.chat ?? sp.hideself}
      hideCamera={sp.hidecam}
      compact={sp.compact === "1"}
    />
  );
}
