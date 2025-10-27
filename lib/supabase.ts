import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase Configuration:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length
});

if (!supabaseUrl) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

console.log('Supabase client initialized successfully');

// Types for our database
export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  class?: string;
  year_group?: string;
  house?: string;
  created_at?: string;
  is_admin?: boolean;
  receives_notifications?: boolean;
  theme_preference?: 'light' | 'dark';
  is_class_public?: boolean;
  is_year_group_public?: boolean;
  is_house_public?: boolean;
  is_contact_public?: boolean;
  phone?: string;
  location?: string;
};

export type Chat = {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar_url?: string;
  created_at: string;
};

export type ChatParticipant = {
  chat_id: string;
  user_id: string;
  joined_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
};

export type ChatWithDetails = Chat & {
  participants: (ChatParticipant & { profiles: Profile })[];
  messages: Message[];
  last_message?: Message;
  unread_count?: number;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user?: Profile;
};

export type PostLike = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
};

export type PostBookmark = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type PostShare = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type PostWithInteractions = Post & {
  likes_count?: number;
  comments_count?: number;
  bookmarks_count?: number;
  shares_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
};

export type QuickAction = {
  id: string;
  title: string;
  icon_name: string;
  color: string;
  route: string;
  order_index: number;
  created_at?: string;
};

export type ProductService = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number | null;
  image_url?: string;
  category_name: string;
  is_featured: boolean;
  is_premium_listing: boolean;
  is_approved?: boolean;
  created_at: string;
  user?: Profile;
};