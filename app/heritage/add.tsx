import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function AddHistoryItem() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const pickImage = async () => {
    try {
      if (!user?.id) return Alert.alert('Sign in required', 'You must be signed in to upload');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
        return;
      }
      const res: any = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.9, allowsMultipleSelection: true, selectionLimit: 20 });
      if (res.canceled || !res.assets?.length) return;

      const files = res.assets.map((asset: any, idx: number) => ({
        uri: asset.uri,
        name: asset.fileName || `history_${user.id}_${Date.now()}_${idx}.jpg`,
        mimeType: (asset.type && String(asset.type).startsWith('image')) ? 'image/jpeg' : (asset.mimeType || 'application/octet-stream'),
      }));
      await uploadFiles(files);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      if (!user?.id) return Alert.alert('Sign in required', 'You must be signed in to upload');
      const res: any = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
      // Support both single and multiple shapes
      const assets: any[] = Array.isArray(res.assets)
        ? res.assets
        : (res.type === 'success' ? [res] : []);
      if (!assets.length) return;

      const files = assets.map((a: any, idx: number) => ({
        uri: a.uri,
        name: a.name || `doc_${Date.now()}_${idx}`,
        mimeType: a.mimeType || guessMimeTypeFromName(a.name || ''),
      }));
      await uploadFiles(files);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const guessMimeTypeFromName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (!ext) return 'application/octet-stream';
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    if (['pdf'].includes(ext)) return 'application/pdf';
    if (['doc','docx'].includes(ext)) return 'application/msword';
    if (['ppt','pptx'].includes(ext)) return 'application/vnd.ms-powerpoint';
    if (['txt'].includes(ext)) return 'text/plain';
    return 'application/octet-stream';
  };

  const uploadFiles = async (files: { uri: string; name: string; mimeType: string }[]) => {
    try {
      setUploading(true);
      setProgress({ done: 0, total: files.length });
      if (!user?.id) throw new Error('Not signed in');

      // Create a parent history item first
      const { data: parent, error: parentErr } = await supabase
        .from('history_items')
        .insert({
          user_id: user.id,
          title: title || null,
          description: description || null,
          is_public: isPublic,
        })
        .select('id')
        .single();
      if (parentErr) throw parentErr;
      const itemId = parent.id as string;

      const childRows: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const res = await fetch(f.uri);
        const blob = await res.blob();
        const path = `history/${user?.id}_${Date.now()}_${i}_${sanitizeName(f.name)}`;
        const { error: upErr } = await supabase.storage.from('media').upload(path, blob, { contentType: f.mimeType, upsert: false });
        if (upErr) throw upErr;
        childRows.push({
          item_id: itemId,
          file_path: path,
          file_name: f.name,
          mime_type: f.mimeType,
        });
        setProgress({ done: i + 1, total: files.length });
      }
      if (childRows.length) {
        const { error: dbErr } = await supabase.from('history_item_files').insert(childRows);
        if (dbErr) throw dbErr;
      }
      Alert.alert('Success', `${childRows.length} file${childRows.length > 1 ? 's' : ''} uploaded`);
      router.back();
    } catch (e) {
      console.error('Upload failed', e);
      Alert.alert('Error', 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '_');

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add History Item</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 16 }}>
          <Text>Please sign in to upload history items.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add History Item</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.body}>
        <TextInput placeholder="Title (optional)" value={title} onChangeText={setTitle} style={styles.input} />
        <TextInput placeholder="Description (optional)" value={description} onChangeText={setDescription} style={[styles.input, { height: 100 }]} multiline />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
          <Text style={{ color: '#374151' }}>Make public</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={pickImage} disabled={uploading}>
          <Text style={styles.primaryText}>{uploading ? (progress ? `Uploading ${progress.done}/${progress.total}…` : 'Uploading…') : 'Pick Images'}</Text>
        </TouchableOpacity>
        <View style={{ height: 12 }} />
        <TouchableOpacity style={styles.secondaryBtn} onPress={pickDocument} disabled={uploading}>
          <Text style={styles.secondaryText}>{uploading ? (progress ? `Uploading ${progress.done}/${progress.total}…` : 'Uploading…') : 'Pick Documents'}</Text>
        </TouchableOpacity>

        {uploading && (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  headerTitle: { fontSize: 16, color: '#111827', fontFamily: 'Inter-SemiBold' },
  body: { flex: 1, padding: 16 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#111827', fontFamily: 'Inter-SemiBold' },
});
