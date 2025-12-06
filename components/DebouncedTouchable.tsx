import React, { useRef } from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface DebouncedTouchableProps extends TouchableOpacityProps {
  debounceMs?: number;
}

/**
 * DebouncedTouchable - TouchableOpacity that prevents rapid successive taps
 * 
 * Prevents double-taps from triggering actions multiple times.
 * Perfect for navigation buttons, submit buttons, etc.
 * 
 * Usage:
 * Replace <TouchableOpacity> with <DebouncedTouchable>
 * Optionally set debounceMs prop (default: 500ms)
 */
export const DebouncedTouchable: React.FC<DebouncedTouchableProps> = ({
  onPress,
  debounceMs = 500,
  disabled,
  ...rest
}) => {
  const isDisabledRef = useRef(false);

  const handlePress = (event: any) => {
    if (isDisabledRef.current || disabled) {
      return;
    }

    isDisabledRef.current = true;
    onPress?.(event);

    setTimeout(() => {
      isDisabledRef.current = false;
    }, debounceMs);
  };

  return (
    <TouchableOpacity
      {...rest}
      onPress={handlePress}
      disabled={disabled}
    />
  );
};
