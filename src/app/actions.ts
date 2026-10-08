"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, COOKIE_MAX_AGE, codeMatches, codeToken, hasFamiliesAccess } from "@/lib/auth";
import { SHEET_TAG } from "@/lib/data";
import { LANG_COOKIE, toLang } from "@/lib/i18n";

export async function setLanguage(lang: string) {
  (await cookies()).set(LANG_COOKIE, toLang(lang), { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
}

export async function refreshData() {
  if (!(await hasFamiliesAccess())) return;
  updateTag(SHEET_TAG); // next read fetches the Sheet again
}

async function enter(scope: "families" | "directiva", form: FormData, to: string): Promise<{ error: boolean }> {
  if (!codeMatches(scope, String(form.get("code") ?? ""))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return { error: true };
  }
  (await cookies()).set(COOKIE[scope], codeToken(scope), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE[scope],
    path: "/",
  });
  redirect(to);
}

export async function enterFamiliesCode(_prev: { error: boolean }, form: FormData) {
  return enter("families", form, "/");
}

export async function enterDirectivaCode(_prev: { error: boolean }, form: FormData) {
  return enter("directiva", form, "/directiva");
}

/** Clears the directiva code cookie. Google sessions are signed out client-side by next-auth. */
export async function signOutDirectiva() {
  (await cookies()).delete(COOKIE.directiva);
}
