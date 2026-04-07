import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type ListsStackParamList = {
  ListsHome: undefined;
  ListDetail: { listId: number; listName: string };
  AddEditList: { listId?: number; listName?: string } | undefined;
  AddEditItem: { listId: number; remoteListId: number | null; itemId?: number } | undefined;
};

export type RootTabParamList = {
  ListsTab: undefined;
  ComprasTab: undefined;
  PerfilTab: undefined;
};

export type ListsHomeProps = NativeStackScreenProps<ListsStackParamList, 'ListsHome'>;
export type ListDetailProps = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;
export type AddEditListProps = NativeStackScreenProps<ListsStackParamList, 'AddEditList'>;
export type AddEditItemProps = NativeStackScreenProps<ListsStackParamList, 'AddEditItem'>;
