const { getUserCredentials } = require('./api/supabase-client');

async function test() {
  const userId = '430ee00f-7ecb-4926-8cba-053e06a95ddf';
  console.log('Testing getUserCredentials for:', userId);
  const user = await getUserCredentials(userId);
  console.log('Result:', user);
  if (!user) {
    console.log('User is NULL');
  } else {
    console.log('Has google_email:', !!user.google_email);
    console.log('Has password:', !!user.password);
    console.log('google_email value:', user.google_email);
    console.log('password length:', user.password ? user.password.length : 0);
  }
}

test().catch(console.error);