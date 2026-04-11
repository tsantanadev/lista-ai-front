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
import { useTheme } from '../../theme/ThemeContext';

const UOM_CHIPS = ['g', 'kg', 'L', 'ml', 'un'] as const;

function getStep(qty: number): number {
  return qty !== Math.floor(qty) ? 0.1 : 1;
}

export function AddEditItem({ route, navigation }: AddEditItemProps) {
  const { listId, remoteListId, itemId } = route.params ?? {};
  const isEditing = !!itemId;
  const { t } = useTranslation();
  const { theme } = useTheme();

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

  const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    flex: { flex: 1 },
    dragHandleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
    dragHandle: { width: 36, height: 4, borderRadius: 9999, backgroundColor: theme.dragHandle },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    cameraBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle:      { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
    concluido:        { color: theme.primary, fontSize: 16, fontWeight: '600' },
    concluidoDisabled: { opacity: 0.35 },
    body: { padding: 18, gap: 16 },
    descInput: {
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 12,
      color: theme.textPrimary,
      fontSize: 17,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    descInputFocused: { borderColor: theme.primary },
    fieldLabel: { color: theme.neutral, fontSize: 13, fontWeight: '500', marginBottom: 6 },
    qtyLabels:  { flexDirection: 'row', alignItems: 'center' },
    btnSpacer:  { width: 96 },
    qtyRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 10,
      gap: 4,
    },
    qtyInputFocused:  { borderColor: theme.primary },
    qtyTextInput: { flex: 1, color: theme.textPrimary, fontSize: 16, fontWeight: '500', padding: 0 },
    stepBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 3,
    },
    stepBtnText: { color: '#fff', fontSize: 20, fontWeight: '400', lineHeight: 24 },
    chipsRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chipsLabel: {
      color: theme.neutral,
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
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipActive:     { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText:       { color: theme.neutral, fontSize: 14 },
    chipTextActive: { color: '#fff', fontWeight: '700' },
  });

  return (
    <View style={s.overlay}>
      <SafeAreaView style={s.sheet} edges={['bottom']}>
        <View style={s.dragHandleRow}>
          <View style={s.dragHandle} />
        </View>
        <View style={s.header}>
          <View style={s.cameraBtn}>
            <Camera size={18} color={theme.primary} strokeWidth={1.8} />
          </View>
          <Text style={s.headerTitle}>{t('items.detailsTitle')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!description.trim()}>
            <Text style={[s.concluido, !description.trim() && s.concluidoDisabled]}>
              {t('items.done')}
            </Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.flex}
        >
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <TextInput
              style={[s.descInput, descFocused && s.descInputFocused]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('items.descriptionPlaceholder')}
              placeholderTextColor={theme.placeholder}
              autoFocus
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              returnKeyType="next"
            />
            <View>
              <View style={s.qtyLabels}>
                <Text style={[s.fieldLabel, { flex: 1 }]}>{t('items.quantity')}</Text>
                <Text style={[s.fieldLabel, { flex: 1 }]}>{t('items.unit')}</Text>
                <View style={s.btnSpacer} />
              </View>
              <View style={s.qtyRow}>
                <View style={s.qtyInput}>
                  <TextInput
                    style={s.qtyTextInput}
                    value={quantityText}
                    onChangeText={handleQuantityText}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={() => { setQuantityText('1'); setQuantity(1); }}>
                    <XCircle size={16} color={theme.neutral} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <View style={[s.qtyInput, uomFocused && s.qtyInputFocused]}>
                  <TextInput
                    style={s.qtyTextInput}
                    value={uom}
                    onChangeText={setUom}
                    placeholder="—"
                    placeholderTextColor={theme.placeholder}
                    onFocus={() => setUomFocused(true)}
                    onBlur={() => setUomFocused(false)}
                    returnKeyType="done"
                    maxLength={8}
                  />
                  {uom.length > 0 && (
                    <TouchableOpacity onPress={() => setUom('')}>
                      <XCircle size={16} color={theme.neutral} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={s.stepBtn} onPress={handleDecrement} activeOpacity={0.8}>
                  <Text style={s.stepBtnText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.stepBtn} onPress={handleIncrement} activeOpacity={0.8}>
                  <Text style={s.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.chipsRow}>
              <Text style={s.chipsLabel}>{t('items.unitLabel')}</Text>
              <View style={s.chips}>
                {UOM_CHIPS.map((chip) => {
                  const isActive = uom === chip;
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[s.chip, isActive && s.chipActive]}
                      onPress={() => setUom(chip)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.chipText, isActive && s.chipTextActive]}>{chip}</Text>
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
