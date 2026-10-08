import { Header } from "@/components/Header";
import { getDict } from "@/lib/request";
import { CodeForm } from "./CodeForm";

export default async function AccessPage() {
  const { lang, t } = await getDict();
  return (
    <>
      <Header t={t} lang={lang} />
      <main className="mx-auto max-w-sm px-4 py-12">
        <CodeForm scope="families" labels={{ code: t.enterCode, help: t.enterCodeHelp, enter: t.enter, wrong: t.wrongCode }} />
      </main>
    </>
  );
}
