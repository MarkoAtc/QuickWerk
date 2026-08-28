import { useWindowDimensions } from 'react-native';

import { resolveResponsiveLayout } from './responsive-layout';

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  return resolveResponsiveLayout(width);
}
