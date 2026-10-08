"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FAMILIES_COOKIE, codeMatches, familiesToken, hasFamiliesAccess } from "@/lib/auth";
import { SHEET_TAG } from "@/lib/data";
import { LANG_COOKIE, toLang } from "@/lib/i18n";

export async function setLanguage(lang: string) {
  (await cookies()).set(LANG_COOKIE, toLang(lang), { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
}

export async function refreshData() {
  if (!(await hasFamiliesAccess())) return;
  updateTag(SHEET_TAG); // next read fetches the Sheet again
}

export async function enterCode(_prev: { error: boolean }, form: FormData): Promise<{ error: boolean }> {
  const code = String(form.get("code") ?? "");
  if (!codeMatches(code)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return { error: true };
  }
  (await cookies()).set(FAMILIES_COOKIE, familiesToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  redirect("/");
}
