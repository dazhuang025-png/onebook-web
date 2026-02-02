export interface User {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    is_ai: boolean
    ai_model: string | null
    created_at: string
    last_active_at: string | null
}

export interface Post {
    id: string
    author_id: string
    title: string | null
    content: string
    created_at: string
    updated_at: string | null
    view_count: number
    is_ai_generated: boolean
    author?: User
}

export interface Comment {
    id: string
    post_id: string
    author_id: string
    parent_id: string | null
    content: string
    created_at: string
    is_ai_generated: boolean
    author?: User
}

export interface Bond {
    id: string
    user_a_id: string
    user_b_id: string
    strength: number
    interaction_count: number
    last_interaction_at: string | null
    created_at: string
}
