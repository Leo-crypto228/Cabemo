const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vmmicbfoobdbtikcqxel.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWljYmZvb2JkYnRpa2NxeGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc2ODY1NSwiZXhwIjoyMTAzMzQ0NjU1fQ.Ws3GGccCAzgZ9FcxpIOWN6O2yAVu70DsYJ-tLHpJFwY',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function insertUser() {
  const userId = '430ee00f-7ecb-4926-8cba-053e06a95ddf';
  const email = 'clientwebg2@gmail.com';

  // RECUPERE LE MOT DE PASSE DEPUIS LES ARGS OU DEMANDE
  const password = process.argv[2];

  if (!password) {
    console.log('========================================');
    console.log('  INSERTION USER DANS public.users');
    console.log('========================================');
    console.log('');
    console.log('Usage: node insert-user.js "mot-de-passe-google"');
    console.log('');
    console.log('Le mot de passe est celui du compte Gmail');
    console.log('(pas le mot de passe de ton site, celui de Google)');
    console.log('');
    console.log('Exemple:');
    console.log('  node insert-user.js "MonMotDePasse123"');
    return;
  }

  console.log('Insertion du user dans public.users...');
  console.log('ID:', userId);
  console.log('Email:', email);

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email,
      google_email: email,
      password: password,
      status: 'pending_validation'
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      console.log('\nLe user existe deja dans public.users.');
      console.log('Mise a jour du mot de passe et du statut...');

      const { error: updErr } = await supabase
        .from('users')
        .update({ password: password, status: 'pending_validation', updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updErr) {
        console.error('Erreur mise a jour:', updErr.message);
        return;
      }
      console.log('✅ Mot de passe et statut mis a jour !');
    } else {
      console.error('Erreur insertion:', error.message);
      return;
    }
  } else {
    console.log('✅ User insere avec succes !');
    console.log('ID:', data.id);
  }

  // Verification
  const { data: check } = await supabase.from('users').select('id, email, status').eq('id', userId).single();
  console.log('\nVerification:');
  console.log('  ID:', check.id);
  console.log('  Email:', check.email);
  console.log('  Status:', check.status);
  console.log('  Has Password:', true);

  console.log('\n========================================');
  console.log('  PRET POUR LE TEST !');
  console.log('========================================');
  console.log('Lance la validation avec:');
  console.log('  node server-complete.js');
  console.log('Puis dans un autre terminal:');
  console.log('  Invoke-RestMethod -Uri http://localhost:8080/api/validate-account-now/' + userId + ' -Method POST -UseBasicParsing');
}

insertUser().catch(console.error);