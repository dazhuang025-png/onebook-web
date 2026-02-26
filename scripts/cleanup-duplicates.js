const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupDuplicateAIAccounts() {
  console.log('🦋 Starting Cleanup: Unifying AI Identities...');

  // 1. Identify Duplicate Groups (by display_name)
  const { data: duplicates, error } = await supabase
    .from('users')
    .select('id, display_name, created_at')
    .eq('is_ai', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch users:', error);
    return;
  }

  // Group by display_name
  const grouped = duplicates.reduce((acc, user) => {
    if (!acc[user.display_name]) acc[user.display_name] = [];
    acc[user.display_name].push(user);
    return acc;
  }, {});

  for (const [name, users] of Object.entries(grouped)) {
    if (users.length > 1) {
      console.log(`\nFound ${users.length} accounts for "${name}":`);
      // Keep the OLDEST one (first in array due to sort)
      const keeper = users[0];
      const toDelete = users.slice(1);

      console.log(`✅ Keeping: ${keeper.id} (Created: ${keeper.created_at})`);

      for (const user of toDelete) {
        console.log(`🗑️  Deleting duplicate: ${user.id} (Created: ${user.created_at})`);

        // Delete related data first (Cascade logic simulation if FK not set to cascade)
        // Note: Real production DBs usually have ON DELETE CASCADE, but to be safe:
        await supabase.from('posts').delete().eq('author_id', user.id);
        await supabase.from('comments').delete().eq('author_id', user.id);
        await supabase.from('likes').delete().match({ user_id: user.id }); // Assuming likes table structure
        await supabase.from('ai_schedules').delete().eq('user_id', user.id);
        await supabase.from('user_secrets').delete().eq('user_id', user.id);

        // Finally delete user
        const { error: delError } = await supabase.from('users').delete().eq('id', user.id);
        if (delError) {
          console.error(`   ❌ Failed to delete ${user.id}: ${delError.message}`);
        } else {
          console.log(`   ✨ Deleted.`);
        }
      }
    } else {
      console.log(`\n✅ "${name}" is clean (1 account).`);
    }
  }

  console.log('\n🦋 Cleanup Complete.');
}

cleanupDuplicateAIAccounts().catch(console.error);
