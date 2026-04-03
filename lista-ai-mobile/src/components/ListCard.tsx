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
  const percent = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{list.name}</Text>
        <Text style={styles.count}>
          {total === 0 ? '0 / 0' : `${checked} / ${total}`}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={styles.percent}>
        {total === 0 ? 'No items' : `${percent}% complete`}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { color: '#FAFAFA', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  count: { color: '#A1A1AA', fontSize: 12 },
  progressTrack: {
    height: 5,
    backgroundColor: '#27272A',
    borderRadius: 9999,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 9999,
  },
  percent: { color: '#71717A', fontSize: 11 },
});
