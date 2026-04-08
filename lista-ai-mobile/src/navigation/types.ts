import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

// ── Lists stack ───────────────────────────────────────────────────────────────
export type ListsStackParamList = {
  ListsHome: undefined;
  ListDetail: { listId: number; listName: string };
  AddEditList: { listId?: number; listName?: string } | undefined;
  AddEditItem: { listId: number; remoteListId: number | null; itemId?: number } | undefined;
};

// ── Bottom tabs ───────────────────────────────────────────────────────────────
export type RootTabParamList = {
  ListsTab:   undefined;
  ComprasTab: undefined;
  PerfilTab:  undefined;
};

// ── Auth stack (unauthenticated) ──────────────────────────────────────────────
export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
};

// ── Root stack (wraps tabs + modal-style screens) ────────────────────────────
export type RootStackParamList = {
  Auth:      NavigatorScreenParams<AuthStackParamList>;
  MainTabs:  NavigatorScreenParams<RootTabParamList>;
  PerfilInfo: undefined;
};

// ── Typed screen props ────────────────────────────────────────────────────────
export type ListsHomeProps  = NativeStackScreenProps<ListsStackParamList, 'ListsHome'>;
export type ListDetailProps = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;
export type AddEditListProps = NativeStackScreenProps<ListsStackParamList, 'AddEditList'>;
export type AddEditItemProps = NativeStackScreenProps<ListsStackParamList, 'AddEditItem'>;

export type LoginProps     = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterProps  = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type PerfilInfoProps = NativeStackScreenProps<RootStackParamList, 'PerfilInfo'>;
