import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { useTheme } from '../../theme/ThemeContext';

function ListsHomeContent({ navigation }: ListsHomeProps) {
  const { data: lists = [], isLoading } = useListsQuery();
  const deleteList = useDeleteList();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const handleDelete = (list: List) => {
    Alert.alert(
      t('lists.deleteDialog.title'),
      t('lists.deleteDialog.message', { name: list.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('lists.deleteDialog.confirm'), style: 'destructive', onPress: () => deleteList.mutate(list) },
      ]
    );
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: theme.background },
    title:     { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    loader:    { flex: 1 },
    list:      { paddingVertical: 8, paddingBottom: 100 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      backgroundColor: theme.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      elevation: 4,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    fabText: { color: theme.textPrimary, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  });

  return (
    <SafeAreaView style={s.container}>
      <SyncStatusBar />
      <View style={s.header}>
        <Text style={s.title}>{t('lists.title')}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={s.loader} />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('lists.empty.title')}
          subtitle={t('lists.empty.hint')}
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
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        />
      )}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('AddEditList', undefined)}
        activeOpacity={0.85}
      >
        <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={s.fabText}>{t('lists.newList')}</Text>
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
