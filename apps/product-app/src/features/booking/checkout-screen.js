import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

function formatMoney(amountCents, currency) {
  return `${currency} ${(amountCents / 100).toFixed(2)}`;
}

function formatValidUntil(expiresAt) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function OrderSummaryCard({ quote }) {
  const validUntil = formatValidUntil(quote.expiresAt);

  return (
    <View
      style={{
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.card,
        marginBottom: spacing.xl,
      }}
      testID="checkout-order-summary"
    >
      <Text style={{ color: colors.text, fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
        Order Summary
      </Text>

      {quote.lineItems.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}
        >
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodyMd }}>{item.label}</Text>
          <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyMd }}>
            {formatMoney(item.amountCents, quote.currency)}
          </Text>
        </View>
      ))}

      <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.sm }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}>
          Total due
        </Text>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.headlineLg, fontWeight: typography.fontWeight.bold }}>
          {formatMoney(quote.totalCents, quote.currency)}
        </Text>
      </View>

      {validUntil ? (
        <Text style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.fontSize.labelSm }}>
          Valid until {validUntil}
        </Text>
      ) : null}
    </View>
  );
}

function PaymentMethodRow({ method, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={`checkout-payment-method-${method.paymentMethodId}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: radius.lg,
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? colors.secondaryBright : colors.outlineVariant,
          backgroundColor: colors.surface,
          padding: spacing.md,
        }}
      >
        <View>
          <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
            {method.brand === 'visa' ? 'Visa' : method.brand} ending in {method.last4}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>{method.label}</Text>
        </View>
        <Text style={{ fontSize: 18, color: selected ? colors.secondaryBright : colors.outlineVariant }}>
          {selected ? '●' : '○'}
        </Text>
      </View>
    </Pressable>
  );
}

function AddCardRow({ onPress, isAdding }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={isAdding} testID="checkout-add-card">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.outlineVariant,
          padding: spacing.md,
          opacity: isAdding ? 0.6 : 1,
        }}
      >
        <Text style={{ fontSize: 16, color: colors.textMuted }}>＋</Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
          {isAdding ? 'Adding card…' : 'Add new card'}
        </Text>
      </View>
    </Pressable>
  );
}

export function CheckoutScreen({
  requestedService,
  quote,
  paymentMethods,
  selectedPaymentMethodId,
  onSelectPaymentMethod,
  onAddCard,
  isAddingCard = false,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  needsReload = false,
  onRetryAfterReload,
  onBack,
}) {
  const canSubmit = Boolean(selectedPaymentMethodId) && !isSubmitting && !needsReload;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: spacing.container, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="checkout-screen"
    >
      <Pressable accessibilityRole="button" onPress={onBack} testID="checkout-back">
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>← Back</Text>
      </Pressable>

      <Text
        style={{
          marginTop: spacing.md,
          marginBottom: spacing.lg,
          color: colors.text,
          fontSize: typography.fontSize.headlineLg,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        Checkout
      </Text>

      <Text style={{ marginBottom: spacing.lg, color: colors.textMuted, fontSize: typography.fontSize.bodyMd }}>
        {requestedService}
      </Text>

      <OrderSummaryCard quote={quote} />

      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.md,
        }}
      >
        Payment Method
      </Text>

      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        {paymentMethods.map((method) => (
          <PaymentMethodRow
            key={method.paymentMethodId}
            method={method}
            selected={method.paymentMethodId === selectedPaymentMethodId}
            onPress={() => onSelectPaymentMethod(method.paymentMethodId)}
          />
        ))}
        <AddCardRow onPress={onAddCard} isAdding={isAddingCard} />
      </View>

      {needsReload ? (
        <View
          style={{
            borderRadius: radius.lg,
            padding: spacing.md,
            backgroundColor: 'rgba(255, 138, 0, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255, 138, 0, 0.3)',
            marginBottom: spacing.lg,
          }}
          testID="checkout-needs-reload"
        >
          <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, marginBottom: spacing.sm }}>
            This total may be out of date. Get an updated total before paying.
          </Text>
          <Pressable accessibilityRole="button" onPress={onRetryAfterReload} testID="checkout-get-updated-total">
            <Text style={{ color: colors.cta, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              Get updated total
            </Text>
          </Pressable>
        </View>
      ) : null}

      {errorMessage ? (
        <View
          style={{
            borderRadius: radius.lg,
            padding: spacing.md,
            backgroundColor: 'rgba(186, 26, 26, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(186, 26, 26, 0.2)',
            marginBottom: spacing.lg,
          }}
          testID="checkout-error"
        >
          <Text style={{ color: colors.error, fontSize: typography.fontSize.bodySm }}>{errorMessage}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        disabled={!canSubmit}
        onPress={onSubmit}
        testID="checkout-pay-securely"
      >
        <View style={{ ...componentStyles.button.primary, opacity: canSubmit ? 1 : 0.5 }}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              Pay Securely {formatMoney(quote.totalCents, quote.currency)}
            </Text>
          )}
        </View>
      </Pressable>

      <Text style={{ marginTop: spacing.sm, textAlign: 'center', color: colors.textMuted, fontSize: typography.fontSize.labelSm }}>
        By tapping "Pay Securely", you agree to our Terms of Service
      </Text>
    </ScrollView>
  );
}

export default CheckoutScreen;
