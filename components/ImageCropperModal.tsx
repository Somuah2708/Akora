import React, { useState } from 'react';
import { View, Text, Modal, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

type Props = {
  visible: boolean;
  uri: string;
  onClose: () => void;
  onDone: (croppedUri: string) => void;
};

type Aspect = 'original' | '1:1' | '4:5' | '16:9';

export default function ImageCropperModal({ visible, uri, onClose, onDone }: Props) {
  const [aspect, setAspect] = useState<Aspect>('1:1');
  const [working, setWorking] = useState(false);

  const handleApply = async () => {
    try {
      setWorking(true);
      // We don't know original dimensions without fetching metadata; expo-image-manipulator can do centered crop by specifying crop rect.
      // Strategy: first get image dimensions using Image.getSize.
      const getSize = () => new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(
          uri,
          (w, h) => resolve({ width: w, height: h }),
          (e) => reject(e)
        );
      });
      const { width, height } = await getSize();

      let targetW = width;
      let targetH = height;
      if (aspect === '1:1') {
        const side = Math.min(width, height);
        targetW = side; targetH = side;
      } else if (aspect === '4:5') {
        // portrait crop: width:height = 4:5; maximize area within original
        const ratio = 4 / 5;
        if (width / height > ratio) {
          // too wide; limit by height
          targetH = height;
          targetW = Math.floor(height * ratio);
        } else {
          // too tall; limit by width
          targetW = width;
          targetH = Math.floor(width / ratio);
        }
      } else if (aspect === '16:9') {
        const ratio = 16 / 9;
        if (width / height > ratio) {
          targetH = height;
          targetW = Math.floor(height * ratio);
        } else {
          targetW = width;
          targetH = Math.floor(width / ratio);
        }
      } else {
        // original
        targetW = width; targetH = height;
      }

      const originX = Math.floor((width - targetW) / 2);
      const originY = Math.floor((height - targetH) / 2);

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: targetW, height: targetH } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      onDone(result.uri);
    } catch (e: any) {
      console.error('Image crop error', e);
      Alert.alert('Crop failed', e?.message || 'Could not crop image');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Crop Image</Text>
          <Image source={{ uri }} style={styles.preview} resizeMode="contain" />
          <View style={styles.aspectRow}>
            {(['1:1', '4:5', '16:9', 'original'] as Aspect[]).map((opt) => (
              <TouchableOpacity key={opt} style={[styles.aspectBtn, aspect === opt && styles.aspectBtnActive]} onPress={() => setAspect(opt)}>
                <Text style={[styles.aspectText, aspect === opt && styles.aspectTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={styles.applyBtn} disabled={working}>
              {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>Apply</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '85%' },
  title: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  preview: { width: '100%', height: 240, backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 12 },
  aspectRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  aspectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999 },
  aspectBtnActive: { backgroundColor: '#0A84FF', borderColor: '#0A84FF' },
  aspectText: { color: '#475569', fontWeight: '600' },
  aspectTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  applyBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#0A84FF', alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '700' },
});
