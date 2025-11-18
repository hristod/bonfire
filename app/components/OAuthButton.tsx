import React from 'react';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
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
      variant={isApple ? 'solid' : 'outline'}
      className={isApple ? 'bg-black mb-2.5' : 'mb-2.5'}
      isDisabled={loading}
      onPress={onPress}
    >
      {loading ? (
        <ButtonSpinner />
      ) : (
        <ButtonText>{buttonText}</ButtonText>
      )}
    </Button>
  );
}
