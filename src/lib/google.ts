import "server-only";
import { google } from "googleapis";
import { type RawWorkbook, TAB_NAMES } from "./schema";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

function authClient() {
  const b64 = process.env.GOOGLE_READER_SA_JSON_B64;
  if (!b64) throw new Error("GOOGLE_READER_SA_JSON_B64 is not set.");
  const key = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  return new google.auth.JWT({ email: key.client_email, key: key.private_key, scopes: SCOPES });
}

export async function fetchWorkbook(): Promise<RawWorkbook> {
  const spreadsheetId = process.env.SHEET_ID;
  if (!spreadsheetId) throw new Error("SHEET_ID is not set.");
  const sheets = google.sheets({ version: "v4", auth: authClient() });

  // Ask for the tab list first so a missing tab becomes a clear StructuralError, not an API 400.
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const present = new Set(meta.data.sheets?.map((s) => s.properties?.title) ?? []);
  const tabs = TAB_NAMES.filter((t) => present.has(t));

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: tabs.map((t) => `'${t}'!A1:Z`),
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  const out: RawWorkbook = {};
  tabs.forEach((t, i) => (out[t] = res.data.valueRanges?.[i]?.values ?? [[]]));
  return out;
}

export async function fetchReceipt(fileId: string): Promise<{ body: ReadableStream; mimeType: string }> {
  const drive = google.drive({ version: "v3", auth: authClient() });
  const meta = await drive.files.get({ fileId, fields: "mimeType" });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  const node = res.data as NodeJS.ReadableStream;
  const body = new ReadableStream({
    start(controller) {
      node.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      node.on("end", () => controller.close());
      node.on("error", (e) => controller.error(e));
    },
  });
  return { body, mimeType: meta.data.mimeType ?? "application/octet-stream" };
}
