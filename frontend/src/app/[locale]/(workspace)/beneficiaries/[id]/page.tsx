import RecordPage from "@/components/record-page";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  return (
    <RecordPage
      params={params.then((p) => ({ ...p, section: "beneficiaries" }))}
    />
  );
}
