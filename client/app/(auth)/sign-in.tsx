import { COLORS } from "@/constants";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import { Pressable, TextInput, View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Step = "sign-in" | "forgot" | "reset-code";

export default function Page() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const router = useRouter();

    const [step, setStep] = React.useState<Step>("sign-in");
    const [emailAddress, setEmailAddress] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [code, setCode] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showNewPassword, setShowNewPassword] = React.useState(false);

    const onSignInPress = async () => {
        if (!isLoaded) return;

        if (!emailAddress.trim() || !password) {
            Toast.show({
                type: "error",
                text1: "Missing Fields",
                text2: "Please enter your email and password",
            });
            return;
        }

        setLoading(true);

        try {
            const attempt = await signIn.create({
                identifier: emailAddress.trim(),
                password,
            });

            if (attempt.status === "complete") {
                await setActive({ session: attempt.createdSessionId });
                router.replace("/");
            } else {
                Toast.show({
                    type: "error",
                    text1: "Sign In Incomplete",
                    text2: `Status: ${attempt.status}`,
                });
            }
        } catch (err: any) {
            console.error(err);
            Toast.show({
                type: "error",
                text1: "Sign In Failed",
                text2: err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Wrong email or password",
            });
        } finally {
            setLoading(false);
        }
    };

    const onSendResetCode = async () => {
        if (!isLoaded) return;
        if (!emailAddress.trim()) {
            Toast.show({ type: "error", text1: "Enter your email" });
            return;
        }

        setLoading(true);
        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: emailAddress.trim(),
            });
            setStep("reset-code");
            Toast.show({
                type: "success",
                text1: "Code Sent",
                text2: "Check your email for the reset code",
            });
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: "Reset Failed",
                text2: err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Could not send reset code",
            });
        } finally {
            setLoading(false);
        }
    };

    const onResetPassword = async () => {
        if (!isLoaded) return;
        if (!code.trim() || !newPassword) {
            Toast.show({
                type: "error",
                text1: "Missing Fields",
                text2: "Enter the code and a new password",
            });
            return;
        }

        setLoading(true);
        try {
            const result = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code: code.trim(),
                password: newPassword,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                Toast.show({ type: "success", text1: "Password Updated" });
                router.replace("/");
            } else if (result.status === "needs_second_factor") {
                Toast.show({
                    type: "error",
                    text1: "Extra verification needed",
                    text2: "Complete verification in Clerk dashboard if required",
                });
            } else {
                setPassword("");
                setStep("sign-in");
                Toast.show({
                    type: "success",
                    text1: "Password Reset",
                    text2: "Sign in with your new password",
                });
            }
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: "Reset Failed",
                text2: err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid code or password",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" style={{ padding: 28 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                    onPress={() => {
                        if (step !== "sign-in") {
                            setStep("sign-in");
                            setCode("");
                            setNewPassword("");
                        } else {
                            router.push("/");
                        }
                    }}
                    className="absolute top-0 left-0 z-10"
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>

                {step === "sign-in" && (
                    <>
                        <View className="items-center mb-8">
                            <Text className="text-3xl font-bold text-primary mb-2">Welcome Back</Text>
                            <Text className="text-secondary">Sign in with your email</Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-primary font-medium mb-2">Email</Text>
                            <TextInput
                                className="w-full bg-surface p-4 rounded-xl text-primary"
                                placeholder="you@example.com"
                                placeholderTextColor="#999"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={emailAddress}
                                onChangeText={setEmailAddress}
                            />
                        </View>

                        <View className="mb-2">
                            <Text className="text-primary font-medium mb-2">Password</Text>
                            <View className="flex-row items-center bg-surface rounded-xl overflow-hidden">
                                <TextInput
                                    className="flex-1 p-4 text-primary"
                                    placeholder="••••••••"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="px-4">
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.secondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity onPress={() => setStep("forgot")} className="mb-6 self-end">
                            <Text className="text-primary font-medium">Forgot password?</Text>
                        </TouchableOpacity>

                        <Pressable
                            className={`w-full py-4 rounded-full items-center mb-10 ${loading || !emailAddress || !password ? "bg-gray-300" : "bg-primary"}`}
                            onPress={onSignInPress}
                            disabled={loading || !emailAddress || !password}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Sign In</Text>}
                        </Pressable>

                        <View className="flex-row justify-center">
                            <Text className="text-secondary">Don&apos;t have an account? </Text>
                            <Link href="/sign-up">
                                <Text className="text-primary font-bold">Sign up</Text>
                            </Link>
                        </View>
                    </>
                )}

                {step === "forgot" && (
                    <>
                        <View className="items-center mb-8">
                            <Text className="text-3xl font-bold text-primary mb-2">Reset Password</Text>
                            <Text className="text-secondary text-center">We will send a code to your email</Text>
                        </View>

                        <View className="mb-6">
                            <Text className="text-primary font-medium mb-2">Admin / Account Email</Text>
                            <TextInput
                                className="w-full bg-surface p-4 rounded-xl text-primary"
                                placeholder="you@example.com"
                                placeholderTextColor="#999"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={emailAddress}
                                onChangeText={setEmailAddress}
                            />
                        </View>

                        <Pressable
                            className={`w-full py-4 rounded-full items-center mb-4 ${loading || !emailAddress ? "bg-gray-300" : "bg-primary"}`}
                            onPress={onSendResetCode}
                            disabled={loading || !emailAddress}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Send Code</Text>}
                        </Pressable>
                    </>
                )}

                {step === "reset-code" && (
                    <>
                        <View className="items-center mb-8">
                            <Text className="text-3xl font-bold text-primary mb-2">New Password</Text>
                            <Text className="text-secondary text-center">Enter the email code and your new password</Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-primary font-medium mb-2">Reset Code</Text>
                            <TextInput
                                className="w-full bg-surface p-4 rounded-xl text-primary"
                                placeholder="123456"
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                value={code}
                                onChangeText={setCode}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-primary font-medium mb-2">New Password</Text>
                            <View className="flex-row items-center bg-surface rounded-xl overflow-hidden">
                                <TextInput
                                    className="flex-1 p-4 text-primary"
                                    placeholder="New password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} className="px-4">
                                    <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.secondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Pressable
                            className={`w-full py-4 rounded-full items-center mb-4 ${loading || !code || !newPassword ? "bg-gray-300" : "bg-primary"}`}
                            onPress={onResetPassword}
                            disabled={loading || !code || !newPassword}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Update Password</Text>}
                        </Pressable>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
