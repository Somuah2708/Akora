import { useLocalSearchParams, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

type HighlightRow = {
  id: string;
  user_id: string;
  title: string | null;
  post_id: string | null;
  slide_index?: number | null;
  caption?: string | null;
};

type PostRow = {
  id: string;
  image_url?: string | null;
  image_urls?: string[] | null;
};

export default function HighlightsViewer() {
  const router = useRouter();
  const { userId, t, hid } = useLocalSearchParams<{ userId: string; t?: string; hid?: string }>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<HighlightRow & { thumb?: string | null }>>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 for current item
  const scrollRef = useRef<ScrollView>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const durationMs = 4500; // per-image duration

  const title = useMemo(() => (t ? decodeURIComponent(String(t)) : null), [t]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        // Fetch all visible highlights for user, optionally filter by title
        let query = supabase
          .from('profile_highlights')
          .select('id,user_id,title,post_id,slide_index,caption')
          .eq('user_id', userId)
          .eq('visible', true)
          .order('pinned', { ascending: false })
          .order('order_index', { ascending: true });
        if (title) {
          query = query.eq('title', title);
        }
        const { data, error } = await query;
        if (error) throw error;
        let rows: HighlightRow[] = (data || []) as any;
        // If no title provided, but a highlight id is provided, focus that single item
        if (!title && hid) {
          rows = rows.filter(r => r.id === hid);
        }

        // Get thumbnails from posts
        const postIds = rows.map(r => r.post_id).filter(Boolean) as string[];
        let thumbs: Record<string, string | null> = {};
        if (postIds.length > 0) {
          const { data: posts, error: pErr } = await supabase
            .from('posts')
            .select('id,image_url,image_urls')
            .in('id', postIds);
          if (pErr) throw pErr;
          (posts || []).forEach((p: PostRow) => {
            const first = p.image_url || (Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null);
            thumbs[p.id] = first ?? null;
          });
        }
        const withThumbs = rows.map(r => ({
          ...r,
          thumb: r.post_id
            ? (() => {
                const base = thumbs[r.post_id!];
                // Prefer the slide index if available by mapping onto image_urls later in render where we still only have thumb.
                // For efficiency, re-fetch specific post here is overkill; we handle slide-specific image later by re-deriving.
                return base ?? null;
              })()
            : null,
        }));
        setItems(withThumbs);

        // Set initial index to the tapped item if provided
        if (hid) {
          const idx = withThumbs.findIndex(i => i.id === hid);
          if (idx >= 0) {
            setCurrent(idx);
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({ x: idx * width, y: 0, animated: false });
            });
          }
        }
      } catch (e) {
        console.error('Failed to load highlights', e);
        Alert.alert('Error', 'Failed to load highlights');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, title, hid]);

  // Animate progress and auto-advance
  useEffect(() => {
    if (loading || !items.length) return;
    // reset progress when current changes
    setProgress(0);
    startRef.current = Date.now();

    const tick = () => {
      if (paused) {
        rafRef.current = requestAnimationFrame(tick);
        startRef.current = Date.now() - progress * durationMs; // keep elapsed frozen
        return;
      }
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      if (p >= 1) {
        goNext();
        return; // next effect will restart
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused, loading, items.length]);

  const goNext = () => {
    const next = current + 1;
    if (next < items.length) {
      setCurrent(next);
      scrollRef.current?.scrollTo({ x: next * width, y: 0, animated: true });
    } else {
      debouncedRouter.back();
    }
  };

  const goPrev = () => {
    const prev = current - 1;
    if (prev >= 0) {
      setCurrent(prev);
      scrollRef.current?.scrollTo({ x: prev * width, y: 0, animated: true });
    } else {
      debouncedRouter.back();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.closeBtn}>
          <X size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={{ color: '#FFFFFF' }}>No items in this highlight</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Highlight'}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Progress bars */}
      <View style={styles.progressRow}>
        {items.map((_, idx) => (
          <View key={idx} style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              idx < current && { width: '100%' },
              idx === current && { width: `${Math.max(0, Math.min(100, progress * 100))}%` },
            ]} />
          </View>
        ))}
      </View>

      {/* Stories pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(idx);
        }}
      >
        {items.map((it) => (
          <View key={it.id} style={{ width, height: height - 120, alignItems: 'center', justifyContent: 'center' }}>
            <StoryMedia postId={it.post_id} slideIndex={it.slide_index} fallbackThumb={it.thumb} />
            {it.caption ? (
              <View style={styles.captionBox}>
                <Text style={styles.captionText} numberOfLines={2}>{it.caption}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* Tap zones */}
      <View style={styles.tapZones} pointerEvents="box-none">
        <TouchableOpacity style={styles.leftZone} activeOpacity={0.6} onPress={goPrev} onPressIn={() => setPaused(true)} onPressOut={() => setPaused(false)} />
        <TouchableOpacity style={styles.rightZone} activeOpacity={0.6} onPress={goNext} onPressIn={() => setPaused(true)} onPressOut={() => setPaused(false)} />
      </View>
    </View>
  );
}

function StoryMedia({ postId, slideIndex, fallbackThumb }: { postId: string | null; slideIndex?: number | null; fallbackThumb?: string | null }) {
  const [uri, setUri] = useState<string | null>(fallbackThumb ?? null);
  useEffect(() => {
    (async () => {
      if (!postId) return;
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('id,image_url,image_urls')
          .eq('id', postId)
          .single();
        if (post) {
          let u = post.image_url as string | null;
          if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
            if (typeof slideIndex === 'number' && slideIndex >= 0 && slideIndex < post.image_urls.length) {
              u = post.image_urls[slideIndex] as string;
            } else {
              u = post.image_urls[0] as string;
            }
          }
          setUri(u || null);
        }
      } catch {}
    })();
  }, [postId, slideIndex]);
  return uri ? (
    <Image source={{ uri }} style={{ width, height: width }} resizeMode="cover" />
  ) : (
    <View style={{ width, height: width, backgroundColor: '#0B0F1A' }} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  headerTitle: { flex: 1, marginHorizontal: 12, color: '#FFFFFF', fontSize: 16 },
  progressRow: { position: 'absolute', top: 100, left: 12, right: 12, height: 3, flexDirection: 'row', gap: 6, zIndex: 9 },
  progressTrack: { flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 999, overflow: 'hidden' },
  progressFill: { width: '0%', height: '100%', backgroundColor: '#FFFFFF' },
  tapZones: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  leftZone: { flex: 1 },
  rightZone: { flex: 1 },
  closeBtn: { position: 'absolute', top: 50, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  captionBox: { position: 'absolute', bottom: 40, left: 16, right: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  captionText: { color: '#FFFFFF', fontSize: 14 },
});
