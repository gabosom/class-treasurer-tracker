import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { getSnapshot, isDemo } from "./data";

// Access model (docs/DESIGN.md §7):
// - Families: shared class code (FAMILIES_CODE) → signed cookie.
// - Directiva: shared directiva code (DIRECTIVA_CODE) and/or Google sign-in (AUTH_GOOGLE_ID)
//   restricted to the emails in the Sheet's Config tab.
// - Demo mode (no SHEET_ID): fictional data, no sign-in.

type Scope = "families" | "directiva";

const CODE_ENV: Record<Scope, string> = { families: "FAMILIES_CODE", directiva: "DIRECTIVA_CODE" };
export const COOKIE: Record<Scope, string> = { families: "fam", directiva: "dir" };
export const COOKIE_MAX_AGE: Record<Scope, number> = {
  families: 60 * 60 * 24 * 180,
  directiva: 60 * 60 * 24 * 30,
};

const normalize = (s: string) => s.trim().toLowerCase();

/** The configured code, or null. The directiva code is ignored if it equals the families code. */
function configuredCode(scope: Scope): string | null {
  const code = process.env[CODE_ENV[scope]];
  if (!code || !normalize(code)) return null;
  if (scope === "directiva" && process.env.FAMILIES_CODE && normalize(code) === normalize(process.env.FAMILIES_CODE)) {
    console.error("DIRECTIVA_CODE equals FAMILIES_CODE; directiva code sign-in is disabled.");
    return null;
  }
  return code;
}

export const directivaCodeEnabled = () => configuredCode("directiva") !== null;
export const googleEnabled = () => !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
};

/** Cookie value proving the code was entered. Changing the code logs everyone out of that scope. */
export function codeToken(scope: Scope): string {
  return createHmac("sha256", secret())
    .update(`${scope}:${normalize(configuredCode(scope) ?? "")}`)
    .digest("hex");
}

const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function codeMatches(scope: Scope, input: string): boolean {
  const code = configuredCode(scope);
  return !!code && safeEqual(normalize(input), normalize(code));
}

async function hasCodeCookie(scope: Scope): Promise<boolean> {
  if (!configuredCode(scope)) return false;
  const value = (await cookies()).get(COOKIE[scope])?.value;
  return !!value && safeEqual(value, codeToken(scope));
}

/** Emails allowed into /directiva via Google: Config tab, plus OWNER_EMAIL so the treasurer is never locked out. */
async function allowedEmails(): Promise<Set<string>> {
  const { snapshot } = await getSnapshot();
  const list = [...(snapshot?.directivaEmails ?? [])];
  if (process.env.OWNER_EMAIL) list.push(process.env.OWNER_EMAIL.toLowerCase());
  return new Set(list);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      authorization: { params: { scope: "openid email profile", prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      return !!email && (await allowedEmails()).has(email);
    },
  },
  pages: { error: "/directiva" },
};

export type DirectivaAccess =
  | { state: "allowed"; who: string; via: "demo" | "code" | "google" }
  | { state: "signed_out" }
  | { state: "denied"; who: string };

export async function directivaAccess(): Promise<DirectivaAccess> {
  if (isDemo()) return { state: "allowed", who: "demo@example.com", via: "demo" };
  if (await hasCodeCookie("directiva")) return { state: "allowed", who: "directiva", via: "code" };
  if (!googleEnabled()) return { state: "signed_out" };
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return { state: "signed_out" };
  // Re-check on every visit so removing someone from Config takes effect without waiting for their session to expire.
  return (await allowedEmails()).has(email)
    ? { state: "allowed", who: email, via: "google" }
    : { state: "denied", who: email };
}

export async function hasFamiliesAccess(): Promise<boolean> {
  if (isDemo()) return true;
  if (await hasCodeCookie("families")) return true;
  return (await directivaAccess()).state === "allowed";
}
