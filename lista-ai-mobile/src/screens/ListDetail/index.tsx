import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EmptyState } from '../../components/EmptyState';
import { ItemRow } from '../../components/ItemRow';
import { useItemsQuery, useUpdateItem, useDeleteItem } from '../../hooks/useItems';
import { useListsQuery } from '../../hooks/useLists';
import type { ListDetailProps } from '../../navigation/types';
import type { Item } from '../../types/item';

function ListDetailContent({ route, navigation }: ListDetailProps) {
  const { listId, listName } = route.params;
  const [showChecked, setShowChecked] = useState(true);

  const { data: allItems = [], isLoading } = useItemsQuery(listId);
  const { data: lists = [] } = useListsQuery();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const currentList = lists.find((l) => l.id === listId);
  const remoteListId = currentList?.remoteId ?? null;

  const unchecked = allItems.filter((i) => !i.checked);
  const checked = allItems.filter((i) => i.checked);

  const handleToggle = (item: Item) => {
    updateItem.mutate({
      item,
      input: { checked: !item.checked },
      remoteListId,
    });
  };

  const handleEdit = (item: Item) => {
    navigation.navigate('AddEditItem', {
      listId,
      remoteListId,
      itemId: item.id,
    });
  };

  const handleDelete = (item: Item) => {
    deleteItem.mutate({ item, remoteListId });
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={styles.loader} />
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No items yet"
          subtitle="Tap ADD to add your first item"
        />
      ) : (
        <FlatList
          data={[
            ...unchecked,
            ...(showChecked ? checked : []),
          ]}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            checked.length > 0 ? (
              <TouchableOpacity
                style={styles.checkedHeader}
                onPress={() => setShowChecked((v) => !v)}
              >
                {showChecked
                  ? <ChevronDown size={16} color="#A1A1AA" strokeWidth={2} />
                  : <ChevronRight size={16} color="#A1A1AA" strokeWidth={2} />}
                <Text style={styles.checkedHeaderText}>
                  Checked items ({checked.length})
                </Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onToggle={() => handleToggle(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddEditItem', { listId, remoteListId })}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FAFAFA" strokeWidth={2.5} />
        <Text style={styles.addButtonText}>ADD</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export function ListDetail(props: ListDetailProps) {
  return (
    <ErrorBoundary>
      <ListDetailContent {...props} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  loader: { flex: 1 },
  list: { paddingBottom: 100 },
  checkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#09090B',
  },
  checkedHeaderText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 9999,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: { color: '#FAFAFA', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
});
