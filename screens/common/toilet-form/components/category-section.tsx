// components/CategorySection.tsx
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import ActionSheet, { ActionSheetRef, FlatList as SheetFlatList } from "react-native-actions-sheet";
import { useToiletForm } from "../toilet-form-context";

export const CategorySection: React.FC = () => {
  const sheetRef = useRef<ActionSheetRef>(null);
  const {
    taxLoading, taxErr,
    categories, categoryId, setCategoryId
  } = useToiletForm();

  const [q, setQ] = useState("");

  const selected = useMemo(
    () => categories.find(c => c.id === categoryId),
    [categories, categoryId]
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return categories;
    const needle = q.trim().toLowerCase();
    return categories.filter(c =>
      (c.label || "").toLowerCase().includes(needle) ||
      (c.code || "").toLowerCase().includes(needle)
    );
  }, [q, categories]);

  const open = () => sheetRef.current?.show();
  const close = () => sheetRef.current?.hide();

  return (
    <>
      {/* Trigger row */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ marginBottom: 6, fontWeight: "600" }}>Category</Text>
        <Pressable
          onPress={open}
          style={{
            borderWidth: 1, borderColor: "#ddd", borderRadius: 12,
            paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#fff",
            flexDirection: "row", alignItems: "center", justifyContent: "space-between"
          }}
        >
          <Text style={{ color: selected ? "#111" : "#888" }}>
            {selected ? selected.label : "Choose a category"}
          </Text>
          <Text style={{ color: "#888" }}>▾</Text>
        </Pressable>
      </View>

      {/* Sheet */}
      <ActionSheet
        ref={sheetRef}
        gestureEnabled
        closeOnTouchBackdrop
        defaultOverlayOpacity={0.3}
        containerStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#fff" }}
        indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
        safeAreaInsets={{ top: 0, left: 0, right: 0, bottom: 0 }}
        keyboardHandlerEnabled
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Select a category</Text>
        </View>

        {taxLoading ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: "#666" }}>Loading…</Text>
          </View>
        ) : taxErr ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: "red" }}>Failed to load taxonomy.</Text>
          </View>
        ) : (
          <SheetFlatList
            data={filtered}
            keyExtractor={(c) => String(c.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ padding: 16 }}>
                <Text style={{ color: "#666" }}>No categories.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const active = categoryId === item.id;
              return (
                <Pressable
                  onPress={() => {
                    setCategoryId(item.id);
                    close();
                  }}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 14,
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    borderBottomWidth: 1, borderBottomColor: "#f2f2f2"
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    {/* optional icon circle */}
                    {!!item.icon && (
                      <View style={{
                        width: 28, height: 28, borderRadius: 14, backgroundColor: "#f5f5f5",
                        alignItems: "center", justifyContent: "center"
                      }}>
                        <Text style={{ fontSize: 12 }}>{item.icon}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={{ fontWeight: "600" }}>{item.label}</Text>
                      <Text style={{ color: "#8a8a8a", fontSize: 12 }}>/{item.code}</Text>
                    </View>
                  </View>
                  <Text style={{ color: active ? "#111" : "#d1d5db" }}>
                    {active ? "●" : "○"}
                  </Text>
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}
      </ActionSheet>
    </>
  );
};
