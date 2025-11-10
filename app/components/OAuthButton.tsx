import React from 'react';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
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
      bg={isApple ? "$black" : undefined}
      isDisabled={loading}
      onPress={onPress}
      mb="$2.5"
    >
      {loading ? (
        <ButtonSpinner color={isApple ? "$white" : "$black"} />
      ) : (
        <ButtonText>{buttonText}</ButtonText>
      )}
    </Button>
  );
}

