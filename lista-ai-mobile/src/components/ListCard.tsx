import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { List } from '../types/list';
import { useItemsQuery } from '../hooks/useItems';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

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
  const { t } = useTranslation();
  const { theme } = useTheme();

  const s = StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 5,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    name:  { color: theme.textPrimary, fontSize: 17, fontWeight: '600', flex: 1, marginRight: 8 },
    count: { color: theme.neutral, fontSize: 14 },
    progressTrack: {
      height: 4,
      backgroundColor: theme.progressTrack,
      borderRadius: 9999,
      marginBottom: 6,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%' as any,
      backgroundColor: theme.primary,
      borderRadius: 9999,
    },
    percent: { color: theme.neutral, fontSize: 13 },
  });

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.8}
    >
      <View style={s.header}>
        <Text style={s.name} numberOfLines={1}>{list.name}</Text>
        <Text style={s.count}>{checked} / {total}</Text>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={s.percent}>
        {total === 0 ? t('lists.card.noItems') : t('lists.card.percentComplete', { percent })}
      </Text>
    </TouchableOpacity>
  );
}
