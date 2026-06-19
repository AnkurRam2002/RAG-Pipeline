# Semantic Controller V1.2 (Knowledge Base)

A high-performance, brutalist-styled Retrieval-Augmented Generation (RAG) pipeline built with Next.js, Voyage AI, and MongoDB Atlas Vector Search.

## Features

- **Semantic Search Engine**: Talk to your data using advanced vector embeddings powered by Voyage AI (`voyage-3`).
- **Multi-Format Document Ingestion**: Upload `.txt`, `.md`, and `.pdf` files. Documents are automatically cleaned, chunked, and vectorized.
- **MongoDB Atlas Vector Search**: Fast and scalable semantic retrieval using MongoDB's `$vectorSearch` and `$search` aggregation pipelines.
- **Brutalist UI Aesthetic**: A highly minimal, terminal-inspired interface built with Tailwind CSS, featuring high-contrast monochrome design and sharp typography.
- **Citation Tracking**: Responses include interactive, inline reference tags `[REF X]` that trace back to the exact source chunks retrieved from your uploaded documents.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-vector-search)
- **Embeddings**: [Voyage AI](https://www.voyageai.com/)
- **PDF Processing**: `pdf2json`

## Getting Started

### Prerequisites
- Node.js
- MongoDB Atlas cluster with Vector Search indexes configured
- Voyage AI API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AnkurRam2002/RAG-Pipeline.git
   cd RAG-Pipeline
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   VOYAGE_API_KEY=your_voyage_api_key
   CHUNK_SIZE=500
   CHUNK_OVERLAP=50
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the interface.

## Usage
1. Drag and drop your reference documents (`.txt`, `.md`, or `.pdf`) into the designated upload zone.
2. Wait for the system to process, chunk, and embed the text into the MongoDB knowledge base.
3. Use the command interface at the bottom of the screen to query your uploaded knowledge base.
4. Click on `[REF]` tags in the chat to view the exact chunk of text the system used to generate the response.

## Architecture Pipeline

1. **Ingestion**: `FileUploader.tsx` sends raw files to the `/api/ingest` route.
2. **Processing**: Text is cleaned (`lib/cleaner.ts`) and split into overlapping chunks (`lib/chunker.ts`).
3. **Embedding**: Chunks are embedded via the Voyage AI API (`lib/voyage.ts`).
4. **Storage**: Vectors and metadata are stored in MongoDB (`lib/mongodb.ts`).
5. **Retrieval**: User queries are embedded and compared against the database using MongoDB Atlas Vector Search.
6. **Generation**: Top results are returned and displayed in the `ChatWindow.tsx` alongside the original chunks for verification.
