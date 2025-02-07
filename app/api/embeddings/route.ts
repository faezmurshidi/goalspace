import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('supabaseAdmin initialized:', !!supabaseAdmin);

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
      console.log('Starting store operation (simplest COUNT test)...');

      // Simplest test: SELECT COUNT(*) using supabaseAdmin
      console.log('Simplest test: SELECT COUNT(*) from documents (supabaseAdmin)...');
      const { data: countData, error: countError } = await supabaseAdmin
        .from('documents')
        .select('*', { count: 'exact', head: true }); // Get count without fetching rows

      console.log('Simplest COUNT test result:', {
        count: countData,
        error: countError?.message
      });

      if (countError) {
        console.log('Simplest COUNT test failed:', { error: countError.message });
        return NextResponse.json(
          { error: 'Simplest COUNT test failed' },
          { status: 403 }
        );
      }
      console.log('Simplest COUNT test passed (or bypassed due to admin)'); // Log success/bypass

      // Get embeddings from OpenAI
      console.log('Requesting embeddings from OpenAI...');
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: content,
      });
      console.log('OpenAI embedding received:', { 
        embeddingLength: embeddingResponse.data[0].embedding.length 
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Then proceed with admin operations
      console.log('Attempting to store embedding in database...');
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
        console.error('Error storing embedding:', {
          error: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        return NextResponse.json(
          { error: 'Failed to store embedding' },
          { status: 500 }
        );
      }

      console.log('Embedding stored successfully');
      return NextResponse.json({ success: true });
    }

    if (action === 'search' && query) {
      console.log('Starting search operation:', { query, limit });

      // Get embeddings for the search query
      console.log('Requesting search query embedding from OpenAI...');
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });
      console.log('Search query embedding received');

      const embedding = embeddingResponse.data[0].embedding;

      // Search for similar documents using admin client
      console.log('Searching for matching documents...');
      const { data: documents, error: searchError } = await supabaseAdmin.rpc(
        'match_documents',
        {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: limit
        }
      );

      if (searchError) {
        console.error('Error searching documents:', {
          error: searchError.message,
          details: searchError.details,
          hint: searchError.hint
        });
        return NextResponse.json(
          { error: 'Failed to search documents' },
          { status: 500 }
        );
      }

      console.log('Found matching documents:', { count: documents?.length });

      // Filter documents based on user access
      console.log('Filtering documents based on user access...');
      const { data: accessibleDocs, error: accessError } = await supabase
        .from('documents')
        .select('id')
        .in('id', documents.map((doc: any) => doc.id));

      if (accessError) {
        console.error('Error checking document access:', accessError);
      }

      console.log('Access check complete:', { 
        accessibleCount: accessibleDocs?.length 
      });

      const accessibleDocIds = new Set(accessibleDocs?.map((doc: any) => doc.id));
      const filteredDocuments = documents.filter((doc: any) => accessibleDocIds.has(doc.id));

      console.log('Final filtered results:', { 
        count: filteredDocuments.length 
      });

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