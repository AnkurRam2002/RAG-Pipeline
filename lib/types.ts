export interface Chunk {
  _id?: string;
  documentId: string;       // `${userId}_${fileName}` — stable across updates
  userId: string;
  text: string;
  embedding: number[];      // 1024 floats from Voyage AI
  metadata: {
    fileName: string;
    chunkIndex: number;
    totalChunks: number;
    fileHash: string;       // md5 of file bytes — used to detect changes
    ingestedAt: Date;
  };
}
