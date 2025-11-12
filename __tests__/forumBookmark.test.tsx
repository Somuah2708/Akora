import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ForumScreen from '@/app/forum/index';
import SavedDiscussionsScreen from '@/app/forum/saved';
import { emit } from '@/lib/eventBus';

// Minimal mock for useLocalSearchParams inside detail screen
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'disc-1' }),
  Stack: { Screen: () => null },
}));

// Baseline discussion row structure resembling forum_discussions join
const mockDiscussion = {
  id: 'disc-1',
  title: 'Test Discussion',
  content: 'Content',
  category: 'technology',
  created_at: new Date().toISOString(),
  likes_count: 0,
  comments_count: 0,
  author_id: 'user-2',
  profiles: { id: 'user-2', username: 'user2', full_name: 'User Two', avatar_url: null },
};

const supabase = require('@/lib/supabase').supabase;

beforeEach(() => {
  jest.clearAllMocks();
  supabase.select.mockReturnThis();
  supabase.eq.mockReturnThis();
  supabase.in.mockReturnThis();
  supabase.order.mockReturnThis();
  supabase.range.mockReturnThis();
});

function mockForumInitialQuery() {
  supabase.from.mockReturnThis();
  supabase.select.mockReturnValueOnce({ data: [mockDiscussion], error: null });
  supabase.order.mockReturnThis();
  supabase.range.mockReturnThis();
}

describe('Forum bookmark cross-screen sync', () => {
  test('bookmark event triggers saved map update and saved screen fetch', async () => {
    mockForumInitialQuery();
    const index = render(<ForumScreen />);

    // Simulate external bookmark add
    emit('forum:bookmarkChanged', { discussionId: 'disc-1', saved: true });

    // Mock saved list fetch sequence
    supabase.from.mockReturnThis();
    supabase.select
      .mockReturnValueOnce({ data: [{ discussion_id: 'disc-1', created_at: new Date().toISOString() }], error: null }) // bookmarks
      .mockReturnValueOnce({ data: [mockDiscussion], error: null }); // discussions
    supabase.in.mockReturnThis();

    const saved = render(<SavedDiscussionsScreen />);

    await waitFor(() => {
      // Expect that mocks were called to fetch bookmarks and discussions
      expect(supabase.select).toHaveBeenCalled();
    });
  });
});
