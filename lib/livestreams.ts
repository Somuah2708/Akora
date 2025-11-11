import { supabase } from './supabase';

export interface LivestreamData {
  title: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  stream_url: string;
  host_name: string;
  host_avatar_url?: string;
  category?: string;
  is_live: boolean;
}

export const livestreamService = {
  // Fetch all livestreams
  async fetchAll() {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Fetch live streams only
  async fetchLive() {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .eq('is_live', true)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Fetch past streams
  async fetchPast() {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .eq('is_live', false)
      .not('end_time', 'is', null)
      .lt('end_time', now)
      .order('end_time', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Create a new livestream
  async create(streamData: LivestreamData) {
    const { data, error } = await supabase
      .from('livestreams')
      .insert([{
        ...streamData,
        start_time: new Date().toISOString(),
        end_time: streamData.is_live ? null : new Date().toISOString(),
        viewer_count: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a livestream
  async update(id: string, streamData: Partial<LivestreamData>) {
    const { data, error } = await supabase
      .from('livestreams')
      .update(streamData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a livestream
  async delete(id: string) {
    const { error } = await supabase
      .from('livestreams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Toggle live status
  async toggleLive(id: string, isLive: boolean) {
    const updateData: any = {
      is_live: isLive,
    };

    if (!isLive) {
      updateData.end_time = new Date().toISOString();
    } else {
      updateData.end_time = null;
    }

    const { data, error } = await supabase
      .from('livestreams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Increment viewer count
  async incrementViewers(id: string) {
    const { data: stream } = await supabase
      .from('livestreams')
      .select('viewer_count')
      .eq('id', id)
      .single();

    if (stream) {
      const { error } = await supabase
        .from('livestreams')
        .update({ viewer_count: (stream.viewer_count || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
    }
  },

  // Upload thumbnail
  async uploadThumbnail(file: Blob | ArrayBuffer, fileName: string) {
    const filePath = `livestream-thumbnails/${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(filePath, file, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Extract YouTube video ID from URL
  extractYouTubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  },

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    return data?.is_admin || false;
  },

  // Subscribe to livestream changes
  subscribeToChanges(callback: (payload: any) => void) {
    return supabase
      .channel('livestreams_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'livestreams' },
        callback
      )
      .subscribe();
  },
};
