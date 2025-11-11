import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { NewsOutlet } from '@/lib/types/outlets';

type Props = {
  outlet: NewsOutlet;
};

export default function OutletCard({ outlet }: Props) {
  const open = async () => {
    const url = outlet.url.startsWith('http') ? outlet.url : `https://${outlet.url}`;
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={open}>
      <View style={styles.row}>
        {outlet.logo ? (
          <Image source={{ uri: outlet.logo }} style={styles.logo} />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoInitial}>{outlet.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>{outlet.name}</Text>
          {outlet.description ? (
            <Text style={styles.desc} numberOfLines={2}>{outlet.description}</Text>
          ) : null}
          <Text style={styles.url} numberOfLines={1}>{outlet.url.replace(/^https?:\/\//, '')}</Text>
        </View>
        <ExternalLink size={18} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A3A3C',
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  desc: {
    fontSize: 12,
    color: '#636366',
    marginTop: 2,
  },
  url: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
});
