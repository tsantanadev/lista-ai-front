import React, { useState } from 'react';
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

export function AddEditList({ route, navigation }: AddEditListProps) {
  const params = route.params;
  const isEditing = !!params?.listId;
  const [name, setName] = useState(params?.listName ?? '');
  const [focused, setFocused] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with X */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit List' : 'New List'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={styles.xBtn}>
            <X size={16} color="#888780" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.body}
      >
        <Text style={styles.label}>LIST NAME</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Weekly Groceries"
          placeholderTextColor="#888780"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        <TouchableOpacity
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1C1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F2E28',
  },
  headerTitle: { color: '#EEF2F0', fontSize: 16, fontWeight: '700' },
  xBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, padding: 20, gap: 8 },
  label: {
    color: '#888780',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  input: {
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    borderRadius: 9,
    color: '#EEF2F0',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inputFocused: { borderColor: '#1D9E75', borderWidth: 1.5 },
  saveBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: { color: '#EEF2F0', fontWeight: '700', fontSize: 15 },
});
