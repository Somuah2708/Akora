// Manual payment instructions (Mobile Money & Bank Transfer)
// Replace placeholder values with real institution accounts. No secrets stored here.
export type MobileMoneyDetails = {
  provider: string; // e.g. 'MTN MoMo'
  accountName: string; // Display name / beneficiary
  number: string; // e.g. '0241234567'
  notes?: string; // Optional extra info (reference format, etc.)
};

export type BankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  swiftCode?: string; // optional if international
  notes?: string;
};

export const MOBILE_MONEY: MobileMoneyDetails = {
  provider: 'MTN MoMo',
  accountName: 'School Alumni Secretariat',
  number: '0241234567',
  notes: 'Use your request ID as reference if possible.'
};

export const BANK_ACCOUNT: BankDetails = {
  bankName: 'National Trust Bank',
  accountName: 'School Alumni Secretariat',
  accountNumber: '001234567890',
  branch: 'Accra Main',
  swiftCode: 'NTBKGHAC',
  notes: 'Include request ID in narration / memo.'
};

export const PAYMENT_HELP_TEXT = 'Send the exact fee to either Mobile Money or Bank account, then upload a clear screenshot/photo of the successful transaction before submitting.';
