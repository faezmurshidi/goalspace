import { Document } from '@/lib/store';

export async function storeDocumentEmbedding(document: Document): Promise<void> {
  try {
    if (!document?.content) {
      throw new Error('No document content provided');
    }

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'store',
        documentId: document.id,
        content: document.content
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || 
        `Failed to store document embedding: ${response.statusText}`
      );
    }
  } catch (error) {
    console.error('Error storing document embedding:', error);
    throw error;
  }
}

export async function findSimilarDocuments(query: string): Promise<Document[]> {
  try {
    if (!query?.trim()) {
      return [];
    }

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'search',
        query: query.trim(),
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || 
        `Failed to get similar documents: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error('Error finding similar documents:', error);
    return [];
  }
} 