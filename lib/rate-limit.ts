import clientPromise from "./mongodb";

const INITIAL_LIMIT = parseInt(process.env.RATE_LIMIT_PER_MINUTE || "5", 10);
console.log(`🚀 [Rate Limiter] AI APIs initialized with cap: ${INITIAL_LIMIT} requests per minute`);

export async function rateLimit(identifier: string) {
  const limit = parseInt(process.env.RATE_LIMIT_PER_MINUTE || "5", 10);
  const windowMs = 60 * 1000; // 1 minute window
  
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection("rate_limits");

  const now = Date.now();
  // Round down to the start of the current minute to create a fixed window
  const windowStart = now - (now % windowMs);

  const result = await collection.findOneAndUpdate(
    { identifier, windowStart },
    {
      $inc: { count: 1 },
      $setOnInsert: { createdAt: new Date(now) }
    },
    { upsert: true, returnDocument: "after" }
  );

  // In MongoDB driver v6+, findOneAndUpdate returns the document directly.
  // In older versions, it returns { value: document }. We handle both just in case.
  const doc = result?.value || result;
  const count = doc?.count || 1;

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
  };
}
