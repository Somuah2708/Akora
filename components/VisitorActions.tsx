import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MessageCircle, UserPlus } from 'lucide-react-native';

type Props = {
  onMessage?: () => void;
  onFollow?: () => void;
  following?: boolean;
  loading?: boolean;
};

export default function VisitorActions({ onMessage, onFollow, following, loading }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.btn, styles.primary]} onPress={onMessage} disabled={loading}>
        <MessageCircle size={18} color="#FFFFFF" />
        <Text style={styles.primaryText}>Message</Text>
      </TouchableOpacity>
      {/* Optional follow button for later */}
      <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={onFollow} disabled={loading}>
        <UserPlus size={18} color="#111827" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  primary: {
    backgroundColor: '#0A84FF',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  secondary: {
    flex: 0,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
  },
});
