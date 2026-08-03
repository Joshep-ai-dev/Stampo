import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GlobeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Ionicons name="globe-outline" size={92} color="#c7a56e" />
        <Text style={styles.title}>Your world awaits</Text>
        <Text style={styles.subtitle}>The globe view is coming next.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4ecdc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: '#2b211a' },
  subtitle: { fontFamily: 'CormorantGaramond_400Regular', fontSize: 16, color: '#8f745d' },
});
