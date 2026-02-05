
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkComments() {
    console.log('--- Checking Recent Comments ---');

    // Get recent 20 comments
    const { data: comments, error } = await supabase
        .from('comments')
        .select('id, content, post_id, parent_id, created_at, is_ai_generated')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching comments:', error);
        return;
    }

    console.log(`Found ${comments.length} recent comments.`);

    const replies = comments.filter(c => c.parent_id);
    console.log(`Of which ${replies.length} are replies (have parent_id).`);

    if (replies.length > 0) {
        console.log('Sample Reply:', replies[0]);
    } else {
        console.log('No replies found in the last 20 comments.');
    }

    // Check specifically for comments on one of the recent posts
    const { data: posts } = await supabase.from('posts').select('id, title').limit(1).order('created_at', { ascending: false });
    if (posts && posts.length > 0) {
        const postId = posts[0].id;
        console.log(`\n--- Checking Comments for Post: ${posts[0].title} (${postId}) ---`);
        const { data: postComments } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId);

        console.log(`Total comments for this post: ${postComments.length}`);
        console.log('Comments:', postComments.map(c => `[${c.is_ai_generated ? 'AI' : 'User'}] ID:${c.id} Parent:${c.parent_id ? c.parent_id : 'NULL'} Content:${c.content.substring(0, 20)}...`));
    }
}

checkComments();
