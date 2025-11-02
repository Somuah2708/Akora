declare module 'react-native-draggable-flatlist' {
  import * as React from 'react';
  import { FlatListProps } from 'react-native';

  export type RenderItemParams<T> = {
    item: T;
    index: number;
    drag: () => void;
    isActive: boolean;
    getIndex?: () => number | undefined;
  };

  export interface DraggableFlatListProps<T>
    extends Omit<FlatListProps<T>, 'renderItem' | 'data'> {
    data: T[];
    keyExtractor?: (item: T, index: number) => string;
    onDragEnd: (params: { data: T[]; from: number; to: number }) => void;
    renderItem: (params: RenderItemParams<T>) => React.ReactElement | null;
  }

  export default class DraggableFlatList<T> extends React.Component<DraggableFlatListProps<T>> {}
}
