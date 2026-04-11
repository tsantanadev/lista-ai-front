import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  SectionList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ShoppingCart, ArrowLeft } from 'lucide-react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EmptyState } from '../../components/EmptyState';
import { ItemRow } from '../../components/ItemRow';
import { useItemsQuery, useUpdateItem, useDeleteItem } from '../../hooks/useItems';
import { useListsQuery } from '../../hooks/useLists';
import type { ListDetailProps } from '../../navigation/types';
import type { Item } from '../../types/item';
import { useTheme } from '../../theme/ThemeContext';

type Section = { title: 'unchecked' | 'checked'; data: Item[] };

function ListDetailContent({ route, navigation }: ListDetailProps) {
  const { listId, listName } = route.params;
  const { data: allItems = [], isLoading } = useItemsQuery(listId);
  const { data: lists = [] } = useListsQuery();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const currentList = lists.find((l) => l.id === listId);
  const remoteListId = currentList?.remoteId ?? null;

  const [checkedVisible, setCheckedVisible] = React.useState(true);

  const uncheckedItems = allItems.filter((i) => !i.checked);
  const checkedItems   = allItems.filter((i) => i.checked);

  const sections: Section[] = [
    { title: 'unchecked', data: uncheckedItems },
    ...(checkedItems.length > 0
      ? [{ title: 'checked' as const, data: checkedVisible ? checkedItems : [] }]
      : []),
  ];

  const handleToggle = (item: Item) => {
    updateItem.mutate({ item, input: { checked: !item.checked }, remoteListId });
  };

  const handleEdit = (item: Item) => {
    navigation.navigate('AddEditItem', { listId, remoteListId, itemId: item.id });
  };

  const handleDelete = (item: Item) => {
    deleteItem.mutate({ item, remoteListId });
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    title:  { color: theme.textPrimary, fontSize: 16, fontWeight: '600', flex: 1 },
    loader: { flex: 1 },
    list:   { padding: 12, paddingBottom: 100 },
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
    fabText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
    sectionToggle: {
      paddingVertical: 12,
      alignItems: 'center',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.border,
      marginTop: 6,
      marginBottom: 2,
    },
    sectionToggleText: { color: theme.primary, fontSize: 13 },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <ArrowLeft size={22} color={theme.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{listName}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={s.loader} />
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t('lists.detail.empty.title')}
          subtitle={t('lists.detail.empty.hint')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onToggle={() => handleToggle(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          renderSectionHeader={({ section }) => {
            if (section.title !== 'checked') return null;
            return (
              <TouchableOpacity
                style={s.sectionToggle}
                onPress={() => setCheckedVisible((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={s.sectionToggleText}>
                  ({checkedItems.length}){' '}
                  {checkedVisible ? t('lists.detail.hideChecked') : t('lists.detail.showChecked')}{' '}
                  {checkedVisible ? '∧' : '∨'}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          stickySectionHeadersEnabled={false}
        />
      )}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('AddEditItem', { listId, remoteListId })}
        activeOpacity={0.85}
      >
        <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={s.fabText}>{t('lists.detail.addItem')}</Text>
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
