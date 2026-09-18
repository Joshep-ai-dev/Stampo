import { Dimensions } from "react-native";

const REFERENCE_PHONE_WIDTH = 430;
const MINIMUM_FONT_SCALE = 0.72;

/**
 * Keeps the designed type scale on standard-width phones and reduces it on
 * narrower logical viewports. Kroo's shared Text and TextInput components
 * prevent the operating system from applying a second font multiplier.
 */
export function responsiveFontSize(size: number): number {
  const screenWidth = Dimensions.get("window").width;
  const widthScale = Math.min(1, screenWidth / REFERENCE_PHONE_WIDTH);
  const scale = Math.max(MINIMUM_FONT_SCALE, widthScale);

  return Math.round(size * scale * 2) / 2;
}
