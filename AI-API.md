# AI APIs Usage Documentation

This document outlines every function and route in the `my-rag-app` application where AI APIs are utilized, detailing exactly how they are used.

## 1. Voyage AI (Embeddings)

The application uses Voyage AI's `voyage-3` model to generate vector embeddings for text chunks and user queries.

### Utility Functions
- **File**: [`lib/voyage.ts`](file:///c:/Users/Ankur%20Ram/OneDrive/Desktop/Workspace/Next%20js/RAG%20system/my-rag-app/lib/voyage.ts)
- **`embedBatch(texts: string[])`**: This function makes a raw HTTP POST request to `https://api.voyageai.com/v1/embeddings`. It passes an array of text chunks and the `voyage-3` model identifier, authenticating with the `VOYAGE_API_KEY` environment variable. It returns an array of embeddings (each embedding is a 1024-dimensional float array).
- **`embed(text: string)`**: A helper wrapper around `embedBatch` that handles generating an embedding for a single text string.

### API Routes Using Voyage
- **File**: [`app/api/ingest/route.ts`](file:///c:/Users/Ankur%20Ram/OneDrive/Desktop/Workspace/Next%20js/RAG%20system/my-rag-app/app/api/ingest/route.ts)
  - **Usage**: When a user uploads a document, the document is chunked into smaller text segments. The route calls `embedBatch` to generate embeddings for all chunks in a single API call (optimizing for rate limits). These embeddings are then stored in MongoDB alongside the text chunks.
- **File**: [`app/api/chat/route.ts`](file:///c:/Users/Ankur%20Ram/OneDrive/Desktop/Workspace/Next%20js/RAG%20system/my-rag-app/app/api/chat/route.ts)
  - **Usage**: Inside the `hybridSearch` function, the route calls `embed` on the user's incoming chat query. This generated embedding is used in a `$vectorSearch` pipeline within MongoDB to find the most semantically relevant document chunks.

---

## 2. Google Gemini & Groq (LLM Generation)

The application now supports toggling between Google's `gemini-2.5-flash` and Groq's `llama-3.1-8b-instant` for generating chat answers based on the retrieved context. 
The active provider is determined by the `AI_PROVIDER` environment variable (set to `"GROQ"` or `"GEMINI"`).

### API Routes Using LLMs
- **File**: [`app/api/chat/route.ts`](file:///c:/Users/Ankur%20Ram/OneDrive/Desktop/Workspace/Next%20js/RAG%20system/my-rag-app/app/api/chat/route.ts)
  - **Usage**: Inside the `POST` handler, after retrieving relevant document chunks from MongoDB using the hybrid search, the application constructs a prompt.
  - The route feeds a generated stream back to the client using a Next.js `ReadableStream`, pre-pending metadata (like cited file names).
  - It uses one of two specialized functions to populate this stream:

#### `streamGemini(prompt, controller)`
- Instantiates the Gemini client with `new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)` and requests the `gemini-2.5-flash` model.
- Calls `model.generateContentStream(prompt)` and pipes the yielded chunks to the stream controller.

#### `streamGroq(prompt, controller)`
- Instantiates the Groq client from the `groq-sdk` package using `process.env.GROQ_API_KEY!`.
- Creates a streaming chat completion with the `llama-3.1-8b-instant` model.
- Yields the SSE delta chunks and pipes them to the stream controller.
