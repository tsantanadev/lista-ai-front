import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { List } from '../types/list';
import { useItemsQuery } from '../hooks/useItems';

interface ListCardProps {
  list: List;
  onPress: () => void;
  onDelete: () => void;
}

export function ListCard({ list, onPress, onDelete }: ListCardProps) {
  const { data: allItems = [] } = useItemsQuery(list.id);
  const total = allItems.length;
  const checked = allItems.filter((i) => i.checked).length;
  const progress = total > 0 ? checked / total : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.8}
    >
      <Text style={styles.name} numberOfLines={1}>{list.name}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={styles.count}>
        {total === 0 ? 'No items' : `${checked} of ${total} items`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  name: { color: '#FAFAFA', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  progressTrack: {
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  count: { color: '#A1A1AA', fontSize: 13 },
});
