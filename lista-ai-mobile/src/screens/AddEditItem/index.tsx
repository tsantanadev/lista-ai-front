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
  ScrollView,
} from 'react-native';
import { useCreateItem, useUpdateItem, useItemsQuery } from '../../hooks/useItems';
import type { AddEditItemProps } from '../../navigation/types';

export function AddEditItem({ route, navigation }: AddEditItemProps) {
  const { listId, remoteListId, itemId } = route.params ?? {};
  const isEditing = !!itemId;

  const { data: allItems = [] } = useItemsQuery(listId!);
  const existingItem = itemId ? allItems.find((i) => i.id === itemId) : undefined;

  const [description, setDescription] = useState(existingItem?.description ?? '');
  const [quantity, setQuantity] = useState(existingItem?.quantity ?? '');
  const [price, setPrice] = useState(existingItem?.price != null ? String(existingItem.price) : '');

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const handleSave = async () => {
    if (!description.trim() || !listId) return;

    const parsedPrice = price.trim() ? parseFloat(price) : undefined;

    if (isEditing && existingItem) {
      await updateItem.mutateAsync({
        item: existingItem,
        input: {
          description: description.trim(),
          quantity: quantity.trim() || undefined,
          price: isNaN(parsedPrice!) ? undefined : parsedPrice,
        },
        remoteListId: remoteListId ?? null,
      });
    } else {
      await createItem.mutateAsync({
        listId,
        remoteListId: remoteListId ?? null,
        input: {
          description: description.trim(),
          quantity: quantity.trim() || undefined,
          price: isNaN(parsedPrice!) ? undefined : parsedPrice,
        },
      });
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>DESCRIPTION *</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Organic milk"
            placeholderTextColor="#71717A"
            autoFocus
            returnKeyType="next"
          />

          <Text style={styles.sectionLabel}>QUANTITY</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 2 kg"
            placeholderTextColor="#71717A"
            returnKeyType="next"
          />

          <Text style={styles.sectionLabel}>PRICE</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 3.99"
            placeholderTextColor="#71717A"
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <TouchableOpacity
            style={[styles.button, !description.trim() && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!description.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  flex: { flex: 1 },
  content: { padding: 24 },
  sectionLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 8,
    color: '#FAFAFA',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FAFAFA', fontWeight: '700', fontSize: 16 },
});
