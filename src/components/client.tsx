"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signIn, signOut } from "next-auth/react";
import { refreshData, setLanguage, signOutDirectiva } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

export function LanguageSelect({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <span className="sr-only">{label}</span>
      <select
        value={lang}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setLanguage(e.target.value);
            router.refresh();
          })
        }
        className="rounded-md border border-line bg-surface-1 px-2 py-1 text-ink"
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}

export function RefreshButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await refreshData();
          router.refresh();
        })
      }
      className="rounded-md border border-line bg-surface-1 px-3 py-1 text-sm text-ink hover:border-accent disabled:opacity-60"
    >
      {pending ? "…" : "↻"} {label}
    </button>
  );
}

export function SignInButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/directiva" })}
      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
    >
      {label}
    </button>
  );
}

export function SignOutButton({ label, google }: { label: string; google: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOutDirectiva();
        if (google) await signOut({ callbackUrl: "/directiva" });
        else router.refresh();
      }}
      className="text-sm text-ink-2 underline underline-offset-2"
    >
      {label}
    </button>
  );
}
