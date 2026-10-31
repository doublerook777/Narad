import { NextResponse } from "next/server";
import { getTrendingTopics } from "@/lib/trending";

export const dynamic = "force-dynamic";

export async function GET() {
  const { topics, live, at } = await getTrendingTopics();
  return NextResponse.json({ topics, live, at });
}
