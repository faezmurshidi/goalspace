import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  console.log('generated embedding', response.data[0].embedding);

  return response.data[0].embedding;
}

export async function POST(request: Request) {
  try {
    const { action, documentId, content, query, limit = 5 } = await request.json();

    // Create server-side Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'store': {
        const embedding = await generateEmbedding(content);
        const { error } = await supabase
          .from('document_embeddings')
          .insert({
            document_id: documentId,
            content,
            embedding
          });

        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case 'search': {
        const embedding = await generateEmbedding(query);
        const { data: similarDocs, error } = await supabase
          .rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: limit
          });

        if (error) throw error;
        return NextResponse.json({ documents: similarDocs });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in embeddings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 