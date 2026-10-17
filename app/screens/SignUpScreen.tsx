import React, { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import AuthLayout from "../components/AuthLayout";
import GoogleSignIn from "../components/GoogleSignIn";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { toast } from "../components/ui/Toast";
import type { ScreenProps } from "../navigation/types";

const clerkMessage = (err: any, fallback: string) =>
  err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || fallback;

const SignUpScreen = ({ navigation }: ScreenProps<"SignUp">) => {
  const { isLoaded, setActive, signUp } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const onSignUp = async () => {
    if (!isLoaded || loading) return;
    if (!email.trim() || !password) return setError("Enter an email and a password.");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setLoading(true);
    setError("");
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPending(true);
    } catch (err) {
      setError(clerkMessage(err, "Sign up failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setError("Verification isn't complete yet. Please try again.");
      }
    } catch (err) {
      setError(clerkMessage(err, "That code didn't work. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
      toast.success("A new code is on its way");
    } catch (err) {
      setError(clerkMessage(err, "Couldn't resend the code."));
    }
  };

  if (pending) {
    return (
      <AuthLayout title="Check your inbox" subtitle={`Enter the 6-digit code we sent to ${email.trim()}.`} image="havelock">
        <TextField
          label="Verification code"
          icon="key-outline"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          onSubmitEditing={onVerify}
          style={{ letterSpacing: 6, fontSize: 18 }}
        />
        {!!error && <Text className="mt-3 text-sm text-red-600">{error}</Text>}
        <Button title="Verify & continue" size="lg" loading={loading} onPress={onVerify} disabled={code.trim().length < 6} className="mt-6" />
        <View className="mt-5 flex-row justify-center">
          <Pressable hitSlop={8} onPress={resend}>
            <Text className="text-sm font-semibold text-brand">Resend code</Text>
          </Pressable>
          <Text className="mx-3 text-slate-300">|</Text>
          <Pressable hitSlop={8} onPress={() => setPending(false)}>
            <Text className="text-sm font-semibold text-slate-600">Change email</Text>
          </Pressable>
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start planning your next adventure in seconds." image="leh">
      <TextField
        ref={emailRef}
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
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={onSignUp}
      />
      {!!error && <Text className="mt-3 text-sm text-red-600">{error}</Text>}

      <Button title="Create account" size="lg" loading={loading} onPress={onSignUp} className="mt-6" />

      <View className="my-5 flex-row items-center">
        <View className="h-px flex-1 bg-slate-200" />
        <Text className="mx-3 text-xs font-medium text-slate-400">OR</Text>
        <View className="h-px flex-1 bg-slate-200" />
      </View>
      <GoogleSignIn onError={setError} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-slate-500">Already have an account? </Text>
        <Pressable hitSlop={8} onPress={() => navigation.goBack()}>
          <Text className="text-sm font-bold text-brand">Sign in</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
};

export default SignUpScreen;
