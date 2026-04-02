import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCreateList, useUpdateList, useListsQuery } from '../../hooks/useLists';
import type { AddEditListProps } from '../../navigation/types';

export function AddEditList({ route, navigation }: AddEditListProps) {
  const params = route.params;
  const isEditing = !!params?.listId;
  const [name, setName] = useState(params?.listName ?? '');

  const createList = useCreateList();
  const updateList = useUpdateList();
  const { data: lists = [] } = useListsQuery();

  const handleSave = async () => {
    if (!name.trim()) return;

    if (isEditing && params?.listId) {
      const list = lists.find((l) => l.id === params.listId);
      if (list) {
        await updateList.mutateAsync({ list, input: { name: name.trim() } });
      }
    } else {
      await createList.mutateAsync({ name: name.trim() });
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Text style={styles.label}>{isEditing ? 'Rename List' : 'New List'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="List name"
          placeholderTextColor="#71717A"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        <TouchableOpacity
          style={[styles.button, !name.trim() && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!name.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  label: { color: '#A1A1AA', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 8,
    color: '#FAFAFA',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FAFAFA', fontWeight: '700', fontSize: 16 },
});
