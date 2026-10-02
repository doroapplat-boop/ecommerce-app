import { Text, TextInput, Platform } from "react-native";

export const FONTS = {
    regular: "NotoSansEthiopic_400Regular",
    medium: "NotoSansEthiopic_500Medium",
    semiBold: "NotoSansEthiopic_600SemiBold",
    bold: "NotoSansEthiopic_700Bold",
} as const;

/** Apply Amharic-friendly font to all Text / TextInput by default */
export function applyAmharicDefaultFont() {
    const baseStyle = { fontFamily: FONTS.regular };

    const textComponent = Text as any;
    textComponent.defaultProps = textComponent.defaultProps || {};
    textComponent.defaultProps.style = [
        baseStyle,
        textComponent.defaultProps.style,
    ];

    const inputComponent = TextInput as any;
    inputComponent.defaultProps = inputComponent.defaultProps || {};
    inputComponent.defaultProps.style = [
        baseStyle,
        inputComponent.defaultProps.style,
    ];

    // Better Amharic rendering on Android
    if (Platform.OS === "android") {
        inputComponent.defaultProps.style = [
            baseStyle,
            { includeFontPadding: false, textAlignVertical: "center" },
            inputComponent.defaultProps.style,
        ];
    }
}
