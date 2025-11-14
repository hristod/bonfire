import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
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
    <Button
      variant={isApple ? "solid" : "outline"}
      className={isApple ? "bg-black active:bg-gray-900" : "border-typography-300 active:bg-gray-50"}
      disabled={loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isApple ? "white" : "black"} />
      ) : (
        <ButtonText className={isApple ? "text-white" : "text-black"}>
          {buttonText}
        </ButtonText>
      )}
    </Button>
  );
}

