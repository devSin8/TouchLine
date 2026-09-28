import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseCsv } from "@/lib/csv";
import { persistEvents } from "@/lib/data";
import { hasAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasAdminSession(request)) return NextResponse.json({ error: "Sign in as an admin before importing data." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV file to import." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "CSV must be smaller than 10 MB." }, { status: 413 });
    const events = parseCsv(await file.text());
    if (!events.length) return NextResponse.json({ error: "This CSV has no player match records." }, { status: 400 });
    const savedRows = await persistEvents(events);
    revalidatePath("/");
    revalidatePath("/players/[playerId]", "page");
    return NextResponse.json({ rows: savedRows, duplicatesSkipped: events.length - savedRows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not import this CSV." }, { status: 400 });
  }
}
