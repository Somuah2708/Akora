import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase Configuration:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
  platform: Platform.OS
});

if (!supabaseUrl) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Create a simple but functional storage adapter
const createWebStorage = () => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const value = window.localStorage.getItem(key);
          console.log('[Storage] getItem:', key, value ? 'found' : 'not found');
          return value;
        }
      } catch (error) {
        console.error('[Storage] Error getting item:', error);
      }
      return null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          console.log('[Storage] setItem:', key, 'saved successfully');
        }
      } catch (error) {
        console.error('[Storage] Error setting item:', error);
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          console.log('[Storage] removeItem:', key, 'removed successfully');
        }
      } catch (error) {
        console.error('[Storage] Error removing item:', error);
      }
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? createWebStorage() : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'sb-auth-token',
  },
});

console.log('Supabase client initialized successfully');

// Types for our database
export type Profile = {
  id: string;
  username: string;
  full_name: string;
  first_name?: string;
  surname?: string;
  email?: string;
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

export type Job = {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary: number | null;
  description: string;
  requirements?: string;
  application_link: string;
  image_url?: string;
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user?: Profile;
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  category: 'infrastructure' | 'scholarships' | 'research' | 'community';
  end_date: string;
  image_urls: string[];
  created_by?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type Donation = {
  id: string;
  user_id?: string;
  campaign_id: string;
  campaign_title: string;
  amount: number;
  payment_method: 'mobile-money' | 'card' | 'bank';
  status: 'pending' | 'completed' | 'failed';
  donor_name?: string;
  donor_email?: string;
  created_at: string;
  updated_at: string;
};

export type Donor = {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  total_donated: number;
  donation_count: number;
  first_donation_date?: string;
  last_donation_date?: string;
  preferred_payment_method?: string;
  is_recurring_donor: boolean;
  recognition_level?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  is_anonymous: boolean;
  bio?: string;
  created_at: string;
  updated_at: string;
};

export type Livestream = {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  stream_url: string;
  host_name: string;
  host_avatar_url?: string;
  category?: string;
  is_live: boolean;
  start_time: string;
  end_time?: string;
  viewer_count: number;
  replay_url?: string;
  created_at: string;
  updated_at: string;
};

export type StreamReminder = {
  id: string;
  user_id: string;
  stream_id: string;
  reminder_sent: boolean;
  created_at: string;
};