// ui/Divider.tsx
import React from "react";
import { View } from "react-native";
import { theme } from "./theme";

export const Divider = ({ inset = 0 }: { inset?: number }) => (
  <View style={{ height: 1, backgroundColor: theme.border.subtle, marginLeft: inset }} />
);
