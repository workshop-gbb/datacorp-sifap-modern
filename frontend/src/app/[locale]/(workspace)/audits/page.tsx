import WorkspacePage from "@/components/workspace-page";
import type { Search } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  return (
    <WorkspacePage
      params={params.then((value) => ({ ...value, section: "audits" }))}
      searchParams={searchParams}
    />
  );
}
