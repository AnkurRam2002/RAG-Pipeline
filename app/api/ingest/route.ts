import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "@/lib/mongodb";
import { chunkText } from "@/lib/chunker";
import { cleanText } from "@/lib/cleaner";
import { embedBatch } from "@/lib/voyage";
import { Chunk } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";
// @ts-ignore
import PDFParser from "pdf2json";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
    }

    const limitResult = await rateLimit(userId);
    if (!limitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("md5").update(buffer).digest("hex");
    const documentId = `${userId}_${file.name}`;

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<Chunk>("chunks");

    // Check for existing document
    const existingChunk = await collection.findOne(
      { documentId },
      { projection: { "metadata.fileHash": 1 } }
    );

    let isUpdate = false;

    if (existingChunk) {
      if (existingChunk.metadata.fileHash === fileHash) {
        return NextResponse.json({ status: "skipped" });
      }
      // Hash differs, meaning file changed
      isUpdate = true;
      await collection.deleteMany({ documentId });
    }

    // Process new file
    let text = "";
    if (file.name.toLowerCase().endsWith(".pdf")) {
      text = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError || errData));
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.parseBuffer(buffer);
      });
    } else {
      text = buffer.toString("utf-8");
    }

    const cleanedText = cleanText(text);
    const chunksText = chunkText(cleanedText);

    // Embed all chunks in a single batch to avoid Voyage 3 RPM rate limit
    const embeddings = await embedBatch(chunksText);

    const now = new Date();
    const chunksToInsert: Chunk[] = chunksText.map((chunkText, index) => ({
      documentId,
      userId,
      text: chunkText,
      embedding: embeddings[index],
      metadata: {
        fileName: file.name,
        chunkIndex: index,
        totalChunks: chunksText.length,
        fileHash,
        ingestedAt: now,
      },
    }));

    if (chunksToInsert.length > 0) {
      await collection.insertMany(chunksToInsert);
    }

    return NextResponse.json({
      status: isUpdate ? "updated" : "created",
      chunks: chunksToInsert.length,
    });
  } catch (error: any) {
    console.error("Ingestion error:", error);
    let source = "Unknown";
    let message = error?.message || String(error);

    if (message.includes("Voyage API error") || message.includes("api.voyageai.com")) {
      source = "Voyage";
    } else if (message.includes("MongoServerError") || message.includes("Mongo") || message.includes("APIStrictError")) {
      source = "MongoDB";
    }

    return NextResponse.json({ error: `${source}: ${message}` }, { status: 500 });
  }
}
