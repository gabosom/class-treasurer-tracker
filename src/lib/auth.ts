import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { getSnapshot } from "./data";

export const FAMILIES_COOKIE = "fam";

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
};

/** Cookie value proving the class code was entered. Changing FAMILIES_CODE logs everyone out. */
export function familiesToken(): string {
  return createHmac("sha256", secret())
    .update(`families:${process.env.FAMILIES_CODE ?? ""}`)
    .digest("hex");
}

export function codeMatches(input: string): boolean {
  const code = process.env.FAMILIES_CODE;
  if (!code) return false;
  const a = Buffer.from(input.trim().toLowerCase());
  const b = Buffer.from(code.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export const devBypass = () =>
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "1";

/** Emails allowed into /directiva: Config tab, plus OWNER_EMAIL so the treasurer is never locked out. */
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
  | { state: "allowed"; email: string }
  | { state: "signed_out" }
  | { state: "denied"; email: string };

export async function directivaAccess(): Promise<DirectivaAccess> {
  if (devBypass()) return { state: "allowed", email: "dev@localhost" };
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return { state: "signed_out" };
  // Re-check on every visit so removing someone from Config takes effect without waiting for their session to expire.
  return (await allowedEmails()).has(email) ? { state: "allowed", email } : { state: "denied", email };
}

export async function hasFamiliesAccess(): Promise<boolean> {
  if (devBypass()) return true;
  const value = (await cookies()).get(FAMILIES_COOKIE)?.value;
  if (value && process.env.FAMILIES_CODE) {
    const expected = familiesToken();
    if (value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))) return true;
  }
  return (await directivaAccess()).state === "allowed";
}
