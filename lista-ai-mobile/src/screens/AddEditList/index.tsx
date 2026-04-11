import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useCreateList, useUpdateList, useListsQuery } from '../../hooks/useLists';
import type { AddEditListProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';

export function AddEditList({ route, navigation }: AddEditListProps) {
  const params = route.params;
  const isEditing = !!params?.listId;
  const [name, setName] = useState(params?.listName ?? '');
  const [focused, setFocused] = useState(false);
  const { t } = useTranslation();
  const { theme } = useTheme();

  const createList = useCreateList();
  const updateList = useUpdateList();
  const { data: lists = [] } = useListsQuery();

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEditing && params?.listId) {
      const list = lists.find((l) => l.id === params.listId);
      if (list) await updateList.mutateAsync({ list, input: { name: name.trim() } });
    } else {
      await createList.mutateAsync({ name: name.trim() });
    }
    navigation.goBack();
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
    xBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body:  { flex: 1, padding: 20, gap: 8 },
    label: {
      color: theme.neutral,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    input: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 9,
      color: theme.textPrimary,
      fontSize: 17,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    inputFocused: { borderColor: theme.primary, borderWidth: 1.5 },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 8,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{isEditing ? t('lists.addEditList.editTitle') : t('lists.addEditList.newTitle')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={s.xBtn}>
            <X size={16} color={theme.neutral} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.body}
      >
        <Text style={s.label}>{t('lists.addEditList.nameLabel')}</Text>
        <TextInput
          style={[s.input, focused && s.inputFocused]}
          value={name}
          onChangeText={setName}
          placeholder={t('lists.addEditList.namePlaceholder')}
          placeholderTextColor={theme.neutral}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity
          style={[s.saveBtn, !name.trim() && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim()}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
