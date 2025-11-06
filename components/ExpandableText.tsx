import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

interface ExpandableTextProps {
  text: string;
  numberOfLines?: number;
  style?: any;
  usernameStyle?: any;
  username?: string;
  moreTextStyle?: any;
  lessTextStyle?: any;
}

export default function ExpandableText({
  text,
  numberOfLines = 2,
  style,
  usernameStyle,
  username,
  moreTextStyle,
  lessTextStyle,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const onTextLayout = (e: any) => {
    if (!expanded && e.nativeEvent.lines.length > numberOfLines) {
      setShowMore(true);
    }
  };

  return (
    <View>
      <Text
        style={style}
        numberOfLines={expanded ? undefined : numberOfLines}
        onTextLayout={onTextLayout}
      >
        {username && <Text style={usernameStyle}>{username}</Text>}
        {username && ' '}
        {text}
      </Text>
      {showMore && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
          <Text style={[styles.moreButton, expanded ? lessTextStyle : moreTextStyle]}>
            {expanded ? 'less' : 'more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  moreButton: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    marginBottom: 2,
  },
});
