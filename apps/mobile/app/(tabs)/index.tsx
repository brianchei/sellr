import { View, Text } from 'react-native';

export default function HomeTab() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Feed</Text>
      <Text style={{ marginTop: 8, color: '#555' }}>
        Phase 0 scaffold — listings will appear here.
      </Text>
    </View>
  );
}
