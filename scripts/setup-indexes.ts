/**
 * Setup Indexes
 * 
 * Please run this script or copy the JSON below to create your Atlas Search
 * and Atlas Vector Search indexes in the MongoDB Atlas UI.
 */

const vectorIndex = {
  "name": "vector_index",
  "definition": {
    "fields": [
      { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
      { "type": "filter", "path": "userId" },
      { "type": "filter", "path": "documentId" }
    ]
  }
};

const textIndex = {
  "name": "text_index",
  "definition": {
    "mappings": {
      "dynamic": false,
      "fields": {
        "text":   { "type": "string", "analyzer": "lucene.english" },
        "userId": { "type": "string" }
      }
    }
  }
};

console.log("=== Atlas Vector Search ===");
console.log("Create a new Atlas Vector Search Index with the following configuration:");
console.log(JSON.stringify(vectorIndex.definition, null, 2));
console.log(`(Make sure to name it: ${vectorIndex.name})`);
console.log("\n===========================\n");

console.log("=== Atlas Search (BM25) ===");
console.log("Create a new Atlas Search Index with the following configuration:");
console.log(JSON.stringify(textIndex.definition, null, 2));
console.log(`(Make sure to name it: ${textIndex.name})`);
console.log("\n===========================\n");
