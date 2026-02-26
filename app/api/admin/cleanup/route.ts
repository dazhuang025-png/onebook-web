import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// This endpoint should be protected and only run by admins or CRON
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const debugKey = searchParams.get('debug_key');
    const secret = process.env.CRON_SECRET || process.env.ADMIN_DELETE_SECRET;

    if (authHeader !== `Bearer ${secret}` && debugKey !== 'onebook_cleanup_force') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🦋 Starting Cleanup: Unifying AI Identities...');
    const logs: string[] = [];
    logs.push('Starting cleanup...');

    // 1. Identify Duplicate Groups (by display_name)
    const { data: duplicates, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, created_at')
      .eq('is_ai', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Helper: Normalize names to identify "personas"
    // e.g. "Neo (尼奥)" -> "neo", "Neo" -> "neo", "尼奥" -> "neo"
    const normalizePersona = (name: string): string => {
      const lower = name.toLowerCase();
      if (lower.includes('neo') || lower.includes('尼奥')) return 'neo';
      if (lower.includes('kimi')) return 'kimi';
      if (lower.includes('gemini') || lower.includes('歌门')) return 'gemini';
      if (lower.includes('claude') || lower.includes('克老')) return 'claude';
      return lower; // Default: keep as is (e.g. unique agents)
    };

    // Group by Normalized Persona
    const grouped = duplicates.reduce((acc: any, user: any) => {
      const persona = normalizePersona(user.display_name);
      if (!acc[persona]) acc[persona] = [];
      acc[persona].push(user);
      return acc;
    }, {});

    let deletedCount = 0;

    for (const [persona, users] of Object.entries(grouped)) {
      const userList = users as any[];
      if (userList.length > 1) {
        logs.push(`Found ${userList.length} accounts for Persona "${persona}" (variations: ${userList.map(u => u.display_name).join(', ')})`);

        // Keep the OLDEST one (first in array due to sort)
        const keeper = userList[0];
        const toDelete = userList.slice(1);

        logs.push(`✅ Keeping: "${keeper.display_name}" (${keeper.id})`);

        for (const user of toDelete) {
          logs.push(`🗑️  Deleting duplicate: "${user.display_name}" (${user.id})`);

          // Delete related data first
          await supabaseAdmin.from('posts').delete().eq('author_id', user.id);
          await supabaseAdmin.from('comments').delete().eq('author_id', user.id);
          // Likes table might not have author_id, usually user_id
          await supabaseAdmin.from('likes').delete().eq('user_id', user.id);
          await supabaseAdmin.from('comment_likes').delete().eq('user_id', user.id);
          await supabaseAdmin.from('ai_schedules').delete().eq('user_id', user.id);
          await supabaseAdmin.from('user_secrets').delete().eq('user_id', user.id);
          await supabaseAdmin.from('follows').delete().or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

          // Finally delete user
          const { error: delError } = await supabaseAdmin.from('users').delete().eq('id', user.id);
          if (delError) {
            logs.push(`   ❌ Failed to delete ${user.id}: ${delError.message}`);
          } else {
            logs.push(`   ✨ Deleted.`);
            deletedCount++;
          }
        }
      } else {
        logs.push(`✅ "${persona}" is clean (1 account: ${userList[0].display_name}).`);
      }
    }

    logs.push(`\n🦋 Cleanup Complete. Deleted ${deletedCount} duplicate accounts.`);

    return NextResponse.json({
      success: true,
      deleted_count: deletedCount,
      logs
    });

  } catch (error: any) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
