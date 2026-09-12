const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vmmicbfoobdbtikcqxel.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWljYmZvb2JkYnRpa2NxeGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc2ODY1NSwiZXhwIjoyMTAzMzQ0NjU1fQ.Ws3GGccCAzgZ9FcxpIOWN6O2yAVu70DsYJ-tLHpJFwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTests() {
  console.log('===========================================');
  console.log('  TEST WORKFLOW COMPLET');
  console.log('===========================================\n');

  // 1. Insert user de test (factice - pour test structure)
  console.log('[TEST 1] Insertion user de test...');
  const { data: inserted, error: insertErr } = await supabase
    .from('users')
    .insert({
      email: 'test.demo@gmail.com',
      password: 'FAKE_PASSWORD_FOR_TEST',
      google_email: 'test.demo@gmail.com',
      status: 'pending_validation'
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[TEST 1] ❌ Erreur insertion:', insertErr.message);
    return;
  }
  console.log('[TEST 1] ✅ User insere, ID:', inserted.id);

  // 2. Verification lecture
  console.log('\n[TEST 2] Lecture user depuis Supabase...');
  const { data: user, error: readErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', inserted.id)
    .single();

  if (readErr) {
    console.error('[TEST 2] ❌ Erreur lecture:', readErr.message);
    return;
  }
  console.log('[TEST 2] ✅ User lu:');
  console.log('  - Email:', user.email);
  console.log('  - Has Password:', !!user.password);
  console.log('  - Status:', user.status);

  // 3. Mise a jour statut (simule validation reussie)
  console.log('\n[TEST 3] Mise a jour statut -> validated...');
  const { error: updErr } = await supabase
    .from('users')
    .update({ status: 'validated', updated_at: new Date().toISOString() })
    .eq('id', inserted.id);

  if (updErr) {
    console.error('[TEST 3] ❌ Erreur update:', updErr.message);
    return;
  }
  console.log('[TEST 3] ✅ Statut mis a jour');

  // 4. Cleanup - supprime le user de test
  console.log('\n[TEST 4] Cleanup - suppression user test...');
  const { error: delErr } = await supabase
    .from('users')
    .delete()
    .eq('id', inserted.id);

  if (delErr) {
    console.error('[TEST 4] ❌ Erreur suppression:', delErr.message);
    return;
  }
  console.log('[TEST 4] ✅ User test supprime');

  console.log('\n===========================================');
  console.log('  ✅ TOUS LES TESTS SUPABASE PASSENT');
  console.log('===========================================');
  console.log('\nProchaine etape: lancer le serveur et tester');
  console.log('les endpoints API avec un VRAI compte Gmail.');
}

runTests().catch(console.error);