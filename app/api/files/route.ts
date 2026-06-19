import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Group by documentId to get unique files
    const files = await db.collection("chunks").aggregate([
      { $match: { userId } },
      { $group: { 
          _id: "$metadata.fileName", 
          documentId: { $first: "$documentId" },
          ingestedAt: { $max: "$metadata.ingestedAt" },
          chunks: { $sum: 1 }
      }},
      { $sort: { ingestedAt: -1 } }
    ]).toArray();

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("Fetch files error:", error);
    let source = "Unknown";
    let message = error?.message || String(error);

    if (message.includes("MongoServerError") || message.includes("Mongo") || message.includes("APIStrictError")) {
      source = "MongoDB";
    }
    return NextResponse.json({ error: `${source}: ${message}` }, { status: 500 });
  }
}
