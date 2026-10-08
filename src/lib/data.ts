import "server-only";
import { unstable_cache } from "next/cache";
import { sampleWorkbook } from "@/fixtures/sample";
import { fetchWorkbook } from "./google";
import { computeLedger } from "./ledger";
import { parseWorkbook } from "./parse";
import { buildDirectivaView, type DirectivaView } from "./views";

export const SHEET_TAG = "sheet";
const REVALIDATE_SECONDS = 300;

export const isFixtureMode = () => process.env.DATA_SOURCE === "fixture";

export interface Snapshot {
  view: DirectivaView;
  directivaEmails: string[];
  receiptIds: string[];
  fetchedAt: string;
}

const loadSnapshot = unstable_cache(
  async (): Promise<Snapshot> => {
    const raw = isFixtureMode() ? sampleWorkbook : await fetchWorkbook();
    const wb = parseWorkbook(raw);
    const ledger = computeLedger(wb);
    return {
      view: buildDirectivaView(wb, ledger),
      directivaEmails: wb.directivaEmails,
      receiptIds: wb.txns.map((t) => t.receiptFileId).filter(Boolean),
      fetchedAt: new Date().toISOString(),
    };
  },
  ["snapshot-v1"],
  { tags: [SHEET_TAG], revalidate: REVALIDATE_SECONDS },
);

// Last good snapshot in this server instance, served when a refresh fails.
let lastGood: Snapshot | null = null;

export type SnapshotResult = { snapshot: Snapshot; error: string | null } | { snapshot: null; error: string };

export async function getSnapshot(): Promise<SnapshotResult> {
  try {
    lastGood = await loadSnapshot();
    return { snapshot: lastGood, error: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("Failed to load the Sheet:", error);
    return lastGood ? { snapshot: lastGood, error } : { snapshot: null, error };
  }
}
