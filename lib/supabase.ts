import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
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