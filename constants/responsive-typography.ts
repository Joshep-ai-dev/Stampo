import { Dimensions } from "react-native";

const REFERENCE_PHONE_WIDTH = 390;
const MINIMUM_FONT_SCALE = 0.82;

/**
 * Keeps the current type scale on standard-width phones and gently reduces it
 * on narrower screens. React Native's accessibility font scaling is applied
 * after this layout-based adjustment.
 */
export function responsiveFontSize(size: number): number {
  const screenWidth = Dimensions.get("window").width;
  const widthScale = Math.min(1, screenWidth / REFERENCE_PHONE_WIDTH);
  const scale = Math.max(MINIMUM_FONT_SCALE, widthScale);

  return Math.round(size * scale * 2) / 2;
}
