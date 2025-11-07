import React from 'react';
import { Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { DAYS, isValidHHMM, useToiletForm } from '../toilet-form-context';
import { theme as T, S, R, withAlpha } from '@/ui/theme';

export const OpenHoursSection = () => {
  const { oh, setOh } = useToiletForm();

  // ---------- helpers ----------
  const hhmmToMinutes = (v: string) => {
    if (!isValidHHMM(v)) return null;
    const [h, m] = v.split(':').map(Number);
    return h * 60 + m;
  };
  const rangeOrderValid = (opens?: string, closes?: string) => {
    const a = hhmmToMinutes(opens ?? '');
    const b = hhmmToMinutes(closes ?? '');
    if (a == null || b == null) return true;
    return a < b;
  };
  const rangesNonOverlapping = (r1: {opens: string; closes: string}, r2: {opens: string; closes: string}) => {
    const a1 = hhmmToMinutes(r1.opens);
    const b1 = hhmmToMinutes(r1.closes);
    const a2 = hhmmToMinutes(r2.opens);
    const b2 = hhmmToMinutes(r2.closes);
    if ([a1,b1,a2,b2].some(v => v == null)) return true;
    return a1! < b1! && a2! < b2! && b1! <= a2!;
  };

  const setRangeField =
    (dayIdx: number, rangeIdx: number, field: 'opens' | 'closes') =>
    (txt: string, finalize = false) => {
      setOh(prev => {
        const copy: typeof prev = { ...prev };
        const ranges = copy[dayIdx].ranges.slice();
        const current = ranges[rangeIdx];
        const nextVal = finalize ? finalizeHHMM(txt) : formatHHMMInput(txt);
        ranges[rangeIdx] = { ...current, [field]: nextVal };
        copy[dayIdx] = { ...copy[dayIdx], ranges };
        return copy;
      });
    };

  return (
    <View style={{ marginTop: S.xs }}>
      <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: S.xs, color: T.text.strong }}>Open hours</Text>

      {DAYS.map(d => {
        const day = oh[d.idx];

        const hasTwo = day.ranges.length === 2;
        const crossOk = hasTwo ? rangesNonOverlapping(day.ranges[0], day.ranges[1]) : true;

        return (
          <View
            key={d.idx}
            style={{
              borderWidth: 1,
              borderColor: T.border.subtle as string,
              borderRadius: R.lg,
              padding: S.md,
              marginBottom: S.sm,
              backgroundColor: T.bg.surface as string,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700', color: T.text.strong as string }}>{d.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs }}>
                <Text style={{ color: T.text.default as string }}>{day.open ? 'Open' : 'Closed'}</Text>
                <Switch
                  value={day.open}
                  onValueChange={v => {
                    setOh(prev => ({ ...prev, [d.idx]: { ...prev[d.idx], open: v } }));
                  }}
                  trackColor={{ false: '#D1D5DB', true: T.colors.primary as string }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
            </View>

            {day.open ? (
              <View style={{ marginTop: S.sm, gap: S.sm }}>
                {day.ranges.map((r, i) => {
                  const setOpens = setRangeField(d.idx, i, 'opens');
                  const setCloses = setRangeField(d.idx, i, 'closes');

                  const orderOk = rangeOrderValid(r.opens, r.closes);
                  const opensBorder =
                    (isValidHHMM(r.opens) || !r.opens) && orderOk ? (T.border.subtle as string) : (T.colors.error as string);
                  const closesBorder =
                    (isValidHHMM(r.closes) || !r.closes) && orderOk ? (T.border.subtle as string) : (T.colors.error as string);

                  return (
                    <View key={i} style={{ gap: S.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ marginBottom: 6, color: T.text.strong as string, fontWeight: '700' }}>
                            Opens (HH:MM)
                          </Text>
                          <TextInput
                            value={r.opens}
                            onChangeText={txt => setOpens(txt)}
                            onBlur={() => setOpens(r.opens, true)}
                            placeholder="09:00"
                            placeholderTextColor={T.text.tertiary as string}
                            keyboardType={Platform.select({ ios: 'number-pad', android: 'numeric' })}
                            maxLength={5}
                            style={{
                              borderWidth: 1,
                              borderColor: opensBorder,
                              borderRadius: R.lg,
                              paddingHorizontal: S.md,
                              paddingVertical: 8,
                              backgroundColor: T.bg.surface as string,
                              color: T.text.default as string,
                            }}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ marginBottom: 6, color: T.text.strong as string, fontWeight: '700' }}>
                            Closes (HH:MM)
                          </Text>
                          <TextInput
                            value={r.closes}
                            onChangeText={txt => setCloses(txt)}
                            onBlur={() => setCloses(r.closes, true)}
                            placeholder="17:00"
                            placeholderTextColor={T.text.tertiary as string}
                            keyboardType={Platform.select({ ios: 'number-pad', android: 'numeric' })}
                            maxLength={5}
                            style={{
                              borderWidth: 1,
                              borderColor: closesBorder,
                              borderRadius: R.lg,
                              paddingHorizontal: S.md,
                              paddingVertical: 8,
                              backgroundColor: T.bg.surface as string,
                              color: T.text.default as string,
                            }}
                          />
                        </View>

                        {day.ranges.length > 1 && (
                          <Pressable
                            onPress={() => {
                              setOh(prev => {
                                const copy = { ...prev };
                                const ranges = copy[d.idx].ranges.slice();
                                ranges.splice(i, 1);
                                if (!ranges.length) ranges.push({ opens: '', closes: '' });
                                copy[d.idx] = { ...copy[d.idx], ranges };
                                return copy;
                              });
                            }}
                            android_ripple={{ color: withAlpha('#000', 0.06) }}
                            style={{
                              paddingHorizontal: S.md,
                              paddingVertical: 8,
                              borderRadius: R.md,
                              borderWidth: 1,
                              borderColor: T.border.subtle as string,
                              backgroundColor: T.bg.surface as string,
                            }}
                          >
                            <Text style={{ color: T.text.strong as string, fontWeight: '700' }}>Remove</Text>
                          </Pressable>
                        )}
                      </View>

                      {!orderOk && (
                        <Text style={{ color: T.colors.error as string, fontSize: 12 }}>
                          Start time must be earlier than end time.
                        </Text>
                      )}
                    </View>
                  );
                })}

                {!crossOk && (
                  <Text style={{ color: T.colors.error as string, fontSize: 12 }}>
                    Slots must not overlap. End of the first slot must be before the start of the second.
                  </Text>
                )}

                {day.ranges.length < 2 && (
                  <Pressable
                    onPress={() => {
                      setOh(prev => {
                        const copy = { ...prev };
                        copy[d.idx] = {
                          ...copy[d.idx],
                          ranges: [...copy[d.idx].ranges, { opens: '', closes: '' }],
                        };
                        return copy;
                      });
                    }}
                    android_ripple={{ color: withAlpha('#000', 0.06) }}
                    style={{
                      marginTop: S.xs,
                      alignSelf: 'flex-start',
                      paddingHorizontal: S.md,
                      paddingVertical: 8,
                      borderRadius: R.md,
                      borderWidth: 1,
                      borderColor: T.border.subtle as string,
                      backgroundColor: T.bg.surface as string,
                    }}
                  >
                    <Text style={{ color: T.text.strong as string, fontWeight: '800' }}>Add slot</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      <Text style={{ color: T.text.tertiary as string, fontSize: 12 }}>
        Tip: use 24-hour format like 08:30 → 20:00. Leave a day closed if not operating.
      </Text>
    </View>
  );
};

/* ------------------------- HH:MM input helpers ------------------------- */
/** Live formatter: 1–2 digits → raw digits; 3–4 digits → auto-colon after 2 digits */
function formatHHMMInput(raw: string): string {
  const digits = (raw || '').replace(/\D+/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** On blur, finalize to a valid HH:MM (pads + clamps). Empty stays empty. */
function finalizeHHMM(v: string): string {
  const digits = (v || '').replace(/\D+/g, '');
  if (!digits) return '';

  let hh = digits.slice(0, 2);
  let mm = digits.slice(2, 4);

  if (hh.length < 2) hh = (hh + '0').slice(0, 2);
  if (mm.length < 2) mm = (mm + '0').slice(0, 2);

  const h = Math.max(0, Math.min(23, parseInt(hh, 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mm, 10) || 0));

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
