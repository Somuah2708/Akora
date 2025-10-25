import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  created_at?: string;
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
};