import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { productAppShell } from './app-shell';

const variants = {
  outline: {
    borderColor: productAppShell.theme.color.primary,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: productAppShell.theme.color.primary,
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
          marginTop: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          ...variants[resolvedVariant],
        }}
      >
        <Text
          style={{
            color: isPrimary ? productAppShell.theme.color.surface : productAppShell.theme.color.primary,
            fontSize: 18,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              marginTop: 8,
              color: isPrimary ? productAppShell.theme.color.surface : productAppShell.theme.color.text,
            }}
          >
            {description}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}