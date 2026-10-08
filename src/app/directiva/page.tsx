import { DirectivaDashboard } from "@/components/DirectivaDashboard";
import { Header } from "@/components/Header";
import { SignInButton, SignOutButton } from "@/components/client";
import { Notice } from "@/components/ui";
import { directivaAccess } from "@/lib/auth";
import { getSnapshot } from "@/lib/data";
import { getDict } from "@/lib/request";

export default async function DirectivaPage() {
  const { lang, t } = await getDict();
  const access = await directivaAccess();

  if (access.state !== "allowed") {
    return (
      <>
        <Header t={t} lang={lang} />
        <main className="mx-auto max-w-sm space-y-4 px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-ink">{t.directiva}</h2>
          {access.state === "denied" ? (
            <>
              <p className="text-sm text-ink-2">{t.denied(access.email)}</p>
              <SignOutButton label={t.signOut} />
            </>
          ) : (
            <>
              <p className="text-sm text-ink-2">{t.signInHelp}</p>
              <SignInButton label={t.signIn} />
            </>
          )}
        </main>
      </>
    );
  }

  const { snapshot, error } = await getSnapshot();
  return (
    <>
      <Header t={t} lang={lang} fetchedAt={snapshot?.fetchedAt} active="directiva" showNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {error && (
          <Notice kind="error">
            <strong>{snapshot ? t.dataError : t.dataErrorNone}</strong>
            <div className="mt-1 font-mono text-xs">{error}</div>
          </Notice>
        )}
        {snapshot && <DirectivaDashboard v={snapshot.view} t={t} lang={lang} />}
        <div className="pt-4 text-right">
          <span className="mr-3 text-xs text-ink-3">{access.email}</span>
          <SignOutButton label={t.signOut} />
        </div>
      </main>
    </>
  );
}
