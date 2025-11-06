// screens/ToiletListItemExample.tsx
import { Button } from "@/components/button";
import { GeneralInput } from "@/components/general-input";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { ToiletPreviewCard } from "@/components/toilet-preview-card";
import { ScrollView, View } from "react-native";

 const ToiletListItemExample = () => { 
  return (
    <ScreenWrapper>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 }}>
        <GeneralInput 
          value=""
          placeholder="Search"
          onChangeText={() => {}}
          containerStyle={{ flex: 1 }}
        />
        <Button
          label="Search"
          onPress={() => {}}

        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* No item passed => renders a fake example */}
        <ToiletPreviewCard
          onPress={() => console.log("Open details")}
          onToggleFavorite={(next) => console.log("Favorite:", next)}
        />
        <ToiletPreviewCard
          onPress={() => console.log("Open details")}
          onToggleFavorite={(next) => console.log("Favorite:", next)}
        />
        <ToiletPreviewCard
          onPress={() => console.log("Open details")}
          onToggleFavorite={(next) => console.log("Favorite:", next)}
        />

        <View style={{ height: 40 }} />

        {/* Or pass a real ToiletWithRelations */}
        {/* <ToiletPreviewCard item={realItem} onPress={...} onToggleFavorite={...} /> */}
      </ScrollView>
    </ScreenWrapper>
  );
}

export default ToiletListItemExample;