import type { ViewStyle } from 'react-native';

import { formatMoney, Tape, type TapeMark } from '@/components/ui';
import type { Escrow } from '@/services/database.types';

/** Money released so far and money still held, from the escrow row. */
export function escrowAmounts(escrow: Escrow) {
  const materials = escrow.materials_released ? escrow.materials_amount : 0;
  // The final release pays out everything still held, materials included.
  const released = escrow.workmanship_released ? escrow.total : materials;
  return { released, held: Math.max(0, escrow.total - released) };
}

/**
 * The escrow as a tape: blade length is the share of the agreed total already
 * paid out, with a stage line at the materials portion when the quote had one.
 */
export function EscrowTape({
  escrow,
  size = 'hero',
  labelled = size === 'hero',
  style,
}: {
  escrow: Escrow;
  size?: 'hero' | 'inline' | 'row';
  labelled?: boolean;
  style?: ViewStyle;
}) {
  const { released, held } = escrowAmounts(escrow);
  const total = escrow.total || 1;
  const materialsAt = escrow.materials_amount > 0 ? escrow.materials_amount / total : 0;

  const marks: TapeMark[] = [];
  if (labelled) {
    if (materialsAt > 0 && materialsAt < 0.8) {
      marks.push({
        at: materialsAt,
        value: formatMoney(escrow.materials_amount),
        label: escrow.materials_released ? 'released' : 'materials',
      });
    }
    if (held > 0 && materialsAt < 0.8) {
      marks.push({ at: (released / total + 1) / 2, value: formatMoney(held), label: 'to go' });
    }
    marks.push({ at: 1, value: formatMoney(escrow.total), label: 'agreed' });
  }

  return (
    <Tape
      progress={released / total}
      stops={materialsAt > 0 ? [materialsAt] : []}
      marks={marks}
      size={size}
      style={style}
    />
  );
}

/**
 * Where the job is, in the client's words: "Stage 2 of 3 · materials bought".
 * Stages are the money moments: funded, materials (when quoted), final payment.
 */
export function escrowStage(escrow: Escrow): { index: number; count: number; label: string } {
  const hasMaterials = escrow.materials_amount > 0;
  const count = hasMaterials ? 3 : 2;
  if (escrow.workmanship_released) return { index: count, count, label: 'paid in full' };
  if (escrow.completion_requested_at) {
    return { index: count, count, label: 'work done, waiting for you' };
  }
  if (hasMaterials && escrow.materials_released) return { index: 2, count, label: 'materials bought' };
  if (hasMaterials && escrow.materials_requested_at) {
    return { index: 1, count, label: 'asking for materials money' };
  }
  return { index: 1, count, label: escrow.status === 'pending' ? 'waiting for escrow' : 'escrow funded' };
}
