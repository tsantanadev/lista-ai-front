import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Square, CheckSquare, Trash2 } from 'lucide-react-native';
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
        {item.checked
          ? <CheckSquare size={22} color="#22C55E" strokeWidth={2} />
          : <Square size={22} color="#3B82F6" strokeWidth={2} />}
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
        <Trash2 size={18} color={item.checked ? '#3F3F46' : '#71717A'} strokeWidth={1.75} />
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
  rowChecked: { opacity: 0.55 },
  checkboxArea: { marginRight: 12 },
  content: { flex: 1 },
  description: { color: '#FAFAFA', fontSize: 16 },
  descriptionChecked: { color: '#71717A', textDecorationLine: 'line-through' },
  meta: { color: '#A1A1AA', fontSize: 13, marginTop: 2 },
  deleteArea: { marginLeft: 12 },
});
