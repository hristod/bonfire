import { config as defaultConfig } from '@gluestack-ui/config';

// Extend the default gluestack config with custom tokens
export const config = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Add any custom colors here if needed
      // For now, we use defaults and override inline where needed (e.g., black for Apple button)
    },
  },
} as const;
