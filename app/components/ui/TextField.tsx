import React, { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";

type Props = TextInputProps & {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  error?: string;
  password?: boolean;
  containerClassName?: string;
};

const TextField = forwardRef<TextInput, Props>(
  ({ label, icon, error, password, containerClassName = "", style, multiline, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);
    return (
      <View className={containerClassName}>
        {label && <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">{label}</Text>}
        <View
          className={`flex-row rounded-2xl border bg-slate-50 px-3.5 ${multiline ? "items-start py-3" : "h-12 items-center"}`}
          style={{ borderColor: error ? colors.danger : focused ? colors.brand : colors.border }}
        >
          {icon && <Ionicons name={icon} size={18} color={focused ? colors.brand : colors.subtle} style={{ marginRight: 8 }} />}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.subtle}
            secureTextEntry={password && hidden}
            multiline={multiline}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            style={[{ flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0 }, multiline && { minHeight: 90, textAlignVertical: "top" }, style]}
            {...rest}
          />
          {password && (
            <Pressable hitSlop={10} onPress={() => setHidden((h) => !h)}>
              <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={19} color={colors.subtle} />
            </Pressable>
          )}
        </View>
        {error ? <Text className="mt-1 text-xs text-red-600">{error}</Text> : null}
      </View>
    );
  }
);

export default TextField;
