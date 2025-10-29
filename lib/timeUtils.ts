import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

/**
 * Format message timestamp for chat bubbles
 * Returns: "10:45 PM" for today, "Yesterday" or "Oct 25" for older
 */
export function formatMessageTime(timestamp: string): string {
  const date = dayjs(timestamp);
  
  if (date.isToday()) {
    return date.format('h:mm A');
  }
  
  if (date.isYesterday()) {
    return 'Yesterday';
  }
  
  if (date.isAfter(dayjs().subtract(7, 'day'))) {
    return date.format('ddd'); // Mon, Tue, etc.
  }
  
  return date.format('MMM D');
}

/**
 * Format timestamp for chat list preview
 * Returns: "10:45 PM" for today, "Yesterday", or "Oct 25"
 */
export function formatChatListTime(timestamp: string): string {
  const date = dayjs(timestamp);
  
  if (date.isToday()) {
    return date.format('h:mm A');
  }
  
  if (date.isYesterday()) {
    return 'Yesterday';
  }
  
  if (date.year() === dayjs().year()) {
    return date.format('MMM D'); // Oct 25
  }
  
  return date.format('MMM D, YYYY'); // Oct 25, 2024
}

/**
 * Format date divider for message grouping
 * Returns: "Today", "Yesterday", or "Monday, October 25"
 */
export function formatDateDivider(timestamp: string): string {
  const date = dayjs(timestamp);
  
  if (date.isToday()) {
    return 'Today';
  }
  
  if (date.isYesterday()) {
    return 'Yesterday';
  }
  
  if (date.isAfter(dayjs().subtract(7, 'day'))) {
    return date.format('dddd'); // Monday, Tuesday, etc.
  }
  
  return date.format('dddd, MMMM D'); // Monday, October 25
}

/**
 * Format last seen timestamp
 * Returns: "online", "last seen 2m ago", "last seen yesterday at 10:45 PM"
 */
export function formatLastSeen(timestamp: string | null, isOnline: boolean): string {
  if (isOnline) {
    return 'online';
  }
  
  if (!timestamp) {
    return 'offline';
  }
  
  const date = dayjs(timestamp);
  const now = dayjs();
  const diffMinutes = now.diff(date, 'minute');
  
  // Less than 1 hour ago
  if (diffMinutes < 60) {
    if (diffMinutes < 1) {
      return 'last seen just now';
    }
    return `last seen ${diffMinutes}m ago`;
  }
  
  // Less than 24 hours ago
  if (diffMinutes < 60 * 24) {
    const hours = Math.floor(diffMinutes / 60);
    return `last seen ${hours}h ago`;
  }
  
  // Yesterday
  if (date.isYesterday()) {
    return `last seen yesterday at ${date.format('h:mm A')}`;
  }
  
  // More than 1 day ago
  return `last seen ${date.format('MMM D')} at ${date.format('h:mm A')}`;
}

/**
 * Group messages by day
 * Returns an array of { date: string, messages: Message[] }
 */
export function groupMessagesByDay<T extends { created_at: string }>(
  messages: T[]
): Array<{ date: string; dateLabel: string; messages: T[] }> {
  const groups = new Map<string, T[]>();
  
  messages.forEach((message) => {
    const date = dayjs(message.created_at).format('YYYY-MM-DD');
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(message);
  });
  
  return Array.from(groups.entries()).map(([date, msgs]) => ({
    date,
    dateLabel: formatDateDivider(msgs[0].created_at),
    messages: msgs,
  }));
}

/**
 * Check if two timestamps are on the same day
 */
export function isSameDay(timestamp1: string, timestamp2: string): boolean {
  return dayjs(timestamp1).isSame(dayjs(timestamp2), 'day');
}

/**
 * Get relative time (e.g., "2 hours ago", "in 5 minutes")
 */
export function getRelativeTime(timestamp: string): string {
  return dayjs(timestamp).fromNow();
}
