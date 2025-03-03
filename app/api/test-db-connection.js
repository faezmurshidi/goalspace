// Simple script to print Supabase database connection info
// You can run this with: node app/api/test-db-connection.js

import 'dotenv/config'; // Load environment variables
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Display connection info (for development purposes only)
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Connection String Format:');
console.log(`postgresql://postgres:[YOUR-PASSWORD]@${
  process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '')
    .replace('.supabase.co', '.db.supabase.co:5432')
}/postgres`);

// NOTE: This script should not be committed to version control as it exposes connection details
// Delete it after retrieving your connection string 