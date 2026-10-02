/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all files that contain Nativewind classes.
    content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#1E40AF",
                secondary: "#64748B",
                background: "#FFFFFF",
                surface: "#F1F5F9",
                accent: "#3B82F6",
                border: "#E2E8F0",
            },
            fontFamily: {
                sans: ["NotoSansEthiopic_400Regular"],
                medium: ["NotoSansEthiopic_500Medium"],
                semibold: ["NotoSansEthiopic_600SemiBold"],
                bold: ["NotoSansEthiopic_700Bold"],
            },
        },
    },
    plugins: [],
};
