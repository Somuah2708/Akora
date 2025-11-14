// Centralized academic service pricing configuration & resolver.
// NOTE: Keep amounts in lowest stable currency unit (here plain GHS values; extend later if fractional).
// Schema columns: price_amount NUMERIC, price_currency TEXT DEFAULT 'GHS'.

export type AcademicKind = 'transcript' | 'wassce' | 'recommendation';
export type TranscriptType = 'official' | 'unofficial';

export interface PriceResult {
  amount: number; // e.g. 50 => 50 GHS
  currency: string; // 'GHS'
}

// Raw static map (could be replaced by remote config later)
const PRICING: {
  transcript: Record<TranscriptType, PriceResult> & { default: PriceResult };
  wassce: { certificate: PriceResult; default: PriceResult };
  recommendation: { base: PriceResult };
} = {
  transcript: {
    official: { amount: 50, currency: 'GHS' },
    unofficial: { amount: 0, currency: 'GHS' }, // free unofficial transcript
    default: { amount: 0, currency: 'GHS' },
  },
  wassce: {
    certificate: { amount: 40, currency: 'GHS' },
    default: { amount: 40, currency: 'GHS' }, // fall back to certificate pricing
  },
  recommendation: {
    base: { amount: 0, currency: 'GHS' }, // recommendations currently free
  },
};

interface AcademicPriceInput {
  kind: AcademicKind;
  // For transcripts: request_type ('official'|'unofficial') existing column.
  requestType?: TranscriptType; // transcripts
  // For wassce: subtype 'certificate' (future-proof if we add 'scratch_card', etc.)
  subtype?: string; // wassce
  // For recommendations: currently no subtype differentiation
}

/**
 * Resolve price based on kind + subtype or requestType. Gracefully falls back to 0 GHS.
 */
export function getAcademicPrice(input: AcademicPriceInput): PriceResult {
  const { kind } = input;
  try {
    switch (kind) {
      case 'transcript': {
        if (input.requestType && PRICING.transcript[input.requestType]) {
          return PRICING.transcript[input.requestType];
        }
        return PRICING.transcript.default;
      }
      case 'wassce': {
        if (input.subtype === 'certificate') return PRICING.wassce.certificate;
        return PRICING.wassce.default;
      }
      case 'recommendation': {
        return PRICING.recommendation.base;
      }
      default:
        return { amount: 0, currency: 'GHS' };
    }
  } catch (_e) {
    return { amount: 0, currency: 'GHS' };
  }
}

/** Convenience helpers */
export function resolveTranscriptPrice(requestType: TranscriptType): PriceResult {
  return getAcademicPrice({ kind: 'transcript', requestType });
}

export function resolveWasscePrice(subtype: string = 'certificate'): PriceResult {
  return getAcademicPrice({ kind: 'wassce', subtype });
}

export function resolveRecommendationPrice(): PriceResult {
  return getAcademicPrice({ kind: 'recommendation' });
}

/** Format price for UI */
export function formatPrice(p: PriceResult): string {
  return `${p.currency} ${p.amount}`;
}

