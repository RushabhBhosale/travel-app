import React, { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import AuthLayout from "../components/AuthLayout";
import GoogleSignIn from "../components/GoogleSignIn";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import type { ScreenProps } from "../navigation/types";

const clerkMessage = (err: any, fallback: string) =>
  err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || fallback;

const SignInScreen = ({ navigation }: ScreenProps<"SignIn">) => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const onSignIn = async () => {
    if (!isLoaded || loading) return;
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setLoading(true);
    setError("");
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setError("Additional verification is required. Please use Google or reset your password.");
      }
    } catch (err) {
      setError(clerkMessage(err, "Sign in failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue planning your trips.">
      <TextField
        label="Email"
        icon="mail-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        containerClassName="mb-4"
      />
      <TextField
        ref={passwordRef}
        label="Password"
        icon="lock-closed-outline"
        password
        autoComplete="password"
        placeholder="Your password"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={onSignIn}
      />
      {!!error && <Text className="mt-3 text-sm text-red-600">{error}</Text>}

      <Button title="Sign in" size="lg" loading={loading} onPress={onSignIn} className="mt-6" />

      <View className="my-5 flex-row items-center">
        <View className="h-px flex-1 bg-slate-200" />
        <Text className="mx-3 text-xs font-medium text-slate-400">OR</Text>
        <View className="h-px flex-1 bg-slate-200" />
      </View>

      <GoogleSignIn onError={setError} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-slate-500">New here? </Text>
        <Pressable hitSlop={8} onPress={() => navigation.navigate("SignUp")}>
          <Text className="text-sm font-bold text-brand">Create an account</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
};

export default SignInScreen;
