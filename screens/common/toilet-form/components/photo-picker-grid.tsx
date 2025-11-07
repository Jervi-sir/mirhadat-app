// components/photo-picker-grid.tsx
import React from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useToiletForm } from "../toilet-form-context";
import { PinIcon, LucideTrash2 } from "lucide-react-native";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

export type PhotoItem =
  | { kind: "local"; localUri: string; is_cover?: boolean }
  | { kind: "remote"; url: string; is_cover?: boolean };

export default function PhotoPickerGrid({
  value,
  onChange,
  max = 10,
}: {
  value: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  max?: number;
}) {
  const { uploading, uploadProgress } = useToiletForm();

  const ensureSingleCover = (arr: PhotoItem[]) => {
    const hasCover = arr.some((p) => p.is_cover);
    if (!hasCover && arr.length) arr[0].is_cover = true;
    return arr;
  };

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }
    const remaining = Math.max(0, max - value.length);
    if (remaining === 0) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: remaining,
    });
    if (res.canceled) return;

    const locals: PhotoItem[] = (res.assets ?? []).slice(0, remaining).map((a, idx) => ({
      kind: "local",
      localUri: a.uri,
      is_cover: value.length === 0 && idx === 0 ? true : false,
    }));

    const next = ensureSingleCover([...value, ...locals]);
    onChange(next);
  };

  const toggleCover = (index: number) => {
    const next = value.map((p, i) => ({ ...p, is_cover: i === index }));
    onChange(next);
  };

  const confirmRemove = (index: number) => {
    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const next = value.filter((_, i) => i !== index);
          onChange(ensureSingleCover(next));
        },
      },
    ]);
  };

  const canAdd = value.length < max;

  return (
    <View>
      <View style={{ gap: S.sm }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "800", color: T.text.strong as string }}>Photos</Text>
          <Text style={{ color: T.text.tertiary as string }}>
            {value.length}/{max}
          </Text>
        </View>

        <FlatList
          data={[...value, ...(canAdd ? ([{ kind: "add" }] as any) : [])]}
          keyExtractor={(_, i) => String(i)}
          numColumns={3}
          columnWrapperStyle={{ gap: S.sm }}
          contentContainerStyle={{ gap: S.sm }}
          renderItem={({ item, index }) => {
            if ((item as any).kind === "add") {
              return (
                <Pressable
                  onPress={pick}
                  disabled={uploading}
                  android_ripple={{ color: withAlpha("#000", 0.06) }}
                  style={({ pressed }) => [
                    {
                      width: 100,
                      height: 100,
                      borderWidth: 1,
                      borderColor: T.border.subtle as string,
                      borderRadius: R.xl,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: T.bg.surface as string,
                      ...shadow(0),
                    },
                    pressableStyles(pressed),
                  ]}
                >
                  {uploading ? (
                    <ActivityIndicator color={T.colors.primary as string} />
                  ) : (
                    <>
                      <Text style={{ fontSize: 28, color: T.text.strong as string }}>＋</Text>
                      <Text style={{ fontSize: 12, color: T.text.tertiary as string, marginTop: 4 }}>Add</Text>
                    </>
                  )}
                </Pressable>
              );
            }

            const isCover = !!item.is_cover;
            const uri = item.kind === "local" ? item.localUri : item.url;

            return (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: R.xl,
                  overflow: "hidden",
                  position: "relative",
                  backgroundColor: T.bg.surface as string,
                  borderWidth: 1,
                  borderColor: T.border.subtle as string,
                  ...shadow(0),
                }}
              >
                <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />

                {/* Bottom overlay controls */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: withAlpha("#000", 0.45),
                    flexDirection: "row",
                  }}
                >
                  <Pressable
                    onPress={() => toggleCover(index)}
                    android_ripple={{ color: withAlpha("#fff", 0.15) }}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        alignItems: "center",
                        paddingVertical: 8,
                        opacity: isCover ? 1 : 0.9,
                      },
                      pressableStyles(pressed),
                    ]}
                  >
                    <PinIcon size={16} color={isCover ? "#ffcc00" : "#fff"} />
                  </Pressable>

                  <Pressable
                    onPress={() => confirmRemove(index)}
                    android_ripple={{ color: withAlpha("#fff", 0.15) }}
                    style={({ pressed }) => [
                      { flex: 1, alignItems: "center", paddingVertical: 8 },
                      pressableStyles(pressed),
                    ]}
                  >
                    <LucideTrash2 size={16} color={"#fff"} />
                  </Pressable>
                </View>

                {/* Uploading block */}
                {uploading && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: withAlpha("#fff", 0.4),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ActivityIndicator color={T.colors.primary as string} />
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>

      {uploading ? (
        <Text style={{ textAlign: "center", color: T.text.tertiary as string, marginTop: S.xs }}>
          Uploading {uploadProgress.done}/{uploadProgress.total}…
        </Text>
      ) : null}
    </View>
  );
}
