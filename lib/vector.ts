import OpenAI from 'openai';
import { Document } from '@/lib/store';
import { createClient } from '@/utils/supabase/server';

export async function storeDocumentEmbedding(document: Document): Promise<void> {
  try {
    if (!document?.content) {
      throw new Error('No document content provided');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'store',
        documentId: document.id,
        content: document.content
      }),
      credentials: 'include', // This ensures cookies are sent with the request
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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

    const supabase = await createClient();

    const session = await supabase.auth.getSession();
    console.log(" findSimilarDocuments session", session);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ 
        action: 'search',
        query: query.trim(),
        limit: 5
      }),
      credentials: 'include', // This ensures cookies are sent with the request
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || 
        `Failed to get embeddings: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("data similar", data);
    return data.documents || [];
  } catch (error) {
    console.error('Error finding similar documents:', error);
    return [];
  }
} 