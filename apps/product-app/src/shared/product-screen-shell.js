import { ScrollView, Text, View } from 'react-native';

import { productAppShell } from './app-shell';
import { useResponsiveLayout } from './use-responsive-layout';

const baseContentContainerStyle = {
  flexGrow: 1,
  paddingTop: 28,
  paddingBottom: 40,
};

export function ProductScreenShell({ title = productAppShell.appName, subtitle, children, contentContainerStyle, testID }) {
  const responsive = useResponsiveLayout();
  const responsiveContentStyle = { paddingHorizontal: responsive.gutter };

  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: '#F3F6FB' }}
      contentContainerStyle={
        contentContainerStyle
          ? [baseContentContainerStyle, responsiveContentStyle, contentContainerStyle]
          : [baseContentContainerStyle, responsiveContentStyle]
      }
    >
      <View
        style={{
          width: '100%',
          maxWidth: 980,
          alignSelf: 'center',
          borderRadius: responsive.isPhone ? 16 : 20,
          borderWidth: 1,
          borderColor: '#DBE3EF',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: responsive.panelPadding,
          paddingVertical: responsive.isPhone ? 16 : 18,
          shadowColor: '#0F172A',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <Text style={{ fontSize: responsive.shellTitleFontSize, fontWeight: '700', color: productAppShell.theme.color.primary }}>{title}</Text>
        {subtitle ? <Text style={{ marginTop: 8, color: '#334155', fontSize: 15, lineHeight: 22 }}>{subtitle}</Text> : null}
        <View style={{ marginTop: 14 }}>{children}</View>
      </View>
    </ScrollView>
  );
}
