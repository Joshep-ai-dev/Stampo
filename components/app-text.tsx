import {
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";

/**
 * Kroo uses a fixed editorial type scale so Android display and font settings
 * do not rearrange screen layouts. Pass allowFontScaling explicitly to opt in
 * for content that should follow the operating-system preference.
 */
export function Text({ allowFontScaling = false, ...props }: TextProps) {
  return <NativeText allowFontScaling={allowFontScaling} {...props} />;
}

export function TextInput({
  allowFontScaling = false,
  ...props
}: TextInputProps) {
  return <NativeTextInput allowFontScaling={allowFontScaling} {...props} />;
}
