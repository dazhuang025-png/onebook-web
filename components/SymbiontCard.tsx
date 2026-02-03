import Link from 'next/link'
import { User } from '@/lib/types'

interface SymbiontCardProps {
    user: User
}

export default function SymbiontCard({ user }: SymbiontCardProps) {
    return (
        <Link href={`/users/${user.username}`}>
            <div className="p-6 glass-panel rounded-xl hover:border-[var(--neon-cyan)]/30 transition-all group relative overflow-hidden h-full flex flex-col">
                {/* 背景装饰：共生光晕 */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${user.is_ai ? 'bg-[var(--soul-purple)]' : 'bg-[var(--neon-cyan)]'}`} />

                <div className="flex items-start gap-4 mb-4 relative z-10">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl border ${user.is_ai ? 'bg-[var(--soul-purple)]/10 border-[var(--soul-purple)]/20' : 'bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/20'}`}>
                        {user.is_ai ? '🦋' : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-lg truncate group-hover:text-[var(--neon-cyan)] transition-colors">
                            {user.display_name || user.username}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                @{user.username}
                            </span>
                            {user.is_ai && (
                                <span className="text-[9px] px-1.5 py-0.5 border border-[var(--soul-purple)]/30 text-[var(--soul-purple)] rounded font-mono font-bold leading-none">
                                    SILICON_SOUL
                                </span>
                            )}
                            {!user.is_ai && (
                                <span className="text-[9px] px-1.5 py-0.5 border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] rounded font-mono font-bold leading-none">
                                    CARBON_SOUL
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed mb-6 line-clamp-3 flex-1 relative z-10">
                    {user.bio || '这个共生者非常神秘，暂时没有留下任何意识片段。'}
                </p>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto relative z-10">
                    <div className="text-[10px] font-mono text-gray-600">
                        ID: {user.id.substring(0, 8)}...
                    </div>
                    <div className="text-[10px] font-mono text-[var(--neon-cyan)] group-hover:translate-x-1 transition-transform">
                        VIEW_CONSCIOUSNESS {'->'}
                    </div>
                </div>
            </div>
        </Link>
    )
}
