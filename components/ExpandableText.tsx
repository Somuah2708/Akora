// components/ExpandableText.tsx
// Robust two-phase expandable caption with accurate line measurement.
// Phase 1: Render full text (no numberOfLines) to measure actual line count.
// Phase 2: Render truncated text (numberOfLines = collapsed limit) + toggle button if needed.
import React, { useState, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextStyle,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';

type ExpandableTextProps = {
  text: string;
  numberOfLines?: number; // collapsed line limit
  captionStyle?: TextStyle;
  buttonStyle?: TextStyle;
};

export default function ExpandableText({
  text,
  numberOfLines = 2,
  captionStyle,
  buttonStyle,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [measured, setMeasured] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  const handleMeasure = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = e.nativeEvent?.lines ?? [];
    const actualCount = lines.length;
    setLineCount(actualCount);
    setShowToggle(actualCount > numberOfLines);
    setMeasured(true);
    // Minimal debug log (remove later if noisy)
    // eslint-disable-next-line no-console
    console.log('[ExpandableText] measured', { actualCount, limit: numberOfLines, showToggle: actualCount > numberOfLines, sample: text.slice(0, 40) });
  }, [numberOfLines, text]);

  // Fallback: if onTextLayout doesn't fire (rare), assume long text when length is large
  React.useEffect(() => {
    if (measured) return;
    const id = setTimeout(() => {
      if (!measured && !attemptedFallback) {
        const heuristic = (text?.length ?? 0) > 140;
        setShowToggle(heuristic);
        setMeasured(true);
        setAttemptedFallback(true);
        // eslint-disable-next-line no-console
        console.log('[ExpandableText] fallback applied', { heuristic, textLength: text?.length });
      }
    }, 200);
    return () => clearTimeout(id);
  }, [measured, attemptedFallback, text]);

  const toggle = () => {
    if (!showToggle) return;
    setExpanded(prev => !prev);
  };

  // Phase 1: Measure full text (no truncation) – invisible to user except identical styling.
  if (!measured) {
    return (
      <View>
        <Text
          onTextLayout={handleMeasure}
          style={[styles.caption, captionStyle]}
          accessibilityLabel="post-caption-measure"
        >
          {text}
        </Text>
      </View>
    );
  }

  // Phase 2: Display truncated or full text + toggle button.
  return (
    <View>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={showToggle ? 0.7 : 1}
        disabled={!showToggle}
        accessibilityRole={showToggle ? 'button' : undefined}
        accessibilityLabel={expanded ? 'Collapse caption' : 'Expand caption'}
      >
        <Text
          numberOfLines={expanded ? undefined : numberOfLines}
          ellipsizeMode="tail"
          style={[styles.caption, captionStyle]}
          accessibilityLabel="post-caption"
        >
          {text}
        </Text>
      </TouchableOpacity>
      {showToggle && (
        <TouchableOpacity
          onPress={toggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.toggleButton}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleText, buttonStyle]}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 14,
    lineHeight: 18,
    color: '#0F172A',
  },
  toggleButton: {
    marginTop: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  toggleText: {
    color: '#0A84FF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});
