export function chunkText(text: string, options?: { size?: number; overlap?: number }): string[] {
  const envSize = process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE, 10) : 500;
  const envOverlap = process.env.CHUNK_OVERLAP ? parseInt(process.env.CHUNK_OVERLAP, 10) : 50;

  const size = options?.size ?? envSize;
  const overlap = options?.overlap ?? envOverlap;
  
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += (size - overlap)) {
    const chunkWords = words.slice(i, i + size);
    chunks.push(chunkWords.join(' '));
  }
  
  return chunks;
}
