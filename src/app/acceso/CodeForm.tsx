"use client";

import { useActionState } from "react";
import { enterDirectivaCode, enterFamiliesCode } from "@/app/actions";

const ACTIONS = { families: enterFamiliesCode, directiva: enterDirectivaCode };

export function CodeForm({
  scope,
  labels,
}: {
  scope: keyof typeof ACTIONS;
  labels: { code: string; help: string; enter: string; wrong: string };
}) {
  const [state, action, pending] = useActionState(ACTIONS[scope], { error: false });
  return (
    <form action={action} className="space-y-3 rounded-xl border border-line bg-surface-1 p-5 text-left">
      <label className="block">
        <span className="text-sm font-medium text-ink">{labels.code}</span>
        <input
          name="code"
          type="password"
          autoComplete="off"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-line bg-surface-0 px-3 py-2 text-ink"
        />
      </label>
      <p className="text-xs text-ink-3">{labels.help}</p>
      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {labels.wrong}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {labels.enter}
      </button>
    </form>
  );
}
