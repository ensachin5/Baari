import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useSession } from '../../store/session';
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
} from 'lucide-react-native';

export interface GroceryItem {
  id: string;
  flatId: string;
  itemName: string;
  status: 'needed' | 'bought';
  addedBy: string;
  boughtBy?: string | null;
  boughtAt?: string | null;
  createdAt: string;
  addedByName?: string | null;
  addedByImage?: string | null;
  boughtByName?: string | null;
  boughtByImage?: string | null;
}

interface GroceryListModalProps {
  visible: boolean;
  onClose: () => void;
  flatId?: string | null;
}

export const GroceryListModal: React.FC<GroceryListModalProps> = ({
  visible,
  onClose,
  flatId,
}) => {
  const currentUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const isAdmin = activeFlat?.role === 'admin';

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBoughtExpanded, setIsBoughtExpanded] = useState(false);

  const loadGroceries = useCallback(async () => {
    if (!flatId) return;
    setLoading(true);
    try {
      const res = await api.get<{ items: GroceryItem[] }>(`/api/grocery-items?flatId=${flatId}`);
      setItems(res.items || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [flatId]);

  useEffect(() => {
    if (visible) {
      loadGroceries();
    }
  }, [visible, loadGroceries]);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleGroceryUpdated = () => {
      loadGroceries();
    };

    socket.on('grocery_updated', handleGroceryUpdated);
    return () => {
      socket.off('grocery_updated', handleGroceryUpdated);
    };
  }, [loadGroceries]);

  const handleAddItem = async () => {
    if (!newItemText.trim() || !flatId) return;
    const textToAdd = newItemText.trim();
    setNewItemText('');
    setAdding(true);

    try {
      const res = await api.post<{ item: GroceryItem }>('/api/grocery-items', {
        flatId,
        itemName: textToAdd,
      });
      if (res.item) {
        setItems((prev) => [res.item, ...prev]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleBought = async (item: GroceryItem) => {
    const nextBoughtState = item.status !== 'bought';

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: nextBoughtState ? 'bought' : 'needed',
              boughtBy: nextBoughtState ? currentUser?.id : null,
              boughtByName: nextBoughtState ? currentUser?.name : null,
              boughtByImage: nextBoughtState ? currentUser?.image : null,
            }
          : i
      )
    );

    try {
      await api.patch(`/api/grocery-items/${item.id}/bought`, {
        bought: nextBoughtState,
      });
    } catch (err: any) {
      // Revert on error
      loadGroceries();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Optimistic delete
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      await api.delete(`/api/grocery-items/${itemId}`);
    } catch (err: any) {
      loadGroceries();
    }
  };

  const neededItems = items.filter((i) => i.status === 'needed');
  const boughtItems = items.filter((i) => i.status === 'bought');

  return (
    <Modal visible={visible} onClose={onClose} title="Shared Grocery List">
      <View style={styles.container}>
        {/* Quick Add Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Add item (e.g. Milk, Eggs, Dish Soap)..."
            placeholderTextColor={Colors.mutedNavy}
            value={newItemText}
            onChangeText={setNewItemText}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, !newItemText.trim() && styles.addBtnDisabled]}
            onPress={handleAddItem}
            disabled={!newItemText.trim() || adding}
            activeOpacity={0.7}
          >
            {adding ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Plus size={16} color={Colors.white} />
                <Text style={styles.addBtnText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.navy} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingCart size={32} color={Colors.mutedNavy} />
            <Text style={styles.emptyTitle}>Grocery list is empty</Text>
            <Text style={styles.emptySub}>
              Add household staples so anyone going to the store knows what to grab.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {/* Needed Items */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Needed ({neededItems.length})</Text>
            </View>

            {neededItems.length === 0 ? (
              <Text style={styles.allClearText}>All needed items are bought! 🎉</Text>
            ) : (
              neededItems.map((item) => {
                const canDelete = item.addedBy === currentUser?.id || isAdmin;
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <TouchableOpacity
                      style={styles.checkTouch}
                      onPress={() => handleToggleBought(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.circleBox}>
                        <Circle size={20} color={Colors.mutedNavy} />
                      </View>
                      <View style={styles.nameCol}>
                        <Text style={styles.itemNameText}>{item.itemName}</Text>
                        <Text style={styles.addedByText}>
                          Added by {item.addedByName?.split(' ')[0] || 'Flatmate'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.rightActionCol}>
                      <Avatar
                        name={item.addedByName || 'User'}
                        image={item.addedByImage}
                        size="xs"
                      />
                      {canDelete && (
                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => handleDeleteItem(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={14} color={Colors.mutedNavy} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {/* Bought Items Collapsible Section */}
            {boughtItems.length > 0 && (
              <View style={styles.boughtSection}>
                <TouchableOpacity
                  style={styles.boughtHeader}
                  onPress={() => setIsBoughtExpanded((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.boughtHeaderText}>
                    Bought ({boughtItems.length})
                  </Text>
                  {isBoughtExpanded ? (
                    <ChevronUp size={16} color={Colors.mutedNavy} />
                  ) : (
                    <ChevronDown size={16} color={Colors.mutedNavy} />
                  )}
                </TouchableOpacity>

                {isBoughtExpanded &&
                  boughtItems.map((item) => {
                    const canDelete = item.addedBy === currentUser?.id || isAdmin;
                    return (
                      <View key={item.id} style={[styles.itemRow, styles.boughtItemRow]}>
                        <TouchableOpacity
                          style={styles.checkTouch}
                          onPress={() => handleToggleBought(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.circleBox}>
                            <CheckCircle2 size={20} color={Colors.navy} />
                          </View>
                          <View style={styles.nameCol}>
                            <Text style={[styles.itemNameText, styles.strikethroughText]}>
                              {item.itemName}
                            </Text>
                            <Text style={styles.boughtByText}>
                              Bought by {item.boughtByName?.split(' ')[0] || 'Flatmate'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.rightActionCol}>
                          <Avatar
                            name={item.boughtByName || item.addedByName || 'User'}
                            image={item.boughtByImage || item.addedByImage}
                            size="xs"
                          />
                          {canDelete && (
                            <TouchableOpacity
                              style={styles.trashBtn}
                              onPress={() => handleDeleteItem(item.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Trash2 size={14} color={Colors.mutedNavy} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 520,
    gap: Spacing.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    gap: Spacing.xs,
  },
  textInput: {
    flex: 1,
    height: 40,
    ...Typography.Body,
    color: Colors.grayBlack,
    paddingHorizontal: Spacing.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    ...Typography.Caption,
    color: Colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.Body,
    fontWeight: '600',
    color: Colors.grayBlack,
  },
  emptySub: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  scrollList: {
    maxHeight: 420,
  },
  scrollContent: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  sectionHeader: {
    paddingVertical: 4,
  },
  sectionTitle: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  allClearText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  boughtItemRow: {
    backgroundColor: Colors.offWhite,
    opacity: 0.85,
  },
  checkTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  circleBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCol: {
    flex: 1,
    gap: 1,
  },
  itemNameText: {
    ...Typography.Body,
    fontWeight: '500',
    color: Colors.grayBlack,
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
    color: Colors.mutedNavy,
  },
  addedByText: {
    fontSize: 10,
    color: Colors.mutedNavy,
  },
  boughtByText: {
    fontSize: 10,
    color: Colors.navy,
    fontWeight: '500',
  },
  rightActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trashBtn: {
    padding: 4,
  },
  boughtSection: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  boughtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  boughtHeaderText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontWeight: '600',
  },
});
