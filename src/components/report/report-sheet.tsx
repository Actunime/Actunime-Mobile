import type { ITargetPath } from '@actunime/types';
import { ReportCreateBodyZOD } from '@actunime/validations';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/form-fields';
import { StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api } from '@/lib/api';

interface IReportSheetProps {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetType: ITargetPath;
  targetName?: string;
}

/** Signalement d'une fiche ou d'un membre (`ReportFormDialog` du site) : un motif, une description, envoyé à la modération. */
export function ReportSheet({ open, onClose, targetId, targetType, targetName }: Readonly<IReportSheetProps>) {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const subjects = useQuery({
    queryKey: ['report-subjects', targetType === 'Member' ? 'member' : 'media'],
    queryFn: () => api.getReportSubjects(targetType === 'Member' ? 'member' : 'media'),
    enabled: open,
    staleTime: 30 * 60_000,
  });
  const send = useMutation({ mutationFn: () => api.sendReport({ targetId, targetType, subjectId: subjectId as number, description }) });

  // Le formulaire repart à zéro à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setSubjectId(null);
    setDescription('');
    setProblem(null);
    send.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- `send` change à chaque rendu

  const submit = () => {
    const parsed = ReportCreateBodyZOD.safeParse({ targetId, targetType, subjectId: subjectId ?? 0, description });
    if (!parsed.success) {
      setProblem(parsed.error.issues[0]?.message ?? 'Signalement invalide');
      return;
    }
    setProblem(null);
    send.mutate();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={targetName ? `Signaler « ${targetName} »` : 'Signaler'}>
      <View style={styles.stack}>
        {send.isSuccess ? (
          <>
            <StatusNote tone="success">Signalement envoyé. Merci : la modération va l’examiner.</StatusNote>
            <Button label="Fermer" onPress={onClose} />
          </>
        ) : subjects.isPending ? (
          <Loading />
        ) : subjects.isError ? (
          <ErrorState error={subjects.error} onRetry={() => void subjects.refetch()} />
        ) : (
          <>
            <Field label="Motif">
              <View style={styles.chips}>
                {subjects.data.map((subject) => {
                  const selected = subjectId === Number(subject.id);
                  return (
                    <Pressable key={subject.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSubjectId(Number(subject.id))} style={[styles.chip, selected && styles.chipOn]}>
                      <Txt size="sm" weight="medium" color={selected ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
                        {subject.name}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
            <Field label="Description" hint={`${description.trim().length} / 10 caractères minimum`}>
              <TextInput value={description} onChangeText={setDescription} maxLength={1000} multiline style={styles.input} placeholderTextColor={Colors.textSecondary} />
            </Field>
            {problem ? <StatusNote tone="error">{problem}</StatusNote> : null}
            {send.isError ? <StatusNote tone="error">{errorMessage(send.error)}</StatusNote> : null}
            <Button label={send.isPending ? 'Envoi…' : 'Envoyer le signalement'} disabled={send.isPending || subjectId === null} onPress={submit} />
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  chipOn: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
  input: { minHeight: 110, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.medium, backgroundColor: Tw.color.input, color: Colors.text, fontFamily: Fonts.medium, fontSize: 14, textAlignVertical: 'top' },
});
