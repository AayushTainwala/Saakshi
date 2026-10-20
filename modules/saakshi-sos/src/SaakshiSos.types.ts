/** One phone number the user chose in the phone's own contact picker. */
export type PickedPhone = {
  name: string | null;
  phone: string;
};

/**
 * What Android reported for one recipient of a direct SMS. `sent` means every part left the phone
 * (the network accepted it); it does not mean the message was delivered.
 */
export type DirectSmsResult = {
  phone: string;
  status: 'sent' | 'failed' | 'unknown';
  /** SmsManager's result code for the first part that failed, when there was one. */
  errorCode: number | null;
  error: string | null;
};
