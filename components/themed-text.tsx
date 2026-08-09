import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: 'Lora_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontFamily: 'Lora_700Bold',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    fontFamily: 'Lora_500Medium',
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
