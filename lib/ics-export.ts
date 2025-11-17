/**
 * ICS Calendar Export Utility
 * Generates .ics files for events compatible with Apple Calendar, Google Calendar, Outlook
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface EventData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_date: string; // ISO string
  end_date?: string; // ISO string
  organizer_name?: string;
  organizer_email?: string;
}

/**
 * Format date to ICS format: YYYYMMDDTHHMMSSZ
 */
const formatICSDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * Escape special characters for ICS format
 */
const escapeICSText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Generate ICS file content
 */
export const generateICSContent = (event: EventData): string => {
  const now = formatICSDate(new Date().toISOString());
  const start = formatICSDate(event.start_date);
  const end = event.end_date 
    ? formatICSDate(event.end_date)
    : formatICSDate(new Date(new Date(event.start_date).getTime() + 3600000).toISOString()); // +1 hour default

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Akora Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@akora.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  if (event.organizer_email) {
    const organizerName = event.organizer_name || 'Event Organizer';
    lines.push(`ORGANIZER;CN=${escapeICSText(organizerName)}:MAILTO:${event.organizer_email}`);
  }

  lines.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
};

/**
 * Export event to calendar (download ICS file)
 */
export const exportEventToCalendar = async (event: EventData): Promise<void> => {
  try {
    console.log('Starting calendar export for event:', event.id);
    
    // Generate ICS content
    const icsContent = generateICSContent(event);
    console.log('Generated ICS content, length:', icsContent.length);
    
    // Create safe filename
    const safeTitle = event.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const fileName = `${safeTitle}_${event.id.substring(0, 8)}.ics`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    console.log('File URI:', fileUri);

    // Write ICS file - use simple string writing
    try {
      await FileSystem.writeAsStringAsync(fileUri, icsContent);
      console.log('File written successfully');
    } catch (writeError) {
      console.error('File write error:', writeError);
      throw new Error('Failed to create calendar file');
    }

    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    console.log('Sharing available:', isSharingAvailable);
    
    if (!isSharingAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    // Share the file (user can choose Calendar app)
    try {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/calendar',
        dialogTitle: 'Add to Calendar',
        UTI: 'public.calendar-event',
      });
      console.log('File shared successfully');
    } catch (shareError) {
      console.error('Share error:', shareError);
      throw new Error('Failed to share calendar file');
    }

    // Clean up file after sharing
    // Note: File cleanup happens automatically on iOS after sharing
    // Keep file for Android to ensure calendar apps can access it
  } catch (error) {
    console.error('Error exporting event to calendar:', error);
    throw error;
  }
};

/**
 * Generate calendar URL for web-based calendars
 */
export const generateCalendarUrls = (event: EventData) => {
  const start = new Date(event.start_date);
  const end = event.end_date 
    ? new Date(event.end_date)
    : new Date(start.getTime() + 3600000);

  // Format for Google Calendar (YYYYMMDDTHHMMSSZ)
  const googleStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const googleEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.title
  )}&dates=${googleStart}/${googleEnd}&details=${encodeURIComponent(
    event.description || ''
  )}&location=${encodeURIComponent(event.location || '')}`;

  // Outlook.com URL
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
    event.title
  )}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent(
    event.description || ''
  )}&location=${encodeURIComponent(event.location || '')}`;

  // Office 365 URL
  const office365Url = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
    event.title
  )}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent(
    event.description || ''
  )}&location=${encodeURIComponent(event.location || '')}`;

  return {
    google: googleUrl,
    outlook: outlookUrl,
    office365: office365Url,
  };
};

/**
 * Export multiple events to a single ICS file
 */
export const exportMultipleEventsToCalendar = async (events: EventData[]): Promise<void> => {
  try {
    const now = formatICSDate(new Date().toISOString());
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Akora Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ].join('\r\n');

    // Add each event
    events.forEach((event) => {
      const start = formatICSDate(event.start_date);
      const end = event.end_date 
        ? formatICSDate(event.end_date)
        : formatICSDate(new Date(new Date(event.start_date).getTime() + 3600000).toISOString());

      icsContent += '\r\n';
      icsContent += [
        'BEGIN:VEVENT',
        `UID:${event.id}@akora.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeICSText(event.title)}`,
        event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : '',
        event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
        event.organizer_email ? `ORGANIZER;CN=${escapeICSText(event.organizer_name || 'Event Organizer')}:MAILTO:${event.organizer_email}` : '',
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
      ].filter(line => line).join('\r\n');
    });

    icsContent += '\r\nEND:VCALENDAR';

    const fileName = `akora_events_${Date.now()}.ics`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, icsContent);

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/calendar',
      dialogTitle: 'Add Events to Calendar',
      UTI: 'public.calendar-event',
    });
  } catch (error) {
    console.error('Error exporting multiple events:', error);
    throw error;
  }
};
