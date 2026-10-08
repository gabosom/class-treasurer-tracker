import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { LedgerTable, studentNameMap } from "@/components/LedgerTable";
import { Card, Notice } from "@/components/ui";
import { directivaAccess } from "@/lib/auth";
import { getSnapshot } from "@/lib/data";
import { getDict } from "@/lib/request";
import { TXN_TYPES } from "@/lib/schema";

export default async function AllTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; fund?: string }>;
}) {
  if ((await directivaAccess()).state !== "allowed") redirect("/directiva");
  const { lang, t } = await getDict();
  const { snapshot, error } = await getSnapshot();
  const { type = "", fund = "" } = await searchParams;

  const v = snapshot?.view;
  const txns = (v?.txns ?? []).filter((x) => (!type || x.type === type) && (!fund || x.fundId === fund));
  const select = "rounded-md border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink";

  return (
    <>
      <Header t={t} lang={lang} fetchedAt={snapshot?.fetchedAt} active="directiva" showNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Link href="/directiva" className="text-sm text-accent underline underline-offset-2">
          ← {t.backToDirectiva}
        </Link>
        {error && <Notice kind="error">{error}</Notice>}
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-ink">{t.allTxns}</h2>
          {/* Plain GET form: filters live in the URL, so a filtered view can be bookmarked or shared. */}
          <form className="mb-4 flex flex-wrap items-center gap-2" action="/directiva/movimientos">
            <label className="sr-only" htmlFor="type">{t.type}</label>
            <select id="type" name="type" defaultValue={type} className={select}>
              <option value="">{t.allTypes}</option>
              {TXN_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t.txnType[x] ?? x}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="fund">{t.fund}</label>
            <select id="fund" name="fund" defaultValue={fund} className={select}>
              <option value="">{t.allFunds}</option>
              {(v?.funds ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white">{t.filter}</button>
            <span className="text-sm text-ink-3">{t.txnCount(txns.length)}</span>
          </form>
          {v && <LedgerTable txns={txns} studentNames={studentNameMap(v)} t={t} lang={lang} />}
        </Card>
      </main>
    </>
  );
}
