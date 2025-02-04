import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase admin client for document operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  try {
    // Get the authenticated user's session using server client
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

    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, documentId, content, query, limit = 5 } = await req.json();

    if (action === 'store' && documentId && content) {
      // Get embeddings from OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: content,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // First, verify the document exists and belongs to the user
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        return NextResponse.json(
          { error: 'Document not found or access denied' },
          { status: 404 }
        );
      }

      // Store embeddings using admin client (bypasses RLS)
      const { error: insertError } = await supabaseAdmin
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          embedding,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error storing embedding:', insertError);
        return NextResponse.json(
          { error: 'Failed to store embedding' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'search' && query) {
      // Get embeddings for the search query
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Search for similar documents using admin client (bypasses RLS)
      const { data: documents, error: searchError } = await supabaseAdmin.rpc(
        'match_documents',
        {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: limit
        }
      );

      if (searchError) {
        console.error('Error searching documents:', searchError);
        return NextResponse.json(
          { error: 'Failed to search documents' },
          { status: 500 }
        );
      }

      // Filter documents based on user access
      const { data: accessibleDocs } = await supabase
        .from('documents')
        .select('id')
        .in('id', documents.map(doc => doc.id));

      const accessibleDocIds = new Set(accessibleDocs?.map(doc => doc.id));
      const filteredDocuments = documents.filter(doc => accessibleDocIds.has(doc.id));

      return NextResponse.json({ documents: filteredDocuments });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in embeddings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 