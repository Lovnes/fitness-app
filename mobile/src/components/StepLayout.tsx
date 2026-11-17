import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { colors } from '../theme';
import { StepHeader } from './chrome';
import { Button, Screen, T } from './ui';

export const TOTAL_STEPS = 7;

/** Shared frame for every assessment step: header + progress, question, content, continue button. */
export function StepLayout({
  step, title, subtitle, children, onNext, nextLabel = 'Continue', nextDisabled, onDark = false, scroll = false,
}: {
  step: number; title: string; subtitle?: string; children: ReactNode; onNext: () => void;
  nextLabel?: string; nextDisabled?: boolean; onDark?: boolean; scroll?: boolean;
}) {
  const fg = onDark ? colors.white : colors.ink;
  const body = (
    <>
      <T v="h1" style={{ color: fg, textAlign: 'center', marginTop: 28, paddingHorizontal: 24 }}>{title}</T>
      {subtitle ? (
        <T v="caption" style={{ color: onDark ? 'rgba(255,255,255,0.8)' : colors.gray, textAlign: 'center', marginTop: 8, paddingHorizontal: 32, fontSize: 14 }}>
          {subtitle}
        </T>
      ) : null}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>{children}</View>
    </>
  );
  return (
    <Screen bg={onDark ? colors.orange : colors.white} edges={['top', 'bottom']}>
      <StepHeader step={step} total={TOTAL_STEPS} onDark={onDark} onBack={router.canGoBack() ? () => router.back() : undefined} />
      {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Button label={nextLabel} variant={onDark ? 'light' : 'dark'} onPress={onNext} disabled={nextDisabled} />
      </View>
    </Screen>
  );
}
