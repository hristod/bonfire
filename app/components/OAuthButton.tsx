import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Provider } from '@supabase/supabase-js';

interface OAuthButtonProps {
  provider: Provider;
  onPress: () => void;
  loading?: boolean;
}

export default function OAuthButton({ provider, onPress, loading = false }: OAuthButtonProps) {
  const isApple = provider === 'apple';
  const buttonText = isApple ? 'Continue with Apple' : 'Continue with Google';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isApple ? styles.appleButton : styles.googleButton,
        loading && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={isApple ? 'white' : 'black'} />
        ) : (
          <Text style={[styles.buttonText, isApple ? styles.appleText : styles.googleText]}>
            {buttonText}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  appleText: {
    color: '#FFFFFF',
  },
  googleText: {
    color: '#000000',
  },
});
