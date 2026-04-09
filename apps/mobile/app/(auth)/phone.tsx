import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '../../src/stores/auth';

export default function PhoneScreen() {
  const setTokens = useAuthStore((s) => s.setTokens);

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Sign in</Text>
      <Text style={{ marginTop: 8, color: '#555' }}>
        Phase 0 — wire Twilio OTP here in Phase 1.
      </Text>
      <Pressable
        onPress={() => void setTokens('dev-token', 'dev-refresh', 'dev-user')}
        style={{
          marginTop: 24,
          padding: 14,
          backgroundColor: '#18181b',
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
          Dev: skip auth
        </Text>
      </Pressable>
    </View>
  );
}
