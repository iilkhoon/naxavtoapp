import { supabase } from '../lib/supabase';

const RISK_TAG = '[RISKLI]';
const AUTO_RISK_DAYS = 30;

/** Marked risky by an admin (tag stored in the loan notes) */
export const isManualRisky = (loans: { notes?: string | null }[]) =>
  loans.some((l) => !!l.notes && l.notes.includes(RISK_TAG));

/** Any instalment more than 30 days overdue */
export const isAutoRisky = (loans: { id: string }[], overdueByLoan: Record<string, { due_date: string }[]>) =>
  loans.some((l) =>
    (overdueByLoan[l.id] || []).some((s) => s.due_date && (Date.now() - new Date(s.due_date).getTime()) / 86400000 > AUTO_RISK_DAYS)
  );

/** Notes without the internal tags, for display */
export const visibleNotes = (notes?: string | null) =>
  (notes || '').replace(RISK_TAG, '').replace(/\[PUSH_TOKEN:.*?\]\]/g, '').trim();

/**
 * Adds or removes the risk tag on every loan of a customer. Each loan keeps its
 * own notes (they can hold that customer's push token), so rows are updated one by one.
 */
export async function setCustomerRisky(loans: { id: string; notes?: string | null }[], risky: boolean) {
  const results = await Promise.all(
    loans.map((l) => {
      const clean = (l.notes || '').replace(RISK_TAG, '').trim();
      const notes = risky ? `${RISK_TAG}\n${clean}`.trim() : clean;
      return supabase.from('loan_accounts').update({ notes: notes || null }).eq('id', l.id);
    })
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
