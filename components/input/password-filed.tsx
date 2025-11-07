import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { theme, S, T } from "@/ui/theme";

export const PasswordField = ({
  label = "Password",
  value,
  onChangeText,
  onSubmitEditing,
  inputStyle,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  onSubmitEditing?: () => void;
  inputStyle: () => any;
}) => {
  const [show, setShow] = useState(false);

  return (
    <View style={{ gap: S.sm }}>
      <Text style={{ ...T.label, color: theme.text.strong }}>{label}</Text>

      <View
        style={[
          inputStyle(),
          {
            flexDirection: "row",
            alignItems: "center",
            paddingRight: 10,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          placeholder=""
          placeholderTextColor={theme.text.tertiary}
          style={{ flex: 1, color: theme.text.default }}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
        />

        <TouchableOpacity
          onPress={() => setShow((v) => !v)}
          activeOpacity={0.7}
          style={{  }}
        >
          {show ? (
            <EyeOff size={18} color={theme.text.secondary as string} />
          ) : (
            <Eye size={18} color={theme.text.secondary as string} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
