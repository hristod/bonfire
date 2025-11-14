import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface VStackProps extends ViewProps {
  className?: string;
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const spaceMap = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  xl: 'gap-6',
};

export function VStack({ className, space = 'md', children, ...props }: VStackProps) {
  return (
    <View
      className={cn('flex flex-col', space && spaceMap[space], className)}
      {...props}
    >
      {children}
    </View>
  );
}
