import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import clientPromise from "@/lib/mongodb";
import { embed } from "@/lib/voyage";
import { Chunk } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";
import { getSystemPrompt } from "@/lib/prompts";

async function hybridSearch(query: string, userId: string, topK = 5) {
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<Chunk>("chunks");

  const queryVector = await embed(query);

  const pipeline = [
    {
      $search: {
        index: "text_index",
        compound: {
          must: [{ text: { query: query, path: "text" } }],
          filter: [{ text: { query: userId, path: "userId" } }]
        }
      }
    },
    { $limit: 20 },
    { $addFields: { searchScore: { $meta: "searchScore" } } },
    { 
      $setWindowFields: { 
        sortBy: { searchScore: -1 }, 
        output: { bm25_rank: { $documentNumber: {} } } 
      } 
    },
    {
      $project: {
        text: 1,
        documentId: 1,
        fileName: "$metadata.fileName",
        bm25_rank: 1,
      }
    },
    {
      $unionWith: {
        coll: "chunks",
        pipeline: [
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: queryVector,
              numCandidates: 100,
              limit: 20,
              filter: { userId: userId }
            }
          },
          { $addFields: { vectorScore: { $meta: "vectorSearchScore" } } },
          { 
            $setWindowFields: { 
              sortBy: { vectorScore: -1 }, 
              output: { vector_rank: { $documentNumber: {} } } 
            } 
          },
          {
            $project: {
              text: 1,
              documentId: 1,
              fileName: "$metadata.fileName",
              vector_rank: 1,
            }
          }
        ]
      }
    },
    {
      $group: {
        _id: "$_id",
        text: { $first: "$text" },
        documentId: { $first: "$documentId" },
        fileName: { $first: "$fileName" },
        bm25_rank: { $max: "$bm25_rank" },
        vector_rank: { $max: "$vector_rank" }
      }
    },
    {
      $project: {
        _id: 1,
        text: 1,
        documentId: 1,
        fileName: 1,
        rrf_score: {
          $add: [
            { $divide: [1, { $add: [60, { $ifNull: ["$bm25_rank", 20] }] }] },
            { $divide: [1, { $add: [60, { $ifNull: ["$vector_rank", 20] }] }] }
          ]
        }
      }
    },
    { $sort: { rrf_score: -1 } },
    { $limit: topK }
  ];

  const results = await collection.aggregate(pipeline).toArray();
  return results;
}

async function streamGemini(contextString: string, message: string, controller: ReadableStreamDefaultController) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: getSystemPrompt(contextString)
  });
  const result = await model.generateContentStream(message);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) controller.enqueue(new TextEncoder().encode(text));
  }
}

async function streamGroq(contextString: string, message: string, controller: ReadableStreamDefaultController) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { 
        role: "system", 
        content: getSystemPrompt(contextString)
      },
      { role: "user", content: message }
    ],
    model: "llama-3.1-8b-instant",
    stream: true,
  });
  for await (const chunk of chatCompletion) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) controller.enqueue(new TextEncoder().encode(text));
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
      return NextResponse.json({ error: "Missing message or userId" }, { status: 400 });
    }

    const limitResult = await rateLimit(userId);
    if (!limitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const contextChunks = await hybridSearch(message, userId, 5);

    let contextString = "";
    contextChunks.forEach((chunk, index) => {
      contextString += `[${index + 1}] (${chunk.fileName || "unknown"}) ${chunk.text}\n\n`;
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send context chunks metadata first
          const metadata = JSON.stringify({ 
            chunks: contextChunks.map(c => ({
              fileName: c.fileName || "unknown",
              text: c.text
            }))
          });
          controller.enqueue(new TextEncoder().encode(`${metadata}\n\n__METADATA_END__\n\n`));

          if (process.env.AI_PROVIDER === "GROQ") {
            await streamGroq(contextString, message, controller);
          } else {
            await streamGemini(contextString, message, controller);
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    let source = "Unknown";
    let message = error?.message || String(error);

    if (message.includes("Voyage API error") || message.includes("api.voyageai.com")) {
      source = "Voyage";
    } else if (message.includes("MongoServerError") || message.includes("Mongo") || message.includes("APIStrictError")) {
      source = "MongoDB";
    } else if (message.includes("GoogleGenerativeAI") || message.includes("generativelanguage.googleapis.com") || message.includes("gemini")) {
      source = "Gemini";
    }

    return NextResponse.json({ error: `${source}: ${message}` }, { status: 500 });
  }
}
