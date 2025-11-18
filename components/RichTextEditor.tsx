import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
} from 'lucide-react-native';

interface RichTextEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChangeText,
  placeholder = 'Enter text...',
  maxLength = 2000,
  minHeight = 150,
}: RichTextEditorProps) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const wrapText = (prefix: string, suffix: string = prefix) => {
    const { start, end } = selection;
    const selectedText = value.substring(start, end);
    
    // Check if already wrapped
    const beforeStart = value.substring(Math.max(0, start - prefix.length), start);
    const afterEnd = value.substring(end, end + suffix.length);
    
    if (beforeStart === prefix && afterEnd === suffix) {
      // Remove formatting
      const newText = 
        value.substring(0, start - prefix.length) +
        selectedText +
        value.substring(end + suffix.length);
      onChangeText(newText);
    } else {
      // Add formatting
      const newText = 
        value.substring(0, start) +
        prefix + selectedText + suffix +
        value.substring(end);
      onChangeText(newText);
    }
  };

  const insertText = (text: string) => {
    const { start } = selection;
    const newText = 
      value.substring(0, start) +
      text +
      value.substring(start);
    onChangeText(newText);
  };

  const makeBold = () => wrapText('**');
  const makeItalic = () => wrapText('_');
  const makeLink = () => wrapText('[', '](url)');
  
  const makeBulletList = () => {
    const { start } = selection;
    insertText('\n• ');
  };

  const convertToHtml = (markdown: string): string => {
    let html = markdown;
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    
    // Bullet points
    html = html.replace(/^• (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolButton} onPress={makeBold}>
          <Bold size={18} color="#374151" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolButton} onPress={makeItalic}>
          <Italic size={18} color="#374151" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolButton} onPress={makeBulletList}>
          <List size={18} color="#374151" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolButton} onPress={makeLink}>
          <LinkIcon size={18} color="#374151" />
        </TouchableOpacity>

        <View style={styles.toolDivider} />

        <Text style={styles.charCount}>
          {value.length}/{maxLength}
        </Text>
      </View>

      {/* Editor */}
      <TextInput
        style={[styles.input, { minHeight }]}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline
        textAlignVertical="top"
        maxLength={maxLength}
      />

      {/* Quick Help */}
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Formatting Help:</Text>
        <Text style={styles.helpText}>**Bold** • _Italic_ • [Link](url) • • Bullet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 4,
  },
  toolButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toolDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 'auto',
  },
  input: {
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    lineHeight: 22,
  },
  helpCard: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  helpTitle: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
    marginBottom: 2,
  },
  helpText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#3B82F6',
  },
});

function convertToHtml(markdown: string): string {
  let html = markdown;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^• (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

// Export utility function
export { convertToHtml };
