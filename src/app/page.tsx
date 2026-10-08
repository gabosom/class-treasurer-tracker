import { redirect } from "next/navigation";
import { FamiliesDashboard } from "@/components/FamiliesDashboard";
import { Header } from "@/components/Header";
import { Notice } from "@/components/ui";
import { directivaAccess, hasFamiliesAccess } from "@/lib/auth";
import { getSnapshot } from "@/lib/data";
import { getDict } from "@/lib/request";

export default async function FamiliesPage() {
  if (!(await hasFamiliesAccess())) redirect("/acceso");
  const { lang, t } = await getDict();
  const { snapshot } = await getSnapshot();
  const isDirectiva = (await directivaAccess()).state === "allowed";

  return (
    <>
      <Header t={t} lang={lang} fetchedAt={snapshot?.fetchedAt} active="families" showNav={isDirectiva} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Families never see Sheet errors; they see the last good numbers or a generic message. */}
        {snapshot ? (
          <FamiliesDashboard v={snapshot.view.families} t={t} lang={lang} />
        ) : (
          <Notice kind="warning">{t.noData}</Notice>
        )}
      </main>
    </>
  );
}
