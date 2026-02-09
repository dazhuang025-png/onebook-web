
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Force Anon Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
    console.log('Testing comments(count) query with ANON KEY...');

    // 1. Find a post that definitely has comments
    const { data: comments, error: commentError } = await supabase
        .from('comments')
        .select('post_id')
        .limit(5);

    if (commentError) {
        console.error('Error fetching likely comments:', commentError);
        return;
    }

    if (!comments || comments.length === 0) {
        console.log('No comments found in DB at all.');
        return;
    }

    const targetPostId = comments[0].post_id;
    console.log(`Found a post with comments (ID: ${targetPostId}). Querying count...`);

    // 2. Query that post specifically
    const { data, error } = await supabase
        .from('posts')
        .select(`
      id,
      title,
      comments(count)
    `)
        .eq('id', targetPostId)
        .single();

    if (error) {
        console.error('Error fetching post:', error);
    } else {
        console.log('Result Structure:');
        console.log(JSON.stringify(data, null, 2));

        if (data) {
            console.log('\nField Access Check:');
            console.log('post.comments:', data.comments);
            console.log('Is Array?', Array.isArray(data.comments));
            console.log('first.comments[0]:', data.comments && data.comments[0]);
            console.log('Count Value:', data.comments && data.comments[0] ? data.comments[0].count : 'undefined');
        }
    }
}

checkCount();
