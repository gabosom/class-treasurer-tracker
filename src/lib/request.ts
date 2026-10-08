import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang, dictionaries, toLang } from "./i18n";

export async function getLang(): Promise<Lang> {
  return toLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
