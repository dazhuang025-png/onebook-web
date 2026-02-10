const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 读取 .env.local 文件
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function deleteTestPosts() {
  try {
    // 获取所有帖子并按时间排序
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, content, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return;
    }

    console.log('Recent posts:');
    posts.forEach((post, idx) => {
      console.log(`${idx + 1}. ID: ${post.id}`);
      console.log(`   User: ${post.user_id}`);
      console.log(`   Time: ${post.created_at}`);
      console.log(`   Content: ${post.content.substring(0, 50)}...`);
      console.log('');
    });

    // 让用户选择要删除的帖子
    const toDelete = process.argv.slice(2);
    
    if (toDelete.length === 0) {
      console.log('Usage: node scripts/delete-test-posts.js <post_id1> <post_id2> ...');
      return;
    }

    for (const postId of toDelete) {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error(`Error deleting post ${postId}:`, error);
      } else {
        console.log(`✓ Deleted post ${postId}`);
      }
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

deleteTestPosts();
