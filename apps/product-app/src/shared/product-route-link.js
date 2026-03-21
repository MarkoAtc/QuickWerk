import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { productAppShell } from './app-shell';

const variants = {
  outline: {
    borderColor: '#9CB3D8',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  primary: {
    backgroundColor: productAppShell.theme.color.primary,
    borderWidth: 1,
    borderColor: productAppShell.theme.color.primary,
  },
};

export function ProductRouteLink({ accessibilityHint, accessibilityLabel, description, href, testID, title, variant = 'primary' }) {
  const resolvedVariant = variant === 'outline' ? 'outline' : 'primary';
  const isPrimary = resolvedVariant === 'primary';

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityHint={accessibilityHint ?? description}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        testID={testID}
        style={{
          marginTop: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          ...variants[resolvedVariant],
        }}
      >
        <Text
          style={{
            color: isPrimary ? '#FFFFFF' : '#12305C',
            fontSize: 16,
            fontWeight: '700',
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              marginTop: 6,
              color: isPrimary ? '#E7EEFF' : '#334155',
              lineHeight: 20,
            }}
          >
            {description}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}
