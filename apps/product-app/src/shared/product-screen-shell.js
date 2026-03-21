import { ScrollView, Text, View } from 'react-native';

import { productAppShell } from './app-shell';

const baseContentContainerStyle = {
  flexGrow: 1,
  paddingHorizontal: 18,
  paddingTop: 28,
  paddingBottom: 40,
};

export function ProductScreenShell({ title = productAppShell.appName, subtitle, children, contentContainerStyle, testID }) {
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: '#F3F6FB' }}
      contentContainerStyle={contentContainerStyle ? [baseContentContainerStyle, contentContainerStyle] : baseContentContainerStyle}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 980,
          alignSelf: 'center',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#DBE3EF',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 18,
          paddingVertical: 18,
          shadowColor: '#0F172A',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: productAppShell.theme.color.primary }}>{title}</Text>
        {subtitle ? <Text style={{ marginTop: 8, color: '#334155', fontSize: 15, lineHeight: 22 }}>{subtitle}</Text> : null}
        <View style={{ marginTop: 14 }}>{children}</View>
      </View>
    </ScrollView>
  );
}
