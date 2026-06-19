import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { fileName: string } }
) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const fileName = decodeURIComponent(params.fileName);
    const documentId = `${userId}_${fileName}`;

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("chunks");

    const result = await collection.deleteMany({ documentId });

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error("Delete file error:", error);
    let source = "Unknown";
    let message = error?.message || String(error);

    if (message.includes("MongoServerError") || message.includes("Mongo") || message.includes("APIStrictError")) {
      source = "MongoDB";
    }
    return NextResponse.json({ error: `${source}: ${message}` }, { status: 500 });
  }
}
