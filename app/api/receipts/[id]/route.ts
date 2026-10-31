import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

// Receipts are written at runtime by A's pipeline into .cache/receipts (public/ isn't served at runtime).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]+$/.test(id)) return new Response("Bad id", { status: 400 });
  try {
    const buf = await readFile(path.join(process.cwd(), ".cache", "receipts", `${id}.png`));
    return new Response(new Uint8Array(buf), { headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
