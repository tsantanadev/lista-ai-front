import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, XCircle } from 'lucide-react-native';
import { useCreateItem, useUpdateItem, useItemsQuery } from '../../hooks/useItems';
import type { AddEditItemProps } from '../../navigation/types';

const UOM_CHIPS = ['g', 'kg', 'L', 'ml', 'un'] as const;

function getStep(qty: number): number {
  return qty !== Math.floor(qty) ? 0.1 : 1;
}

export function AddEditItem({ route, navigation }: AddEditItemProps) {
  const { listId, remoteListId, itemId } = route.params ?? {};
  const isEditing = !!itemId;
  const { t } = useTranslation();

  const { data: allItems = [] } = useItemsQuery(listId!);
  const existingItem = itemId ? allItems.find((i) => i.id === itemId) : undefined;

  const [description, setDescription] = useState(existingItem?.description ?? '');
  const [descFocused, setDescFocused] = useState(false);
  const [quantity, setQuantity] = useState<number>(existingItem?.quantity ?? 1);
  const [quantityText, setQuantityText] = useState<string>(
    existingItem?.quantity != null ? String(existingItem.quantity) : '1'
  );
  const [uom, setUom] = useState<string>(existingItem?.uom ?? '');
  const [uomFocused, setUomFocused] = useState(false);

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const handleQuantityText = (text: string) => {
    setQuantityText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) setQuantity(parsed);
  };

  const handleDecrement = useCallback(() => {
    setQuantity((prev) => {
      const step = getStep(prev);
      const next = Math.max(0, parseFloat((prev - step).toFixed(1)));
      setQuantityText(String(next));
      return next;
    });
  }, []);

  const handleIncrement = useCallback(() => {
    setQuantity((prev) => {
      const step = getStep(prev);
      const next = parseFloat((prev + step).toFixed(1));
      setQuantityText(String(next));
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!description.trim() || !listId) return;

    const input = {
      description: description.trim(),
      quantity: quantity > 0 ? quantity : undefined,
      uom: uom.trim() || undefined,
    };

    if (isEditing && existingItem) {
      await updateItem.mutateAsync({ item: existingItem, input, remoteListId: remoteListId ?? null });
    } else {
      await createItem.mutateAsync({ listId, remoteListId: remoteListId ?? null, input });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        {/* Drag handle */}
        <View style={styles.dragHandleRow}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.cameraBtn}>
            <Camera size={18} color="#1D9E75" strokeWidth={1.8} />
          </View>
          <Text style={styles.headerTitle}>{t('items.detailsTitle')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!description.trim()}>
            <Text style={[styles.concluido, !description.trim() && styles.concluidoDisabled]}>
              {t('items.done')}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Description */}
            <TextInput
              style={[styles.descInput, descFocused && styles.descInputFocused]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('items.descriptionPlaceholder')}
              placeholderTextColor="#555"
              autoFocus
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              returnKeyType="next"
            />

            {/* Quantidade + Unidade */}
            <View>
              <View style={styles.qtyLabels}>
                <Text style={[styles.fieldLabel, { flex: 1 }]}>{t('items.quantity')}</Text>
                <Text style={[styles.fieldLabel, { flex: 1 }]}>{t('items.unit')}</Text>
                <View style={styles.btnSpacer} />
              </View>
              <View style={styles.qtyRow}>
                {/* Qty text input */}
                <View style={styles.qtyInput}>
                  <TextInput
                    style={styles.qtyTextInput}
                    value={quantityText}
                    onChangeText={handleQuantityText}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={() => { setQuantityText('1'); setQuantity(1); }}>
                    <XCircle size={16} color="#333" strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                {/* UOM text input */}
                <View style={[styles.qtyInput, uomFocused && styles.qtyInputFocused]}>
                  <TextInput
                    style={styles.qtyTextInput}
                    value={uom}
                    onChangeText={setUom}
                    placeholder="—"
                    placeholderTextColor="#555"
                    onFocus={() => setUomFocused(true)}
                    onBlur={() => setUomFocused(false)}
                    returnKeyType="done"
                    maxLength={8}
                  />
                  {uom.length > 0 && (
                    <TouchableOpacity onPress={() => setUom('')}>
                      <XCircle size={16} color="#333" strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* − button */}
                <TouchableOpacity style={styles.stepBtn} onPress={handleDecrement} activeOpacity={0.8}>
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>

                {/* + button */}
                <TouchableOpacity style={styles.stepBtn} onPress={handleIncrement} activeOpacity={0.8}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* UOM chips */}
            <View style={styles.chipsRow}>
              <Text style={styles.chipsLabel}>{t('items.unitLabel')}</Text>
              <View style={styles.chips}>
                {UOM_CHIPS.map((chip) => {
                  const isActive = uom === chip;
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setUom(chip)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  sheet: {
    backgroundColor: '#1A1C1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  flex: { flex: 1 },

  dragHandleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  dragHandle: { width: 36, height: 4, borderRadius: 9999, backgroundColor: '#2A2C2A' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F2E28',
  },
  cameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#EEF2F0', fontSize: 16, fontWeight: '700' },
  concluido: { color: '#1D9E75', fontSize: 16, fontWeight: '600' },
  concluidoDisabled: { opacity: 0.35 },

  body: { padding: 18, gap: 16 },

  descInput: {
    backgroundColor: '#111210',
    borderWidth: 1.5,
    borderColor: '#0F2E28',
    borderRadius: 12,
    color: '#EEF2F0',
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descInputFocused: { borderColor: '#1D9E75' },

  fieldLabel: { color: '#888780', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  qtyLabels: { flexDirection: 'row', alignItems: 'center' },
  btnSpacer: { width: 96 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 4,
  },
  qtyInputFocused: { borderColor: '#1D9E75' },
  qtyTextInput: { flex: 1, color: '#EEF2F0', fontSize: 16, fontWeight: '500', padding: 0 },

  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  stepBtnText: { color: '#fff', fontSize: 20, fontWeight: '400', lineHeight: 24 },

  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipsLabel: {
    color: '#888780',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flexShrink: 0,
  },
  chips: { flex: 1, flexDirection: 'row', gap: 5 },
  chip: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#111210',
    borderWidth: 1,
    borderColor: '#0F2E28',
  },
  chipActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  chipText: { color: '#888780', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
