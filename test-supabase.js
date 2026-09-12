const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vmmicbfoobdbtikcqxel.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWljYmZvb2JkYnRpa2NxeGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc2ODY1NSwiZXhwIjoyMTAzMzQ0NjU1fQ.Ws3GGccCAzgZ9FcxpIOWN6O2yAVu70DsYJ-tLHpJFwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testConnection() {
  console.log('===========================================');
  console.log('  TEST CONNEXION SUPABASE');
  console.log('===========================================\n');

  // Test 1: Liste les tables disponibles (via supabase.tables)
  console.log('[TEST] Tentative de lecture table users...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(5);

  if (error) {
    console.error('[TEST] ❌ ERREUR:', error.message);
    console.error('[TEST] Code:', error.code);
    if (error.code === 'PGRST116' || error.message.includes('row-level')) {
      console.log('\n⚠️  RLS (Row Level Security) est ACTIVÉ sur la table users.');
      console.log('La ANON_KEY ne peut pas lire les données.');
      console.log('\nSolutions:');
      console.log('1. Demander la SERVICE_ROLE_KEY (qui bypass RLS)');
      console.log('2. OU désactiver RLS sur la table users dans Supabase Dashboard');
      console.log('3. OU ajouter une policy "Allow ALL" (pas sécurisé)');
    }
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      console.log('\n⚠️  La table users n\'existe pas encore.');
      console.log('Créez-la dans Supabase SQL Editor avec:');
      console.log(`
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  password TEXT,
  google_email TEXT,
  status TEXT DEFAULT 'pending_validation',
  session_cookies JSONB,
  session_fingerprint JSONB,
  proxy_used TEXT,
  last_session_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
      `);
    }
    return;
  }

  console.log('[TEST] ✅ Connexion OK !');
  console.log('[TEST] Nombre de users trouvés:', data ? data.length : 0);
  
  if (data && data.length > 0) {
    console.log('\n[TEST] Premier user:');
    const u = data[0];
    console.log('  ID:', u.id);
    console.log('  Email:', u.email);
    console.log('  Google Email:', u.google_email);
    console.log('  Has Password:', !!u.password);
    console.log('  Status:', u.status);
  } else {
    console.log('\n⚠️  Table users existe mais est VIDE.');
    console.log('Tu dois ajouter des utilisateurs avec email + password.');
  }
}

testConnection().catch(console.error);