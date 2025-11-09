import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {profile?.nickname}!</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(app)/profile')}
      >
        <Text style={styles.buttonText}>View Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.signOutButton]}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginTop: 10,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
