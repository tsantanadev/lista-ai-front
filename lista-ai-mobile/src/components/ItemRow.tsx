import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import type { Item } from '../types/item';
import { useTheme } from '../theme/ThemeContext';

interface ItemRowProps {
  item: Item;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ItemRow({ item, onToggle, onEdit, onDelete }: ItemRowProps) {
  const { theme } = useTheme();
  const qtyLabel = [
    item.quantity != null ? String(item.quantity) : null,
    item.uom ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  const s = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      marginHorizontal: 12,
      gap: 10,
    },
    rowChecked: { opacity: 0.5 },
    checkboxArea: { flexShrink: 0 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkmark: {
      width: 10,
      height: 6,
      borderLeftWidth: 2,
      borderBottomWidth: 2,
      borderColor: '#fff',
      transform: [{ rotate: '-45deg' }, { translateY: -1 }],
    },
    content: { flex: 1 },
    description: { color: theme.textPrimary, fontSize: 15 },
    descriptionChecked: { color: theme.neutral, textDecorationLine: 'line-through' },
    qty:        { color: theme.accent, fontSize: 13, fontWeight: '600', flexShrink: 0 },
    qtyChecked: { color: theme.neutral, textDecorationLine: 'line-through' },
    deleteArea: { flexShrink: 0 },
  });

  return (
    <View style={[s.row, item.checked && s.rowChecked]}>
      <TouchableOpacity style={s.checkboxArea} onPress={onToggle} hitSlop={8}>
        <View style={[s.checkbox, item.checked && s.checkboxDone]}>
          {item.checked && <View style={s.checkmark} />}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={s.content} onPress={onEdit} activeOpacity={0.7}>
        <Text style={[s.description, item.checked && s.descriptionChecked]} numberOfLines={2}>
          {item.description}
        </Text>
      </TouchableOpacity>
      {qtyLabel ? (
        <Text style={[s.qty, item.checked && s.qtyChecked]}>{qtyLabel}</Text>
      ) : null}
      <TouchableOpacity style={s.deleteArea} onPress={onDelete} hitSlop={8}>
        <Trash2 size={17} color={item.checked ? theme.progressTrack : theme.neutral} strokeWidth={1.75} />
      </TouchableOpacity>
    </View>
  );
}
