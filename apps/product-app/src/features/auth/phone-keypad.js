import { Pressable, Text, View } from 'react-native';

import { radius, spacing, typography } from '@quickwerk/ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

function KeypadKey({ value, onPress }) {
  if (!value) {
    return <View style={{ height: 64, flexBasis: '30%' }} />;
  }

  return (
    <Pressable
      accessibilityLabel={value === 'backspace' ? 'Delete digit' : `Digit ${value}`}
      accessibilityRole="button"
      onPress={() => onPress(value)}
      style={{ flexBasis: '30%' }}
      testID={value === 'backspace' ? 'phone-keypad-backspace' : `phone-keypad-${value}`}
    >
      <View
        style={{
          height: 64,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: value === 'backspace' ? 20 : typography.fontSize.headlineMd,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          {value === 'backspace' ? '⌫' : value}
        </Text>
      </View>
    </Pressable>
  );
}

export function PhoneKeypad({ onDigit, onBackspace }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
      {KEYS.map((key, index) => (
        <KeypadKey
          key={key ? `${key}-${index}` : `blank-${index}`}
          onPress={key === 'backspace' ? onBackspace : onDigit}
          value={key}
        />
      ))}
    </View>
  );
}

export default PhoneKeypad;
