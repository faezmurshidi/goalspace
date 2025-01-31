import OpenAI from 'openai';
import { supabase } from '@/lib/supabase/client';



export async function storeDocumentEmbedding(documentId: string, content: string) {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'store',
        documentId,
        content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to store document embedding');
    }

    return true;
  } catch (error) {
    console.error('Error storing document embedding:', error);
    throw error;
  }
}

export async function findSimilarDocuments(query: string, limit: number = 5) {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'search',
        query,
        limit,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to find similar documents');
    }

    const { documents } = await response.json();
    return documents;
  } catch (error) {
    console.error('Error finding similar documents:', error);
    throw error;
  }
} 