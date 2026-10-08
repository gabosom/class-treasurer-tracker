import { hasFamiliesAccess } from "@/lib/auth";
import { getSnapshot, isFixtureMode } from "@/lib/data";
import { fetchReceipt } from "@/lib/google";

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  if (!(await hasFamiliesAccess())) return new Response("Unauthorized", { status: 401 });
  const { fileId } = await params;

  // Only serve files the Ledger references, so this can't be used to read anything else
  // the reader account can see.
  const { snapshot } = await getSnapshot();
  if (!snapshot?.receiptIds.includes(fileId)) return new Response("Not found", { status: 404 });

  if (isFixtureMode()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="20">Sample receipt: ${fileId.replace(/[^\w-]/g, "")}</text></svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store" } });
  }

  try {
    const { body, mimeType } = await fetchReceipt(fileId);
    return new Response(body, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("Receipt fetch failed", fileId, e);
    return new Response("Receipt unavailable", { status: 502 });
  }
}
