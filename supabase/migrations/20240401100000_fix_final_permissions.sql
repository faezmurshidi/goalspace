-- Fix final permissions
-- This migration revokes unnecessary permissions that were still in remote database

-- Revoke unnecessary permissions from anon role
REVOKE DELETE ON TABLE public.blog_posts FROM anon;
REVOKE INSERT ON TABLE public.blog_posts FROM anon;
REVOKE REFERENCES ON TABLE public.blog_posts FROM anon;
REVOKE TRIGGER ON TABLE public.blog_posts FROM anon;
REVOKE TRUNCATE ON TABLE public.blog_posts FROM anon;
REVOKE UPDATE ON TABLE public.blog_posts FROM anon;

REVOKE DELETE ON TABLE public.chat_messages FROM anon;
REVOKE INSERT ON TABLE public.chat_messages FROM anon;
REVOKE REFERENCES ON TABLE public.chat_messages FROM anon;
REVOKE SELECT ON TABLE public.chat_messages FROM anon;
REVOKE TRIGGER ON TABLE public.chat_messages FROM anon;
REVOKE TRUNCATE ON TABLE public.chat_messages FROM anon;
REVOKE UPDATE ON TABLE public.chat_messages FROM anon;

REVOKE DELETE ON TABLE public.document_embeddings FROM anon;
REVOKE INSERT ON TABLE public.document_embeddings FROM anon;
REVOKE REFERENCES ON TABLE public.document_embeddings FROM anon;
REVOKE SELECT ON TABLE public.document_embeddings FROM anon;
REVOKE TRIGGER ON TABLE public.document_embeddings FROM anon;
REVOKE TRUNCATE ON TABLE public.document_embeddings FROM anon;
REVOKE UPDATE ON TABLE public.document_embeddings FROM anon;

REVOKE DELETE ON TABLE public.documents FROM anon;
REVOKE INSERT ON TABLE public.documents FROM anon;
REVOKE REFERENCES ON TABLE public.documents FROM anon;
REVOKE SELECT ON TABLE public.documents FROM anon;
REVOKE TRIGGER ON TABLE public.documents FROM anon;
REVOKE TRUNCATE ON TABLE public.documents FROM anon;
REVOKE UPDATE ON TABLE public.documents FROM anon;

REVOKE DELETE ON TABLE public.goals FROM anon;
REVOKE INSERT ON TABLE public.goals FROM anon;
REVOKE REFERENCES ON TABLE public.goals FROM anon;
REVOKE TRIGGER ON TABLE public.goals FROM anon;
REVOKE TRUNCATE ON TABLE public.goals FROM anon;
REVOKE UPDATE ON TABLE public.goals FROM anon;

REVOKE DELETE ON TABLE public.modules FROM anon;
REVOKE INSERT ON TABLE public.modules FROM anon;
REVOKE REFERENCES ON TABLE public.modules FROM anon;
REVOKE SELECT ON TABLE public.modules FROM anon;
REVOKE TRIGGER ON TABLE public.modules FROM anon;
REVOKE TRUNCATE ON TABLE public.modules FROM anon;
REVOKE UPDATE ON TABLE public.modules FROM anon;

REVOKE DELETE ON TABLE public.spaces FROM anon;
REVOKE INSERT ON TABLE public.spaces FROM anon;
REVOKE REFERENCES ON TABLE public.spaces FROM anon;
REVOKE TRIGGER ON TABLE public.spaces FROM anon;
REVOKE TRUNCATE ON TABLE public.spaces FROM anon;
REVOKE UPDATE ON TABLE public.spaces FROM anon;

REVOKE DELETE ON TABLE public.tasks FROM anon;
REVOKE INSERT ON TABLE public.tasks FROM anon;
REVOKE REFERENCES ON TABLE public.tasks FROM anon;
REVOKE SELECT ON TABLE public.tasks FROM anon;
REVOKE TRIGGER ON TABLE public.tasks FROM anon;
REVOKE TRUNCATE ON TABLE public.tasks FROM anon;
REVOKE UPDATE ON TABLE public.tasks FROM anon;

-- Revoke unnecessary permissions from authenticated role
REVOKE REFERENCES ON TABLE public.blog_posts FROM authenticated;
REVOKE TRIGGER ON TABLE public.blog_posts FROM authenticated;
REVOKE TRUNCATE ON TABLE public.blog_posts FROM authenticated;

REVOKE REFERENCES ON TABLE public.goals FROM authenticated;
REVOKE TRIGGER ON TABLE public.goals FROM authenticated;
REVOKE TRUNCATE ON TABLE public.goals FROM authenticated;

REVOKE REFERENCES ON TABLE public.modules FROM authenticated;
REVOKE TRIGGER ON TABLE public.modules FROM authenticated;
REVOKE TRUNCATE ON TABLE public.modules FROM authenticated;

REVOKE REFERENCES ON TABLE public.spaces FROM authenticated;
REVOKE TRIGGER ON TABLE public.spaces FROM authenticated;
REVOKE TRUNCATE ON TABLE public.spaces FROM authenticated; 