// screens/ToiletFormScreen.tsx
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import WilayaPicker from "@/components/filters/wilaya-picker";
import PhotoPickerGrid from "./components/photo-picker-grid";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { ToiletFormProvider, useToiletForm } from "./toilet-form-context";
import { CategorySection } from "./components/category-section";
import { Field } from "./components/wrappers";
import { PhoneInputSection } from "./components/phone-input-section";
import { CoordsSection } from "./components/coords-section";
import { AccessSection } from "./components/access-section";
import { PricingSection } from "./components/pricing-section";
import { AmenitiesSection } from "./components/amenities-section";
import { RulesSection } from "./components/rules-section";
import { OpenHoursSection } from "./components/open-hours-section";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { theme as T, S, R, shadow, withAlpha, pressableStyles } from "@/ui/theme";

/* ---------------- Inner view that consumes the context ---------------- */
const ToiletFormView: React.FC = () => {
  const nav = useNavigation<any>();
  const {
    isEditing,
    wilaya, setWilaya,
    name, setName,
    description, setDescription,
    address, setAddress,
    placeHint, setPlaceHint,
    photos, setPhotos,
    loading, serverErr,
    submit,
  } = useToiletForm();

  const onSubmit = async () => {
    try {
      await submit();
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed");
    }
  };

  return (
    <View style={{ padding: S.lg, gap: S.sm, backgroundColor: T.bg.app }}>
      {/* Photos */}
      <Card>
        <PhotoPickerGrid value={photos} onChange={setPhotos} max={10} />
      </Card>

      <Card>
        {/* Category */}
        <CategorySection />
        <Text style={{ marginBottom: 6, color: T.text.strong, fontWeight: "700" }}>Wilaya</Text>
        {/* Wilaya */}
        <WilayaPicker
          value={wilaya}
          onChangeWilaya={setWilaya}
          includeAll={false}
          lang="fr"
          scope="all"
          status="active"
          triggerStyle={{
            backgroundColor: T.bg.surface,
            paddingHorizontal: S.lg,
            paddingVertical: 10,
            borderRadius: R.lg,
            borderWidth: 1,
            borderColor: T.border.subtle,
            ...shadow(0),
          }}
          triggerTextStyle={{ fontWeight: "800", color: T.text.strong }}
        />
      </Card>

    

      {/* Basic fields */}
      <Card>
        <CoordsSection />
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Address" value={address} onChangeText={setAddress} />
        <Field label="Place hint (optional)" value={placeHint} onChangeText={setPlaceHint} />
        <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline />
      </Card>

      {/* Phones */}
      <Card><PhoneInputSection /></Card>

      {/* Access / capacity / unisex */}
      <Card><AccessSection /></Card>

      {/* Pricing */}
      <Card><PricingSection /></Card>

      {/* Amenities */}
      <Card><AmenitiesSection /></Card>

      {/* Rules */}
      <Card><RulesSection /></Card>

      {/* Open Hours */}
      <Card><OpenHoursSection /></Card>

      {/* Server error */}
      {serverErr ? (
        <View style={{ paddingHorizontal: S.xs }}>
          <Text style={{ color: T.colors.error }}>
            {serverErr?.response?.data?.message || serverErr?.message || "Error"}
          </Text>
        </View>
      ) : null}

      {/* Submit */}
      <Pressable
        onPress={onSubmit}
        disabled={loading}
        android_ripple={{ color: withAlpha("#fff", 0.2) }}
        style={({ pressed }) => [
          {
            backgroundColor: T.colors.primary,
            paddingVertical: 14,
            borderRadius: R.xl,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
            ...shadow(1),
          },
          pressableStyles(pressed),
        ]}
      >
        {loading ? (
          <ActivityIndicator color={T.text.onPrimary as string} />
        ) : (
          <Text style={{ color: T.text.onPrimary, fontWeight: "800" }}>
            {isEditing ? "Save changes" : "Create toilet"}
          </Text>
        )}
      </Pressable>

      <View style={{ height: S.xl }} />
    </View>
  );
};

/* ---------------- Screen wrapper: provides context ---------------- */
export default function ToiletFormScreen() {
  const route = useRoute() as any;
  const toiletId: number | undefined = route?.params?.toiletId;

  return (
    <ScreenWrapper>
      <ToiletFormProvider
        toiletId={toiletId}
        lang="fr"
        onCreated={(id) => console.log("created toilet", id)}
        onUpdated={(id) => console.log("updated toilet", id)}
        onError={(e) => console.warn("form error", e)}
      >
        <Header />
        <FlatList
          data={[0]}
          keyExtractor={() => "form"}
          renderItem={() => <ToiletFormView />}
          contentContainerStyle={{ paddingBottom: S.xl, backgroundColor: T.bg.app }}
        />
      </ToiletFormProvider>
    </ScreenWrapper>
  );
}

/* ---------------- Header ---------------- */
const Header = () => {
  const navigation: any = useNavigation();
  const { toiletId, isEditing, deleteToilet } = useToiletForm();

  const onPressDelete = () => {
    if (!toiletId) return;
    Alert.alert(
      "Delete toilet",
      "This action cannot be undone. Are you sure you want to delete this toilet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteToilet();
            } catch (e: any) {
              Alert.alert("Delete failed", e?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: S.sm,
        paddingHorizontal: S.md,
        paddingVertical: S.sm,
        backgroundColor: T.bg.app,
      }}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
        style={{
          height: 40,
          width: 40,
          borderRadius: 999,
          backgroundColor: T.bg.surface,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: T.border.subtle,
          ...shadow(1),
        }}
      >
        <ArrowLeft color={T.text.strong as string} />
      </TouchableOpacity>

      <Text style={{ fontSize: 20, fontWeight: "800", flex: 1, color: T.text.default }}>
        {toiletId ? "Edit Toilet" : "Create Toilet"}
      </Text>

      {isEditing && (
        <TouchableOpacity onPress={onPressDelete} hitSlop={8} activeOpacity={0.85}>
          <Trash2 color={T.colors.error as string} />
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ---------------- Little Card wrapper ---------------- */
function Card({ children }: React.PropsWithChildren) {
  return (
    <View
      style={{
        backgroundColor: T.bg.surface,
        borderRadius: R.xl,
        padding: S.lg,
        borderWidth: 1,
        borderColor: T.border.subtle,
        ...shadow(1),
      }}
    >
      {children}
    </View>
  );
}
