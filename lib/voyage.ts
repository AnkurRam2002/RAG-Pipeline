export async function embed(text: string): Promise<number[]> {
  const res = await embedBatch([text]);
  return res[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: 'voyage-3',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Voyage API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  // Ensure the embeddings are returned in the correct order
  const sortedData = data.data.sort((a: any, b: any) => a.index - b.index);
  return sortedData.map((item: any) => item.embedding);
}
