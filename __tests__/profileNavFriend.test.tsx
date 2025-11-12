import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import UserProfileScreen from '@/app/user-profile/[id]';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'user-2' }),
  Stack: { Screen: () => null },
}));

const sendFriendRequest = jest.fn(async () => ({}));
const acceptFriendRequest = jest.fn(async () => ({}));
const checkFriendshipStatus = jest.fn(async () => 'none');

jest.mock('@/lib/friends', () => ({
  checkFriendshipStatus: (...args: any[]) => checkFriendshipStatus(...args),
  sendFriendRequest: (...args: any[]) => sendFriendRequest(...args),
  acceptFriendRequest: (...args: any[]) => acceptFriendRequest(...args),
}));

// mock supabase basic calls used within profile for data fetch
const supabase = require('@/lib/supabase').supabase;

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockReturnThis();
  supabase.select.mockReturnThis();
  supabase.eq.mockReturnThis();
  supabase.order.mockReturnThis();
  supabase.in.mockReturnThis();
  supabase.single.mockResolvedValue({ data: { id: 'user-2', full_name: 'User Two' } });
});

describe('Profile navigation + friend action', () => {
  test('renders Add Friend and invokes sendFriendRequest on press', async () => {
    const screen = render(<UserProfileScreen />);

    const addFriendButton = await screen.findByText(/Add Friend/i);
    expect(addFriendButton).toBeTruthy();

    fireEvent.press(addFriendButton);

    await waitFor(() => {
      expect(sendFriendRequest).toHaveBeenCalledTimes(1);
    });
  });
});
