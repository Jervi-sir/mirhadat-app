// components/photo-picker-grid.tsx
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useToiletForm } from "../toilet-form-context";
import { PinIcon, LucideTrash2 } from "lucide-react-native";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

export type PhotoItem =
  | { kind: "local"; localUri: string; is_cover?: boolean }
  | { kind: "remote"; url: string; is_cover?: boolean };

type PickedAsset = {
  uri: string;
  width?: number;
  height?: number;
};

const TARGETS = [
  { w: 640, h: 480, ratio: 4 / 3 }, // 480p 4:3
  { w: 480, h: 480, ratio: 1 },     // 480p 1:1
];

function chooseBestTarget(w: number, h: number) {
  const r = w / h;
  let best = TARGETS[0];
  let bestDiff = Math.abs(r - TARGETS[0].ratio);
  for (let i = 1; i < TARGETS.length; i++) {
    const d = Math.abs(r - TARGETS[i].ratio);
    if (d < bestDiff) {
      best = TARGETS[i];
      bestDiff = d;
    }
  }
  return best;
}

function computeCenteredCropRect(srcW: number, srcH: number, targetRatio: number) {
  const srcRatio = srcW / srcH;
  if (srcRatio > targetRatio) {
    // too wide → crop width
    const cropW = Math.round(srcH * targetRatio);
    const x = Math.round((srcW - cropW) / 2);
    return { originX: x, originY: 0, width: cropW, height: srcH };
  } else {
    // too tall → crop height
    const cropH = Math.round(srcW / targetRatio);
    const y = Math.round((srcH - cropH) / 2);
    return { originX: 0, originY: y, width: srcW, height: cropH };
  }
}

async function processAssetTo480p(asset: PickedAsset): Promise<string> {
  // Fallback: if width/height missing, do a no-op resize to read metadata
  let srcW = asset.width ?? 0;
  let srcH = asset.height ?? 0;

  if (!srcW || !srcH) {
    const tmp = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );
    // The returned object includes width/height
    srcW = tmp.width ?? 0;
    srcH = tmp.height ?? 0;
    asset.uri = tmp.uri; // keep latest uri
  }

  if (!srcW || !srcH) {
    // As a last resort, just return original
    return asset.uri;
  }

  const target = chooseBestTarget(srcW, srcH);
  const cropRect = computeCenteredCropRect(srcW, srcH, target.ratio);

  const cropped = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ crop: cropRect }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
  );

  const resized = await ImageManipulator.manipulateAsync(
    cropped.uri,
    [{ resize: { width: target.w, height: target.h } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  return resized.uri;
}

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
  const [processing, setProcessing] = useState(false);

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
      // we will handle cropping/compression ourselves
      quality: 1,
      selectionLimit: remaining,
    });
    if (res.canceled) return;

    try {
      setProcessing(true);

      const assets = (res.assets ?? []).slice(0, remaining) as PickedAsset[];

      // Auto-crop + compress to either 640×480 (4:3) or 480×480 (1:1)
      const processedUris = await Promise.all(
        assets.map((a) => processAssetTo480p({ uri: a.uri, width: a.width, height: a.height }))
      );

      const locals: PhotoItem[] = processedUris.map((uri, idx) => ({
        kind: "local",
        localUri: uri,
        is_cover: value.length === 0 && idx === 0 ? true : false,
      }));

      const next = ensureSingleCover([...value, ...locals]);
      onChange(next);
    } catch (e) {
      console.warn(e);
      Alert.alert("Image processing failed", "Could not process selected photos.");
    } finally {
      setProcessing(false);
    }
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
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
                  disabled={uploading || processing}
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
                  {uploading || processing ? (
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
                      { flex: 1, alignItems: "center", paddingVertical: 8, opacity: isCover ? 1 : 0.9 },
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

                {/* Uploading/processing block */}
                {(uploading || processing) && (
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
