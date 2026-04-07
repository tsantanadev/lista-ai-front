import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import type { Item } from '../types/item';

interface ItemRowProps {
  item: Item;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ItemRow({ item, onToggle, onEdit, onDelete }: ItemRowProps) {
  const qtyLabel = [
    item.quantity != null ? String(item.quantity) : null,
    item.uom ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={[styles.row, item.checked && styles.rowChecked]}>
      {/* Checkbox */}
      <TouchableOpacity style={styles.checkboxArea} onPress={onToggle} hitSlop={8}>
        <View style={[styles.checkbox, item.checked && styles.checkboxDone]}>
          {item.checked && (
            <View style={styles.checkmark} />
          )}
        </View>
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity style={styles.content} onPress={onEdit} activeOpacity={0.7}>
        <Text
          style={[styles.description, item.checked && styles.descriptionChecked]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      </TouchableOpacity>

      {/* Qty */}
      {qtyLabel ? (
        <Text style={[styles.qty, item.checked && styles.qtyChecked]}>{qtyLabel}</Text>
      ) : null}

      {/* Delete */}
      <TouchableOpacity style={styles.deleteArea} onPress={onDelete} hitSlop={8}>
        <Trash2 size={17} color={item.checked ? '#2A2A2A' : '#888780'} strokeWidth={1.75} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#0F2E28',
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
    borderColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
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
  description: { color: '#EEF2F0', fontSize: 15 },
  descriptionChecked: { color: '#888780', textDecorationLine: 'line-through' },
  qty: { color: '#EF9F27', fontSize: 13, fontWeight: '600', flexShrink: 0 },
  qtyChecked: { color: '#888780', textDecorationLine: 'line-through' },
  deleteArea: { flexShrink: 0 },
});
