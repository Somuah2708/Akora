import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Upload, File, X, Paperclip } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES = [
  'Forms',
  'Reports',
  'Policies',
  'Minutes',
  'Financial',
  'Academic',
  'Legal',
  'Newsletters',
  'Guidelines',
  'Templates',
  'Other',
];

export default function UploadDocumentScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Forms',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    uploaderName: '',
    uploaderTitle: '',
    uploaderEmail: '',
    tags: '',
    version: '1.0',
  });

  // Handle document picking from computer
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 
               'application/msword', 
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-powerpoint',
               'application/vnd.openxmlformats-officedocument.presentationml.presentation',
               'text/plain',
               'application/zip',
               'application/x-rar-compressed'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const pickedFile = result.assets[0];
      console.log('[Document Picker] File selected:', pickedFile);

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (pickedFile.size && pickedFile.size > maxSize) {
        if (Platform.OS === 'web') {
          window.alert('File is too large. Maximum size is 10MB.');
        } else {
          Alert.alert('File Too Large', 'Maximum file size is 10MB. Please choose a smaller file.');
        }
        return;
      }

      // Upload to Supabase Storage
      setUploading(true);
      const uploadedUrl = await uploadDocumentToStorage(pickedFile);
      
      if (uploadedUrl) {
        // Update form with file details
        setFormData({
          ...formData,
          fileUrl: uploadedUrl,
          fileName: pickedFile.name,
          fileSize: pickedFile.size || 0,
        });

        if (Platform.OS === 'web') {
          window.alert('✓ Document uploaded successfully!');
        } else {
          Alert.alert('Success', '✓ Document uploaded successfully!');
        }
      }
    } catch (error) {
      console.error('[Document Picker] Error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to pick document. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to pick document. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // Upload document to Supabase Storage
  const uploadDocumentToStorage = async (file: any): Promise<string | null> => {
    try {
      console.log('[Upload] Starting upload to Supabase Storage...');
      
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `secretariat/documents/${user?.id}/${timestamp}_${sanitizedFileName}`;

      // Fetch the file blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      console.log('[Upload] File blob created, size:', blob.size);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(filePath, blob, {
          contentType: file.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (error) {
        console.error('[Upload] Supabase error:', error);
        throw error;
      }

      console.log('[Upload] Upload successful, getting public URL...');

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      console.log('[Upload] Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[Upload] Error uploading document:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to upload document to storage. Please try again.');
      } else {
        Alert.alert('Upload Error', 'Failed to upload document to storage. Please try again.');
      }
      return null;
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!formData.fileUrl.trim()) {
      Alert.alert('Error', 'Please enter a file URL');
      return;
    }

    if (!formData.fileName.trim()) {
      Alert.alert('Error', 'Please enter a file name');
      return;
    }

    if (!formData.uploaderName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setLoading(true);

      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Determine file type from file name
      const fileExtension = formData.fileName.split('.').pop()?.toLowerCase() || '';

      // Create document
      const { data, error } = await supabase
        .from('secretariat_documents')
        .insert([
          {
            user_id: user?.id,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
            document_type: fileExtension,
            file_url: formData.fileUrl.trim(),
            file_name: formData.fileName.trim(),
            file_size: formData.fileSize || 0,
            uploader_name: formData.uploaderName.trim(),
            uploader_title: formData.uploaderTitle.trim() || null,
            uploader_email: formData.uploaderEmail.trim() || user?.email,
            tags: tagsArray.length > 0 ? tagsArray : null,
            version: formData.version.trim(),
            is_public: true,
            is_approved: true, // Auto-approve for now
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      if (Platform.OS === 'web') {
        window.alert('✓ Document uploaded successfully!');
        router.push('/secretariat/documents/my-documents');
      } else {
        Alert.alert(
          'Success',
          '✓ Document uploaded successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.push('/secretariat/documents/my-documents'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Discard changes?\n\nAre you sure you want to discard this document?');
      if (confirmed) {
        router.push('/secretariat/documents');
      }
    } else {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to discard this document?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.push('/secretariat/documents'),
          },
        ]
      );
    }
  };

  const estimateFileSize = (url: string) => {
    // This is a placeholder - in a real app, you'd fetch the file size
    // For now, we'll just estimate based on URL or leave it to user input
    setFormData({ ...formData, fileSize: 0 });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Upload Document</Text>
            <Text style={styles.subtitle}>Document Center</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Form */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Document Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Alumni Registration Form 2025"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            maxLength={200}
            placeholderTextColor="#999"
          />
          <Text style={styles.charCount}>{formData.title.length}/200</Text>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description of the document"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={3}
            maxLength={500}
            placeholderTextColor="#999"
          />
          <Text style={styles.charCount}>{formData.description.length}/500</Text>
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.optionsContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.optionChip,
                  formData.category === category && styles.optionChipActive,
                ]}
                onPress={() => setFormData({ ...formData, category })}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    formData.category === category && styles.optionChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* File Information */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>File Information</Text>
        </View>

        {/* Document Picker Button */}
        <TouchableOpacity
          style={styles.documentPickerButton}
          onPress={handlePickDocument}
          disabled={uploading}
        >
          <View style={styles.documentPickerContent}>
            <View style={styles.documentPickerIcon}>
              <Paperclip size={24} color="#4169E1" />
            </View>
            <View style={styles.documentPickerText}>
              <Text style={styles.documentPickerTitle}>
                {uploading ? 'Uploading...' : 'Upload Document from Computer'}
              </Text>
              <Text style={styles.documentPickerSubtitle}>
                {formData.fileName || 'PDF, DOC, XLS, PPT (Max 10MB)'}
              </Text>
            </View>
            {uploading && <ActivityIndicator size="small" color="#4169E1" />}
            {!uploading && formData.fileName && (
              <View style={styles.documentPickerCheckmark}>
                <Text style={styles.documentPickerCheckmarkText}>✓</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {formData.fileName && (
          <View style={styles.fileInfo}>
            <File size={16} color="#4169E1" />
            <Text style={styles.fileInfoText}>
              {formData.fileName} ({(formData.fileSize / 1024).toFixed(2)} KB)
            </Text>
            <TouchableOpacity
              onPress={() => setFormData({ ...formData, fileUrl: '', fileName: '', fileSize: 0 })}
            >
              <X size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            File URL <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/document.pdf"
            value={formData.fileUrl}
            onChangeText={(text) => {
              setFormData({ ...formData, fileUrl: text });
              estimateFileSize(text);
            }}
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>
            Direct link to the document (PDF, DOC, XLS, etc.)
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            File Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., registration_form.pdf"
            value={formData.fileName}
            onChangeText={(text) => setFormData({ ...formData, fileName: text })}
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>Include file extension (.pdf, .docx, etc.)</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>File Size (bytes, optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1048576 (1 MB)"
            value={formData.fileSize > 0 ? formData.fileSize.toString() : ''}
            onChangeText={(text) =>
              setFormData({ ...formData, fileSize: parseInt(text) || 0 })
            }
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>Leave empty if unknown</Text>
        </View>

        {/* Uploader Information */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Uploader Information</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Your Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Dr. Kwame Mensah"
            value={formData.uploaderName}
            onChangeText={(text) => setFormData({ ...formData, uploaderName: text })}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Title/Position (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Secretary General, OAA"
            value={formData.uploaderTitle}
            onChangeText={(text) => setFormData({ ...formData, uploaderTitle: text })}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email address"
            value={formData.uploaderEmail}
            onChangeText={(text) => setFormData({ ...formData, uploaderEmail: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
        </View>

        {/* Additional Information */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tags (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., form, 2025, registration"
            value={formData.tags}
            onChangeText={(text) => setFormData({ ...formData, tags: text })}
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>Separate tags with commas</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Version</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1.0, 2.1"
            value={formData.version}
            onChangeText={(text) => setFormData({ ...formData, version: text })}
            placeholderTextColor="#999"
          />
        </View>

        {/* Submit Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Upload size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
  },
  optionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionChipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4169E1',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  documentPickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 16,
  },
  documentPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E4EAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentPickerText: {
    flex: 1,
  },
  documentPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  documentPickerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  documentPickerCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentPickerCheckmarkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E4EAFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
});
