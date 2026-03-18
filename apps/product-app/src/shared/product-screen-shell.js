import { ScrollView, Text, View } from 'react-native';

import { productAppShell } from './app-shell';

const baseContentContainerStyle = {
  flexGrow: 1,
  padding: 24,
  paddingTop: 72,
  paddingBottom: 48,
};

export function ProductScreenShell({ title = productAppShell.appName, subtitle, children, contentContainerStyle, testID }) {
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: productAppShell.theme.color.surface }}
      contentContainerStyle={contentContainerStyle ? [baseContentContainerStyle, contentContainerStyle] : baseContentContainerStyle}
    >
      <Text style={{ fontSize: 24, fontWeight: '600', color: productAppShell.theme.color.primary }}>{title}</Text>
      {subtitle ? <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>{subtitle}</Text> : null}
      <View style={{ marginTop: subtitle ? 8 : 16 }}>{children}</View>
    </ScrollView>
  );
}