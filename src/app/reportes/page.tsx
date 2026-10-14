import { redirect } from "next/navigation";
import { FamiliesDashboard } from "@/components/FamiliesDashboard";
import { Header } from "@/components/Header";
import { Notice } from "@/components/ui";
import { directivaAccess } from "@/lib/auth";
import { getSnapshot } from "@/lib/data";
import { getDict } from "@/lib/request";

// "Reportes": the simple view the treasurer screenshots for the class group chat. Directiva-only (D16).
export default async function ReportsPage() {
  if ((await directivaAccess()).state !== "allowed") redirect("/directiva");
  const { lang, t } = await getDict();
  const { snapshot, error } = await getSnapshot();

  return (
    <>
      <Header t={t} lang={lang} fetchedAt={snapshot?.fetchedAt} active="reports" showNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {error && (
          <Notice kind="error">
            <strong>{snapshot ? t.dataError : t.dataErrorNone}</strong>
            <div className="mt-1 font-mono text-xs">{error}</div>
          </Notice>
        )}
        {snapshot && <FamiliesDashboard v={snapshot.view.families} t={t} lang={lang} />}
      </main>
    </>
  );
}
