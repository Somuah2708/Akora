/**
 * CSV Export Utility
 * Converts data to CSV format and triggers download
 */

interface CSVColumn {
  key: string;
  label: string;
  transform?: (value: any) => string;
}

export class CSVExporter {
  /**
   * Convert array of objects to CSV string
   */
  static toCSV(data: any[], columns: CSVColumn[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Create header row
    const headers = columns.map(col => this.escapeCSVValue(col.label)).join(',');

    // Create data rows
    const rows = data.map(item => {
      return columns
        .map(col => {
          let value = item[col.key];
          
          // Apply transform if provided
          if (col.transform && value !== null && value !== undefined) {
            value = col.transform(value);
          }
          
          // Handle arrays
          if (Array.isArray(value)) {
            value = value.join('; ');
          }
          
          // Handle null/undefined
          if (value === null || value === undefined) {
            value = '';
          }
          
          return this.escapeCSVValue(String(value));
        })
        .join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Escape CSV value (handle quotes, commas, newlines)
   */
  private static escapeCSVValue(value: string): string {
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format date for CSV
   */
  static formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format datetime for CSV
   */
  static formatDateTime(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Download CSV file (for web)
   */
  static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Share CSV file (for React Native)
   */
  static async shareCSV(csvContent: string, filename: string): Promise<void> {
    try {
      const { default: * as FileSystem } = await import('expo-file-system');
      const { default: * as Sharing } = await import('expo-sharing');

      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing CSV:', error);
      throw error;
    }
  }
}

// Predefined column configurations
export const MentorCSVColumns: CSVColumn[] = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'current_title', label: 'Current Title' },
  { key: 'company', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'expertise_areas', label: 'Expertise Areas' },
  { key: 'years_of_experience', label: 'Years of Experience' },
  { key: 'available_hours', label: 'Available Hours' },
  { key: 'meeting_formats', label: 'Meeting Formats' },
  { 
    key: 'average_rating', 
    label: 'Average Rating',
    transform: (val) => val ? val.toFixed(2) : 'N/A'
  },
  { key: 'total_ratings', label: 'Total Ratings' },
  { key: 'status', label: 'Status' },
  { 
    key: 'created_at', 
    label: 'Created Date',
    transform: CSVExporter.formatDate
  },
];

export const MentorRequestCSVColumns: CSVColumn[] = [
  { key: 'id', label: 'Request ID' },
  { key: 'mentee_name', label: 'Mentee Name' },
  { key: 'mentee_email', label: 'Mentee Email' },
  { key: 'mentee_phone', label: 'Mentee Phone' },
  { key: 'mentor_name', label: 'Mentor Name' },
  { key: 'current_status', label: 'Current Status' },
  { key: 'areas_of_interest', label: 'Areas of Interest' },
  { key: 'message', label: 'Message' },
  { key: 'status', label: 'Status' },
  { key: 'mentor_response', label: 'Mentor Response' },
  { 
    key: 'created_at', 
    label: 'Created Date',
    transform: CSVExporter.formatDateTime
  },
  { 
    key: 'updated_at', 
    label: 'Last Updated',
    transform: CSVExporter.formatDateTime
  },
];

export const MentorApplicationCSVColumns: CSVColumn[] = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'current_title', label: 'Current Title' },
  { key: 'company', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'linkedin_profile', label: 'LinkedIn Profile' },
  { key: 'years_of_experience', label: 'Years of Experience' },
  { key: 'expertise_areas', label: 'Expertise Areas' },
  { key: 'why_mentor', label: 'Why Mentor' },
  { key: 'mentoring_approach', label: 'Mentoring Approach' },
  { key: 'status', label: 'Status' },
  { 
    key: 'submitted_at', 
    label: 'Submitted Date',
    transform: CSVExporter.formatDateTime
  },
  { 
    key: 'reviewed_at', 
    label: 'Reviewed Date',
    transform: CSVExporter.formatDateTime
  },
];
