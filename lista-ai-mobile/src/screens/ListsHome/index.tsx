import React from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ClipboardList } from 'lucide-react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EmptyState } from '../../components/EmptyState';
import { ListCard } from '../../components/ListCard';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { useListsQuery, useDeleteList } from '../../hooks/useLists';
import type { ListsHomeProps } from '../../navigation/types';
import type { List } from '../../types/list';

function ListsHomeContent({ navigation }: ListsHomeProps) {
  const { data: lists = [], isLoading } = useListsQuery();
  const deleteList = useDeleteList();

  const handleDelete = (list: List) => {
    Alert.alert(
      'Delete List',
      `Delete "${list.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteList.mutate(list) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SyncStatusBar />
      <View style={styles.header}>
        <Text style={styles.title}>My Lists</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1D9E75" style={styles.loader} />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No lists yet"
          subtitle="Tap NEW LIST to create your first shopping list"
        />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ListCard
              list={item}
              onPress={() => navigation.navigate('ListDetail', { listId: item.id, listName: item.name })}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditList', undefined)}
        activeOpacity={0.85}
      >
        <Plus size={16} color="#EEF2F0" strokeWidth={2.5} />
        <Text style={styles.fabText}>NEW LIST</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export function ListsHome(props: ListsHomeProps) {
  return (
    <ErrorBoundary>
      <ListsHomeContent {...props} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111210' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#EEF2F0', fontSize: 28, fontWeight: '700' },
  loader: { flex: 1 },
  list: { paddingVertical: 8, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1D9E75',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: { color: '#EEF2F0', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
});
