import { GluestackUIProvider as GluestackUIProviderBase } from '@gluestack-ui/nativewind-utils/provider';
import React from 'react';

export const GluestackUIProvider = ({ children, ...props }: any) => {
  return <GluestackUIProviderBase {...props}>{children}</GluestackUIProviderBase>;
};
