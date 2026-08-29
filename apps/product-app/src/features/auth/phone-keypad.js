import { Pressable, Text, View } from 'react-native';

import { radius, spacing, typography } from '@quickwerk/ui';

import { useResponsiveLayout } from '../../shared/use-responsive-layout';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

function KeypadKey({ value, onPress, columnBasis, keyHeight }) {
  if (!value) {
    return <View style={{ height: keyHeight, flexBasis: columnBasis }} />;
  }

  return (
    <Pressable
      accessibilityLabel={value === 'backspace' ? 'Delete digit' : `Digit ${value}`}
      accessibilityRole="button"
      onPress={() => onPress(value)}
      style={{ flexBasis: columnBasis }}
      testID={value === 'backspace' ? 'phone-keypad-backspace' : `phone-keypad-${value}`}
    >
      <View
        style={{
          height: keyHeight,
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
  const responsive = useResponsiveLayout();
  const columnBasis = `${responsive.keypadColumnPercent}%`;
  const keyHeight = responsive.isPhone ? 58 : 64;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: responsive.keypadGap, marginTop: spacing.md }}>
      {KEYS.map((key, index) => (
        <KeypadKey
          columnBasis={columnBasis}
          key={key ? `${key}-${index}` : `blank-${index}`}
          keyHeight={keyHeight}
          onPress={key === 'backspace' ? onBackspace : onDigit}
          value={key}
        />
      ))}
    </View>
  );
}

export default PhoneKeypad;
