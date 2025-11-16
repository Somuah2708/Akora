import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, ScrollView, Linking, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Calendar, MapPin, Upload, CheckCircle2, XCircle, Play } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickDocument, pickMedia, uploadMedia } from '@/lib/media';
import { uploadProofFromUri, getSignedProofUrl } from '@/lib/storage';

type EventType = 'oaa' | 'akora';
type EventStatus = 'pending' | 'approved' | 'rejected' | 'published';

type AkoraEvent = {
  id: string;
  created_by: string;
  event_type: EventType;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time?: string | null;
  banner_url?: string | null;
  video_url?: string | null;
  gallery_urls?: string[] | null;
  status: EventStatus;
  listing_fee?: number | null;
  payment_proof_url?: string | null;
  category?: string | null;
  tags?: string[] | null;
  capacity?: number | null;
  organizer_name?: string | null;
  organizer_email?: string | null;
  organizer_phone?: string | null;
  registration_url?: string | null;
  visibility?: 'public' | 'alumni_only' | null;
  featured?: boolean | null;
  moderation_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
};

export default function AkoraEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<EventType>('oaa');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AkoraEvent[]>([]);
  const [pending, setPending] = useState<AkoraEvent[]>([]);

  // Submission form (Akora)
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(''); // ISO or readable e.g., 2025-12-20 18:00
  const [endDate, setEndDate] = useState('');
  const [bannerUrl, setBannerUrl] = useState<{ url: string } | null>(null);
  const [videoUrl, setVideoUrl] = useState<{ url: string } | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<{ url: string; type: 'image' | 'video' }[]>([]); // array of media items
  const [fee, setFee] = useState<number>(50); // dynamic listing fee based on package
  const [packageTier, setPackageTier] = useState<'basic'|'standard'|'priority'|'premium'>('standard');
  const [pickedProof, setPickedProof] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Extra optional fields
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState(''); // comma separated
  const [capacity, setCapacity] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [visibility, setVisibility] = useState<'public'|'alumni_only'>('public');
  const [featured, setFeatured] = useState(false);
  const [moderationDrafts, setModerationDrafts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const videoRefs = useRef<Map<string, Video | null>>(new Map());

  // Listing packages definition
  const PACKAGES = useMemo(() => ([
    { id: 'basic' as const, name: 'Basic', price: 0, perks: ['Listed in feed'], highlight: false },
    { id: 'standard' as const, name: 'Standard', price: 50, perks: ['Standard placement'], highlight: false },
    { id: 'priority' as const, name: 'Priority', price: 150, perks: ['Priority placement', 'Priority badge'], highlight: true },
    { id: 'premium' as const, name: 'Premium', price: 300, perks: ['Top placement', 'Featured badge'], highlight: true },
  ]), []);

  const getTierFromFee = useCallback((val?: number | null): 'basic'|'standard'|'priority'|'premium' => {
    const n = val ?? 0;
    if (n >= 300) return 'premium';
    if (n >= 150) return 'priority';
    if (n >= 50) return 'standard';
    return 'basic';
  }, []);

  const loadRole = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();
    const admin = data?.is_admin === true || data?.role === 'admin' || data?.role === 'staff';
    setIsAdmin(!!admin);
  }, [user]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Published list for tab
      const { data: list, error } = await supabase
        .from('akora_events')
        .select('*')
        .eq('event_type', activeTab)
        .eq('status', 'published')
        .order('start_time', { ascending: true });
      if (error) throw error;
      let arr = (list as AkoraEvent[]) || [];
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        arr = arr.filter(e => 
          e.title?.toLowerCase().includes(query) || 
          e.description?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query) ||
          e.category?.toLowerCase().includes(query)
        );
      }
      
      // Client-side prioritization: premium/priority first
      const weight = (ev: AkoraEvent) => {
        const tier = getTierFromFee(ev.listing_fee);
        const tierWeight = tier === 'premium' ? 3 : tier === 'priority' ? 2 : tier === 'standard' ? 1 : 0;
        const featuredBonus = ev.featured ? 1 : 0;
        return tierWeight * 10 + featuredBonus; // coarse weight
      };
      const sorted = [...arr].sort((a,b) => {
        const wa = weight(a), wb = weight(b);
        if (wb !== wa) return wb - wa;
        // Tiebreaker: upcoming sooner first
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
      setItems(sorted);

      // Pending moderation for admin (only for akora)
      if (activeTab === 'akora' && isAdmin) {
        const { data: pend } = await supabase
          .from('akora_events')
          .select('*')
          .eq('event_type', 'akora')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });
        setPending((pend as AkoraEvent[]) || []);
      } else {
        setPending([]);
      }
    } catch (err) {
      console.error('events fetch', err);
      Alert.alert('Error', 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAdmin, searchQuery]);

  useEffect(() => { loadRole(); }, [loadRole]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const pickProof = async () => {
    try {
      const doc = await pickDocument();
      if (doc) setPickedProof({ uri: doc.uri, name: doc.name, mimeType: doc.mimeType });
    } catch {}
  };

  // Media upload helpers (banner, video, gallery)
  const onPickBanner = async () => {
    if (!user) { Alert.alert('Sign in required'); return; }
    const asset = await pickMedia();
    if (!asset) return;
    const url = await uploadMedia(asset.uri, user.id, 'image', (asset as any).fileName || null, (asset as any).mimeType || null);
    if (url) setBannerUrl({ url });
  };

  const onPickVideo = async () => {
    if (!user) { Alert.alert('Sign in required'); return; }
    const asset = await pickMedia();
    if (!asset) return;
    const url = await uploadMedia(asset.uri, user.id, 'video', (asset as any).fileName || null, (asset as any).mimeType || null);
    if (url) setVideoUrl({ url });
  };

  const onAddGalleryImage = async () => {
    if (!user) { Alert.alert('Sign in required'); return; }
    const asset = await pickMedia();
    if (!asset) return;
    // Determine if it's a video or image from asset type
    const type = (asset as any).type?.startsWith('video') || (asset as any).duration ? 'video' : 'image';
    const url = await uploadMedia(asset.uri, user.id, type, (asset as any).fileName || null, (asset as any).mimeType || null);
    if (url) setGalleryUrls(prev => [...prev, { url, type }]);
  };

  const removeGalleryItem = (index: number) => {
    setGalleryUrls(prev => prev.filter((_, i) => i !== index));
  };

  const submitAkoraEvent = async () => {
    if (!user) { Alert.alert('Sign in required'); return; }
    if (!title.trim() || !description.trim() || !location.trim() || !startDate.trim()) {
      Alert.alert('Missing details', 'Please complete title, description, location and start date.');
      return;
    }
    if (!pickedProof) {
      Alert.alert('Payment required', 'Please upload payment proof for the listing fee.');
      return;
    }
    setSubmitting(true);
    try {
      // Upload proof to private bucket and store path
      const { path } = await uploadProofFromUri(pickedProof.uri, user.id);
      const { error } = await supabase
        .from('akora_events')
        .insert({
          created_by: user.id,
          event_type: 'akora',
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          start_time: new Date(startDate).toISOString(),
          end_time: endDate ? new Date(endDate).toISOString() : null,
          banner_url: bannerUrl?.url || null,
          video_url: videoUrl?.url || null,
          gallery_urls: galleryUrls.length > 0 ? galleryUrls.map(g => g.url) : null,
          status: 'pending',
          listing_fee: fee,
          package_tier: packageTier,
          payment_proof_url: path,
          category: category.trim() || null,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
          capacity: capacity ? parseInt(capacity, 10) : null,
          organizer_name: organizerName.trim() || null,
          organizer_email: organizerEmail.trim() || null,
          organizer_phone: organizerPhone.trim() || null,
          registration_url: registrationUrl.trim() || null,
          visibility,
          featured: featured || packageTier === 'premium',
        });
      if (error) throw error;
      Alert.alert('Submitted', 'Your event was submitted for review.');
      setShowForm(false);
      setTitle(''); setDescription(''); setLocation(''); setStartDate(''); setEndDate(''); setBannerUrl(null); setVideoUrl(null); setGalleryUrls([]); setPickedProof(null);
      fetchData();
    } catch (err: any) {
      console.error('submit event', err);
      Alert.alert('Error', err?.message || 'Failed to submit event');
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (id: string) => {
    try {
      const notes = moderationDrafts[id]?.trim() || null;
      const { error } = await supabase.from('akora_events').update({ status: 'published', moderation_notes: notes, approved_by: user?.id ?? null, approved_at: new Date().toISOString(), published_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) { Alert.alert('Error', 'Failed to approve'); }
  };
  const reject = async (id: string) => {
    try {
      const notes = moderationDrafts[id]?.trim() || null;
      const { error } = await supabase.from('akora_events').update({ status: 'rejected', moderation_notes: notes }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) { Alert.alert('Error', 'Failed to reject'); }
  };

  const renderCard = (ev: AkoraEvent) => (
    <TouchableOpacity key={ev.id} activeOpacity={0.9} onPress={() => router.push(`/events/${ev.id}`)} style={styles.card}>
      {ev.video_url ? (
        <View style={styles.mediaWrapper}>
          <Video
            ref={(r) => { videoRefs.current.set(ev.id, r); }}
            source={{ uri: ev.video_url }}
            style={styles.banner}
            useNativeControls
            resizeMode={"cover" as any}
            shouldPlay={false}
            isLooping={false}
            usePoster={!!ev.banner_url}
            posterSource={ev.banner_url ? { uri: ev.banner_url } : undefined}
          />
          <TouchableOpacity
            onPress={() => videoRefs.current.get(ev.id)?.presentFullscreenPlayer()}
            style={styles.overlayPlay}
            accessibilityRole="button"
            accessibilityLabel="Play fullscreen"
          >
            <Play size={18} color="#fff" />
            <Text style={styles.overlayPlayText}>Fullscreen</Text>
          </TouchableOpacity>
        </View>
      ) : ev.banner_url ? (
        <Image source={{ uri: ev.banner_url }} style={styles.banner} />
      ) : null}
      <View style={styles.cardBody}>
        <Text style={styles.title}>{ev.title}</Text>
        {/* Tier badge */}
        {(() => { const tier = getTierFromFee(ev.listing_fee); return (
          tier === 'premium' ? <View style={[styles.tierBadge, { backgroundColor:'#F59E0B'}]}><Text style={styles.tierBadgeText}>Premium</Text></View>
          : tier === 'priority' ? <View style={[styles.tierBadge, { backgroundColor:'#3B82F6'}]}><Text style={styles.tierBadgeText}>Priority</Text></View>
          : null);
        })()}
        <View style={styles.row}><Calendar size={14} color="#1F2937" /><Text style={styles.meta}>{new Date(ev.start_time).toLocaleString()}</Text></View>
        <View style={styles.row}><MapPin size={14} color="#1F2937" /><Text style={styles.meta}>{ev.location}</Text></View>
        <Text style={styles.desc} numberOfLines={3}>{ev.description}</Text>
        {Array.isArray(ev.gallery_urls) && ev.gallery_urls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {ev.gallery_urls.map((u, idx) => (
              <Image key={idx} source={{ uri: u }} style={styles.galleryThumb} />
            ))}
          </ScrollView>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><ArrowLeft size={22} color="#111" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Akora Events</Text>
        <TouchableOpacity onPress={() => router.push('/events/my-akora-events' as any)} style={styles.myEventsBtn}>
          <Calendar size={20} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setActiveTab('oaa')} style={[styles.tab, activeTab === 'oaa' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'oaa' && styles.activeTabText]}>OAA Events</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('akora')} style={[styles.tab, activeTab === 'akora' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'akora' && styles.activeTabText]}>Akora Events</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events by title, location, or category..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events by title, location, or category..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Admin tools for OAA tab: quick add */}
      {activeTab === 'oaa' && isAdmin && (
        <View style={styles.adminHint}> 
          <Text style={styles.hintText}>Only admins can post school events.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowForm(s => !s)}>
            <Plus size={18} color="#fff" /><Text style={styles.primaryText}>{showForm ? 'Close' : 'Add OAA Event'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Akora tab: submit event CTA */}
      {activeTab === 'akora' && (
        <View style={styles.submitBar}>
          <Text style={styles.hintText}>Alumni events require approval and a listing fee.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowForm(s => !s)}>
            <Plus size={18} color="#fff" /><Text style={styles.primaryText}>{showForm ? 'Close' : 'Submit Event'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submission form (used for Akora; admins can also add OAA by flipping tab) */}
      {showForm && (
        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formBox}>
            <Text style={styles.formTitle}>{activeTab === 'oaa' ? 'Create OAA Event' : 'Submit Akora Event'}</Text>
            
            {/* Required Fields */}
            <Text style={styles.sectionLabel}>Required Information</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Event title *" placeholderTextColor="#9CA3AF" style={styles.input} />
            <TextInput value={description} onChangeText={setDescription} placeholder="Event description *" placeholderTextColor="#9CA3AF" style={[styles.input, { height: 90 }]} multiline />
            <TextInput value={location} onChangeText={setLocation} placeholder="Venue location *" placeholderTextColor="#9CA3AF" style={styles.input} />
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date & time (e.g., 2025-12-20 18:00) *" placeholderTextColor="#9CA3AF" style={styles.input} />
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="End date & time (optional)" placeholderTextColor="#9CA3AF" style={styles.input} />
            
            {/* Organizer Details */}
            <Text style={styles.sectionLabel}>Organizer Details</Text>
            <TextInput value={organizerName} onChangeText={setOrganizerName} placeholder="Organizer name" placeholderTextColor="#9CA3AF" style={styles.input} />
            <TextInput value={organizerEmail} onChangeText={setOrganizerEmail} placeholder="Contact email" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput value={organizerPhone} onChangeText={setOrganizerPhone} placeholder="Contact phone number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" style={styles.input} />
            
            {/* Event Details */}
            <Text style={styles.sectionLabel}>Event Details</Text>
            <TextInput value={category} onChangeText={setCategory} placeholder="Category (e.g., Gala, Workshop, Sports)" placeholderTextColor="#9CA3AF" style={styles.input} />
            <TextInput value={tags} onChangeText={setTags} placeholder="Tags (e.g., networking, alumni, fundraiser)" placeholderTextColor="#9CA3AF" style={styles.input} />
            <TextInput value={capacity} onChangeText={setCapacity} placeholder="Maximum capacity (number of attendees)" placeholderTextColor="#9CA3AF" keyboardType="number-pad" style={styles.input} />
            <TextInput value={registrationUrl} onChangeText={setRegistrationUrl} placeholder="Registration/Ticket URL (optional)" placeholderTextColor="#9CA3AF" autoCapitalize="none" style={styles.input} />
            
            {/* Event Banner */}
            <Text style={styles.sectionLabel}>Event Banner</Text>
            {bannerUrl ? (
              <View style={styles.mediaItem}>
                <Image source={{ uri: bannerUrl.url }} style={styles.mediaPreview} />
                <View style={styles.mediaItemInfo}>
                  <Text style={styles.mediaItemType}>🖼️ Banner Image</Text>
                  <Text style={styles.mediaItemUrl} numberOfLines={1}>{bannerUrl.url}</Text>
                </View>
                <TouchableOpacity onPress={() => setBannerUrl(null)} style={styles.removeBtn}>
                  <XCircle size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={onPickBanner} style={styles.uploadBtn}>
                <Plus size={16} color="#4169E1" />
                <Text style={styles.uploadBtnText}>Upload Banner Image</Text>
              </TouchableOpacity>
            )}

            {/* Promo Video */}
            <Text style={styles.sectionLabel}>Promo Video</Text>
            {videoUrl ? (
              <View style={styles.mediaItem}>
                <Video source={{ uri: videoUrl.url }} style={styles.mediaPreview} resizeMode={"cover" as any} shouldPlay={false} />
                <View style={styles.mediaItemInfo}>
                  <Text style={styles.mediaItemType}>🎥 Promo Video</Text>
                  <Text style={styles.mediaItemUrl} numberOfLines={1}>{videoUrl.url}</Text>
                </View>
                <TouchableOpacity onPress={() => setVideoUrl(null)} style={styles.removeBtn}>
                  <XCircle size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={onPickVideo} style={styles.uploadBtn}>
                <Plus size={16} color="#4169E1" />
                <Text style={styles.uploadBtnText}>Upload Promo Video</Text>
              </TouchableOpacity>
            )}
            
            {/* Media Gallery */}
            <Text style={styles.sectionLabel}>Media Gallery (Images & Videos)</Text>
            <Text style={styles.hintText}>Add multiple images or videos to showcase your event.</Text>
            <TouchableOpacity onPress={onAddGalleryImage} style={styles.uploadBtn}>
              <Plus size={16} color="#4169E1" />
              <Text style={styles.uploadBtnText}>Add Image or Video</Text>
            </TouchableOpacity>
            
            {/* Gallery Items List */}
            {galleryUrls.length > 0 && (
              <View style={styles.galleryList}>
                {galleryUrls.map((item, index) => (
                  <View key={index} style={styles.galleryListItem}>
                    <TouchableOpacity onPress={() => setFullscreenMedia(item)} style={styles.galleryPreview}>
                      {item.type === 'video' ? (
                        <Video source={{ uri: item.url }} style={styles.galleryPreviewMedia} resizeMode={"cover" as any} shouldPlay={false} />
                      ) : (
                        <Image source={{ uri: item.url }} style={styles.galleryPreviewMedia} />
                      )}
                    </TouchableOpacity>
                    <View style={styles.galleryItemInfo}>
                      <Text style={styles.galleryItemType}>{item.type === 'video' ? '🎥 Video' : '🖼️ Image'}</Text>
                      <Text style={styles.galleryItemUrl} numberOfLines={1}>{item.url}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeGalleryItem(index)} style={styles.removeBtn}>
                      <XCircle size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            {/* Listing Package */}
            <Text style={styles.sectionLabel}>Listing Package</Text>
            <Text style={styles.hintText}>Higher packages get more visibility.</Text>
            <View style={styles.pkgGrid}>
              {PACKAGES.map(p => (
                <TouchableOpacity key={p.id} style={[styles.pkgCard, packageTier===p.id && styles.pkgCardActive]} onPress={() => { setPackageTier(p.id); setFee(p.price); if (p.id==='premium') setFeatured(true); }}>
                  <Text style={styles.pkgName}>{p.name}</Text>
                  <Text style={styles.pkgPrice}>GHS {p.price}</Text>
                  <View style={{ marginTop: 6 }}>
                    {p.perks.map((perk,i)=>(<Text key={i} style={styles.pkgPerk}>• {perk}</Text>))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Visibility/Featured */}
            <Text style={styles.sectionLabel}>Event Settings</Text>
            <Text style={styles.hintText}>Control who can see your event and whether it appears at the top of the list.</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => setVisibility('public')} style={[styles.tagBtn, visibility==='public' && styles.tagBtnActive]}>
                <Text style={[styles.tagText, visibility==='public' && styles.tagTextActive]}>Public</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisibility('alumni_only')} style={[styles.tagBtn, visibility==='alumni_only' && styles.tagBtnActive]}>
                <Text style={[styles.tagText, visibility==='alumni_only' && styles.tagTextActive]}>Alumni Only</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFeatured(f => !f)} style={[styles.tagBtn, featured && styles.tagBtnActive]}>
                <Text style={[styles.tagText, featured && styles.tagTextActive]}>{featured ? 'Featured ✓' : 'Featured'}</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'akora' && (
              <View style={styles.feeBox}>
                <Text style={styles.feeText}>Listing Fee: GHS {fee}</Text>
                <Text style={styles.feeSubtext}>Selected: {packageTier.charAt(0).toUpperCase()+packageTier.slice(1)} package</Text>
                <TouchableOpacity style={styles.proofBtn} onPress={pickProof}>
                  <Upload size={16} color="#4169E1" />
                  <Text style={styles.proofText}>{pickedProof ? pickedProof.name : 'Upload payment proof (screenshot or receipt)'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              disabled={submitting}
              style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
              onPress={async () => {
              if (activeTab === 'oaa') {
                if (!isAdmin) { Alert.alert('Admins only'); return; }
                // Create published OAA event
                try {
                  const { error } = await supabase.from('akora_events').insert({
                    created_by: user?.id,
                    event_type: 'oaa',
                    title: title.trim(),
                    description: description.trim(),
                    location: location.trim(),
                    start_time: new Date(startDate).toISOString(),
                    end_time: endDate ? new Date(endDate).toISOString() : null,
                    banner_url: bannerUrl?.url || null,
                    video_url: videoUrl?.url || null,
                    gallery_urls: galleryUrls.length > 0 ? galleryUrls.map(g => g.url) : null,
                    status: 'published',
                    listing_fee: 0,
                  });
                  if (error) throw error;
                  Alert.alert('Saved', 'OAA event published.');
                  setShowForm(false);
                  setTitle(''); setDescription(''); setLocation(''); setStartDate(''); setEndDate(''); setBannerUrl(null); setVideoUrl(null); setGalleryUrls([]);
                  fetchData();
                } catch (err: any) {
                  Alert.alert('Error', err?.message || 'Failed to create event');
                }
              } else {
                await submitAkoraEvent();
              }
            }}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Plus size={18} color="#fff" />}
            <Text style={styles.primaryText}>{activeTab === 'oaa' ? 'Publish Event' : 'Submit for Approval'}</Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Pending approvals for admins (Akora tab) */}
      {activeTab === 'akora' && isAdmin && pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          {pending.map(p => (
            <View key={p.id} style={styles.pendingCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>{p.title}</Text>
                <Text style={styles.pendingMeta}>{new Date(p.start_time).toLocaleString()} · {p.location}</Text>
                <Text style={styles.pendingDesc} numberOfLines={2}>{p.description}</Text>
                {p.payment_proof_url ? (
                  <TouchableOpacity
                    onPress={async () => {
                      const url = await getSignedProofUrl(p.payment_proof_url!);
                      if (url) {
                        Alert.alert('Open Proof', 'Open payment proof in browser?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open', onPress: () => Linking.openURL(url) }
                        ]);
                      }
                    }}
                    style={styles.linkBtn}
                  >
                    <Upload size={14} color="#4169E1" />
                    <Text style={styles.linkText}>View Payment Proof</Text>
                  </TouchableOpacity>
                ) : null}
                <TextInput
                  value={moderationDrafts[p.id] || ''}
                  onChangeText={(t) => setModerationDrafts(prev => ({ ...prev, [p.id]: t }))}
                  placeholder="Moderation notes (optional)"
                  style={[styles.input, { marginTop: 8 }]}
                />
              </View>
              <View style={styles.actionsCol}>
                <TouchableOpacity onPress={() => approve(p.id)} style={[styles.actBtn,{backgroundColor:'#10B981'}]}>
                  <CheckCircle2 size={16} color="#fff" />
                  <Text style={styles.actText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => reject(p.id)} style={[styles.actBtn,{backgroundColor:'#EF4444'}]}>
                  <XCircle size={16} color="#fff" />
                  <Text style={styles.actText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Published list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.sectionTitle}>{activeTab === 'oaa' ? 'School Events' : 'Alumni Events'}</Text>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
        ) : items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No events yet.</Text></View>
        ) : (
          <>
            {activeTab==='akora' && (()=>{
              const priorityItems = items.filter(ev => getTierFromFee(ev.listing_fee) !== 'basic' && getTierFromFee(ev.listing_fee) !== 'standard');
              const others = items.filter(ev => !priorityItems.find(p => p.id===ev.id));
              return (
                <>
                  {priorityItems.length>0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={[styles.sectionTitle, { paddingTop: 0 }]}>Priority Events</Text>
                      {priorityItems.map(renderCard)}
                    </View>
                  )}
                  <Text style={styles.sectionTitle}>All Events</Text>
                  {others.map(renderCard)}
                </>
              );
            })()}
            {activeTab!=='akora' && items.map(renderCard)}
          </>
        )}
      </ScrollView>

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <Modal visible={!!fullscreenMedia} transparent animationType="fade" onRequestClose={() => setFullscreenMedia(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setFullscreenMedia(null)}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setFullscreenMedia(null)}>
              <XCircle size={36} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={1} style={styles.modalMediaContainer} onPress={(e) => e.stopPropagation()}>
              {fullscreenMedia.type === 'video' ? (
                <Video 
                  source={{ uri: fullscreenMedia.url }} 
                  style={styles.modalMedia} 
                  useNativeControls 
                  resizeMode={"contain" as any} 
                  shouldPlay 
                />
              ) : (
                <Image source={{ uri: fullscreenMedia.url }} style={styles.modalMedia} resizeMode="contain" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  tab: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, alignItems: 'center' },
  activeTab: { backgroundColor: '#4169E1', borderColor: '#4169E1' },
  tabText: { fontWeight: '700', color: '#111' },
  activeTabText: { color: '#fff' },
  adminHint: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  submitBar: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  hintText: { fontSize: 12, color: '#6B7280' },
  formScroll: { maxHeight: 500 },
  formScrollContent: { paddingBottom: 16 },
  formBox: { margin: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#F9FAFB', gap: 10 },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff' },
  feeBox: { marginTop: 12, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, gap: 6 },
  feeText: { fontSize: 14, fontWeight: '700', color: '#1E40AF' },
  feeSubtext: { fontSize: 11, color: '#3B82F6' },
  proofBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8 },
  proofText: { color: '#4169E1', fontWeight: '600', fontSize: 13 },
  tagBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, backgroundColor: '#fff' },
  tagBtnActive: { backgroundColor: '#4169E1', borderColor: '#4169E1' },
  tagText: { fontSize: 12, fontWeight: '700', color: '#111' },
  tagTextActive: { color: '#fff' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallBtn: { marginLeft: 8, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8 },
  smallBtnText: { color: '#3730A3', fontWeight: '700', fontSize: 12 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginTop: 8 },
  uploadBtnText: { color: '#1E40AF', fontWeight: '700', fontSize: 14 },
  pkgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pkgCard: { flexBasis: '48%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff', padding: 12 },
  pkgCardActive: { borderColor: '#4169E1', backgroundColor: '#EEF2FF' },
  pkgName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  pkgPrice: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginTop: 2 },
  pkgPerk: { fontSize: 11, color: '#374151' },
  mediaItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 },
  mediaPreview: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  mediaItemInfo: { flex: 1, gap: 2 },
  mediaItemType: { fontSize: 13, fontWeight: '700', color: '#374151' },
  mediaItemUrl: { fontSize: 11, color: '#6B7280' },
  galleryList: { marginTop: 8, gap: 8 },
  galleryListItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  galleryPreview: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  galleryPreviewMedia: { width: '100%', height: '100%' },
  galleryItemInfo: { flex: 1, gap: 2 },
  galleryItemType: { fontSize: 12, fontWeight: '700', color: '#374151' },
  galleryItemUrl: { fontSize: 11, color: '#6B7280' },
  removeBtn: { padding: 4 },
  primaryBtn: { marginTop: 16, backgroundColor: '#4169E1', paddingVertical: 14, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  section: { paddingHorizontal: 16, paddingTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  mediaWrapper: { position: 'relative' },
  banner: { width: '100%', height: 160 },
  overlayPlay: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  overlayPlayText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cardBody: { padding: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  tierBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  meta: { fontSize: 13, color: '#374151' },
  desc: { marginTop: 8, fontSize: 13, color: '#4B5563', lineHeight: 18 },
  galleryThumb: { width: 72, height: 72, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pendingCard: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#FCD34D', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 10, marginHorizontal: 16, marginTop: 8 },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  pendingMeta: { fontSize: 12, color: '#B45309', marginTop: 4 },
  pendingDesc: { fontSize: 12, color: '#9A3412', marginTop: 4 },
  actionsCol: { justifyContent: 'center', gap: 6 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  actText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  linkText: { color: '#4169E1', fontWeight: '700', fontSize: 12 },
  center: { padding: 24, alignItems: 'center' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#6B7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 60, right: 20, zIndex: 100, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  modalMediaContainer: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, justifyContent: 'center', alignItems: 'center' },
  modalMedia: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.8 },
  myEventsBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB' },
  searchInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1F2937' },
});