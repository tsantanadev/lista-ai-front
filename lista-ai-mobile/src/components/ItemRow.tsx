import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { Item } from '../types/item';

interface ItemRowProps {
  item: Item;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ItemRow({ item, onToggle, onEdit, onDelete }: ItemRowProps) {
  return (
    <View style={[styles.row, item.checked && styles.rowChecked]}>
      <TouchableOpacity style={styles.checkboxArea} onPress={onToggle} hitSlop={8}>
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.content} onPress={onEdit} activeOpacity={0.7}>
        <Text
          style={[styles.description, item.checked && styles.descriptionChecked]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
        {(item.quantity || item.price != null) && (
          <Text style={styles.meta}>
            {[item.quantity, item.price != null ? `$${item.price.toFixed(2)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteArea} onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#18181B',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  rowChecked: { backgroundColor: '#18181B' },
  checkboxArea: { marginRight: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#71717A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  checkmark: { color: '#FAFAFA', fontSize: 14, fontWeight: '700' },
  content: { flex: 1 },
  description: { color: '#FAFAFA', fontSize: 16 },
  descriptionChecked: { color: '#71717A', textDecorationLine: 'line-through' },
  meta: { color: '#A1A1AA', fontSize: 13, marginTop: 2 },
  deleteArea: { marginLeft: 12 },
  deleteIcon: { fontSize: 18 },
});
