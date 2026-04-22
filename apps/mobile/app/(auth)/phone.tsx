import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { sendOtp, verifyOtp } from '@sellr/api-client';
import { useAuthStore } from '../../src/stores/auth';

export default function PhoneScreen() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneE164, setPhoneE164] = useState('+1');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendOtp(phoneE164.trim());
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtp({
        phoneE164: phoneE164.trim(),
        code: code.trim(),
      });
      if (!('accessToken' in res) || !('refreshToken' in res)) {
        throw new Error('Expected token response from API (mobile client)');
      }
      await setTokens(res.accessToken, res.refreshToken, res.userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, justifyContent: 'center', padding: 24 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Sign in</Text>
      <Text style={{ marginTop: 8, color: '#555' }}>
        Enter your phone (E.164, e.g. +15551234567). Without Twilio in dev,
        use code 000000.
      </Text>

      {step === 'phone' ? (
        <>
          <TextInput
            value={phoneE164}
            onChangeText={setPhoneE164}
            keyboardType="phone-pad"
            autoCapitalize="none"
            placeholder="+15551234567"
            style={{
              marginTop: 16,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
            }}
          />
          <Pressable
            onPress={() => void onSendOtp()}
            disabled={loading || phoneE164.length < 8}
            style={{
              marginTop: 16,
              padding: 14,
              backgroundColor: '#18181b',
              borderRadius: 8,
              opacity: loading || phoneE164.length < 8 ? 0.5 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}
              >
                Send code
              </Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ marginTop: 16, color: '#555' }}>Code sent to {phoneE164}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 20,
              letterSpacing: 4,
            }}
          />
          <Pressable
            onPress={() => void onVerify()}
            disabled={loading || code.length !== 6}
            style={{
              marginTop: 16,
              padding: 14,
              backgroundColor: '#18181b',
              borderRadius: 8,
              opacity: loading || code.length !== 6 ? 0.5 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}
              >
                Verify
              </Text>
            )}
          </Pressable>
          <Pressable onPress={() => setStep('phone')} style={{ marginTop: 12 }}>
            <Text style={{ color: '#2563eb', textAlign: 'center' }}>Change number</Text>
          </Pressable>
        </>
      )}

      {error ? (
        <Text style={{ marginTop: 12, color: '#b91c1c' }}>{error}</Text>
      ) : null}

      <Pressable
        onPress={() => void setTokens('dev-token', 'dev-refresh', 'dev-user')}
        style={{ marginTop: 32, padding: 14, borderRadius: 8, borderWidth: 1 }}
      >
        <Text style={{ textAlign: 'center', color: '#666' }}>
          Dev: skip auth (mock tokens — API calls will fail)
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
