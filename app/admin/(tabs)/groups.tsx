import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { GroupDTO, groupsApi, GuestDTO, guestsApi } from "@/lib/api";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ActiveSlot {
  groupId: string;
  slotIndex: 0 | 1;
}

export default function GroupsTab() {
  const theme = useTheme();
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [guests, setGuests] = useState<GuestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupList, guestList] = await Promise.all([groupsApi.list({ expand: true }), guestsApi.list()]);
      setGroups(groupList as GroupDTO[]);
      setGuests(guestList as GuestDTO[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    setNameDrafts((prev) => {
      const next: Record<string, string> = {};
      groups.forEach((group) => {
        next[group.id] = prev[group.id] ?? group.name;
      });
      return next;
    });
  }, [groups]);

  const groupNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach((group) => {
      map[group.id] = group.name;
    });
    return map;
  }, [groups]);

  const guestOptions = useMemo(() => {
    // Only show unassigned guests
    return guests
      .filter((g) => !g.groupId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guests]);

  const openSlotPicker = (groupId: string, slotIndex: 0 | 1) => {
    setActiveSlot({ groupId, slotIndex });
  };

  const closePicker = () => setActiveSlot(null);

  const assignGuestToSlot = async (
    guest: GuestDTO,
    targetGroup: GroupDTO,
    slotIndex: 0 | 1,
    originGroupId?: string
  ) => {
    setPending(true);
    try {
      if (originGroupId && originGroupId !== targetGroup.id) {
        const originGroup = groups.find((g) => g.id === originGroupId);
        if (originGroup) {
          const originGuestIds = originGroup.guestIds.filter((id) => id !== guest.id);
          await groupsApi.update(originGroup.id, { guestIds: originGuestIds });
        }
      }

      const slots: (string | null)[] = [targetGroup.guestIds[0] ?? null, targetGroup.guestIds[1] ?? null];
      slots[slotIndex] = guest.id;
      const updatedGuestIds = slots.filter((id): id is string => !!id);
      await groupsApi.update(targetGroup.id, { guestIds: updatedGuestIds });
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to assign guest");
    } finally {
      setPending(false);
      closePicker();
    }
  };

  const handleAssignGuest = (guest: GuestDTO) => {
    if (!activeSlot) return;
    const targetGroup = groups.find((g) => g.id === activeSlot.groupId);
    if (!targetGroup) return;

    const currentGuestId = targetGroup.guestIds[activeSlot.slotIndex];
    if (currentGuestId === guest.id) {
      closePicker();
      return;
    }

    const originGroupId = guest.groupId;

    const proceed = () => assignGuestToSlot(guest, targetGroup, activeSlot.slotIndex, originGroupId);

    if (originGroupId && originGroupId !== targetGroup.id) {
      const originGroupName = groupNameMap[originGroupId] || "another group";
      Alert.alert("Move guest", `${guest.name} is currently in ${originGroupName}. Move them to ${targetGroup.name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move",
          onPress: () => proceed(),
        },
      ]);
      return;
    }

    proceed();
  };

  const handleRemoveGuest = async (groupId: string, slotIndex: 0 | 1) => {
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return;
    if (!targetGroup.guestIds[slotIndex]) return;
    setPending(true);
    try {
      const slots: (string | null)[] = [targetGroup.guestIds[0] ?? null, targetGroup.guestIds[1] ?? null];
      slots[slotIndex] = null;
      const updatedGuestIds = slots.filter((id): id is string => !!id);
      await groupsApi.update(targetGroup.id, {
        guestIds: updatedGuestIds,
      });
      await load();
      // If both guests removed and we are inside picker for this group, close it
      if (updatedGuestIds.length === 0 && activeSlot?.groupId === groupId) {
        closePicker();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to remove guest");
    } finally {
      setPending(false);
    }
  };

  const handleNameBlur = async (group: GroupDTO) => {
    const draft = nameDrafts[group.id]?.trim() ?? "";
    if (!draft || draft === group.name) return;
    setPending(true);
    try {
      await groupsApi.update(group.id, { name: draft });
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to rename group");
      setNameDrafts((prev) => ({ ...prev, [group.id]: group.name }));
    } finally {
      setPending(false);
    }
  };

  const handleCreateGroup = async () => {
    const defaultName = `Group ${groups.length + 1}`;
    setPending(true);
    try {
      await groupsApi.create({ name: defaultName, guestIds: [] });
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create group");
    } finally {
      setPending(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (deletingId) return; // avoid double taps
    setDeletingId(groupId);
    try {
      await groupsApi.remove(groupId);
      if (activeSlot?.groupId === groupId) {
        closePicker();
      }
      setNameDrafts((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to delete group");
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteGroup = (group: GroupDTO) => {
    const displayName = group.name?.trim() || "this group";
    if (Platform.OS === "web") {
      // Use native browser confirm for web so it always appears
      const ok = window.confirm(`Delete ${displayName}?\nGuests will become unassigned.`);
      if (ok) handleDeleteGroup(group.id);
      return;
    }
    Alert.alert("Delete group", `Delete ${displayName}? Any assigned guests will become unassigned.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteGroup(group.id),
      },
    ]);
  };

  const handleSlotPress = (group: GroupDTO, slotIndex: 0 | 1) => {
    openSlotPicker(group.id, slotIndex);
  };

  const renderSlot = (group: GroupDTO, slotIndex: 0 | 1) => {
    const guestId = group.guestIds[slotIndex];
    const guest = guestId ? guests.find((g) => g.id === guestId) : undefined;
    const isFilled = !!guest;
    const label = isFilled ? guest!.name : "Add guest";
    const slotBorderColor = isFilled ? theme.border : theme.icon;
    const slotBackground = isFilled ? theme.backgroundAlt : theme.backgroundAlt;

    return (
      <TouchableOpacity
        key={`${group.id}-slot-${slotIndex}`}
        style={[styles.slot, { borderColor: slotBorderColor, backgroundColor: slotBackground }]}
        onPress={() => handleSlotPress(group, slotIndex)}
        disabled={pending}>
        {isFilled ? (
          <ThemedText style={[styles.slotGuest, { color: theme.text }]} numberOfLines={1}>
            {label}
          </ThemedText>
        ) : (
          <IconSymbol name="person.badge.plus" size={32} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderGroupCard = (group: GroupDTO) => {
    const progressCount = group.progress?.completedGames?.length ?? 0;
    return (
      <ThemedView
        key={group.id}
        style={[styles.groupCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <View style={styles.groupHeader}>
          <TextInput
            style={[styles.groupNameInput, { borderColor: theme.border, color: theme.text }]}
            placeholder="Group name"
            placeholderTextColor={theme.placeholder}
            value={nameDrafts[group.id] ?? ""}
            onChangeText={(text) => setNameDrafts((prev) => ({ ...prev, [group.id]: text }))}
            onBlur={() => handleNameBlur(group)}
            editable={!pending}
          />
          <TouchableOpacity
            accessibilityLabel={`Delete ${group.name}`}
            accessibilityHint="Removes this group and unassigns its guests"
            style={[
              styles.deleteButton,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
                opacity: deletingId && deletingId !== group.id ? 0.4 : 1,
              },
            ]}
            disabled={!!deletingId && deletingId !== group.id}
            onPress={() => confirmDeleteGroup(group)}>
            {deletingId === group.id ? (
              <ActivityIndicator size={18} color={theme.danger} />
            ) : (
              <IconSymbol name="trash.fill" size={22} color={theme.danger} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.groupRow}>
          {renderSlot(group, 0)}
          <View style={[styles.progressCircle, { borderColor: theme.icon, backgroundColor: theme.backgroundAlt }]}>
            <ThemedText style={[styles.progressText, { color: theme.icon }]}>{progressCount}</ThemedText>
            <ThemedText style={[styles.progressLabel, { color: theme.textMuted }]}>Games</ThemedText>
          </View>
          {renderSlot(group, 1)}
        </View>
      </ThemedView>
    );
  };

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) => {
      if (g.name.toLowerCase().includes(term)) return true;
      const participants = g.guestIds
        .map((id) => guests.find((gs) => gs.id === id)?.name || "")
        .join(" ")
        .toLowerCase();
      return participants.includes(term);
    });
  }, [groups, guests, search]);

  return (
    <>
      <ParallaxScrollView
        headerHeight={200}
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={<IconSymbol name="people-outline" size={220} color="#ffffff55" style={styles.headerIcon} />}>
        <ThemedView style={styles.container}>
          <View style={styles.headingRow}>
            <ThemedText type="title">Groups</ThemedText>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={handleCreateGroup}
              disabled={pending}>
              {pending ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <>
                  <IconSymbol name="plus" size={16} color={theme.background} />
                  <ThemedText style={{ color: theme.background, fontWeight: "600" }}>New Group</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
          <ThemedView style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search group or guest..."
              placeholderTextColor={theme.placeholder}
              style={[
                styles.searchInput,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                },
              ]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {error ? <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText> : null}
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={theme.accent} />
                <ThemedText style={{ color: theme.textMuted }}>Loading groups…</ThemedText>
              </View>
            ) : filteredGroups.length === 0 ? (
              <View style={styles.stateContainer}>
                <IconSymbol name="person.crop.circle.badge.plus" size={32} color={theme.icon} />
                <ThemedText style={[styles.emptyStateText, { color: theme.textMuted }]}>
                  {search ? "No matching groups." : "No groups yet. Create one to get started."}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.groupList}>{filteredGroups.map((group) => renderGroupCard(group))}</View>
            )}
          </ThemedView>
        </ThemedView>
      </ParallaxScrollView>

      <Modal
        transparent
        animationType={Platform.OS === "ios" ? "slide" : "fade"}
        visible={!!activeSlot}
        onRequestClose={closePicker}>
        <Pressable style={styles.modalOverlay} onPress={closePicker}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onPress={(event) => event.stopPropagation()}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              Select guest
            </ThemedText>
            {guestOptions.length === 0 ? (
              <ThemedText style={{ opacity: 0.7 }}>No guests yet. Add guests from the Guests tab first.</ThemedText>
            ) : (
              <FlatList
                data={guestOptions}
                keyExtractor={(guest) => guest.id}
                renderItem={({ item }) => {
                  const targetGroup = activeSlot ? groups.find((g) => g.id === activeSlot.groupId) : undefined;
                  const occupantId = targetGroup ? targetGroup.guestIds[activeSlot!.slotIndex] : undefined;
                  const assignedGroupName = item.groupId ? groupNameMap[item.groupId] : undefined;
                  const isInTargetGroup = item.groupId === activeSlot?.groupId;
                  const badgeLabel = assignedGroupName
                    ? isInTargetGroup
                      ? "This group"
                      : assignedGroupName
                    : "Unassigned";
                  const isCurrentOccupant = occupantId === item.id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.guestOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                        },
                        isCurrentOccupant && { opacity: 0.6 },
                      ]}
                      onPress={() => handleAssignGuest(item)}
                      disabled={pending}>
                      <View style={styles.guestOptionRow}>
                        <ThemedText style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
                          {item.name}
                        </ThemedText>
                        <View
                          style={[
                            styles.guestBadge,
                            isInTargetGroup
                              ? {
                                  backgroundColor: theme.primaryMuted,
                                  borderColor: theme.primary,
                                }
                              : {
                                  backgroundColor: theme.overlay,
                                  borderColor: theme.border,
                                },
                          ]}>
                          <ThemedText
                            style={{
                              color: isInTargetGroup ? theme.primary : theme.textMuted,
                              fontSize: 12,
                            }}>
                            {badgeLabel}
                          </ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            {activeSlot &&
              (() => {
                const currentGroup = groups.find((g) => g.id === activeSlot.groupId);
                const currentGuestId = currentGroup?.guestIds[activeSlot.slotIndex];
                if (!currentGroup || !currentGuestId) return null;
                const currentGuest = guests.find((g) => g.id === currentGuestId);
                if (!currentGuest) return null;
                return (
                  <View
                    style={[
                      styles.currentOccupantBar,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundAlt,
                      },
                    ]}>
                    <ThemedText style={{ flex: 1 }}>Current: {currentGuest.name}</ThemedText>
                    <TouchableOpacity
                      style={[
                        styles.unassignButton,
                        {
                          borderColor: theme.danger,
                          backgroundColor: theme.danger + "22",
                        },
                      ]}
                      disabled={pending}
                      onPress={() => handleRemoveGuest(currentGroup.id, activeSlot.slotIndex)}>
                      <ThemedText style={{ color: theme.danger }}>Unassign</ThemedText>
                    </TouchableOpacity>
                  </View>
                );
              })()}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    gap: 16,
  },
  headerIcon: {
    position: "absolute",
    bottom: -60,
    right: -40,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 16,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  groupList: {
    gap: 16,
  },
  groupCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupNameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  slot: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  slotGuest: {
    fontSize: 16,
    textAlign: "center",
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  progressText: {
    fontSize: 20,
    fontWeight: "700",
  },
  progressLabel: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  stateContainer: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  emptyStateText: {
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  guestOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  guestOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guestBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentOccupantBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    gap: 12,
  },
  unassignButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 4,
  },
});
