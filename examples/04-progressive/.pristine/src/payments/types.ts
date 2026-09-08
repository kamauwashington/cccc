import type { Cents } from '../orders/money.js';

export enum PaymentStatus {
  Authorized = 'authorized',
  Captured = 'captured',
  Voided = 'voided',
  Failed = 'failed',
}

export enum PaymentMethod {
  Card = 'card',
  BankTransfer = 'bank-transfer',
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Amount taken from the customer, in cents. */
  amountCents: Cents;
  /** Amount already sent back, in cents. */
  refundedCents: Cents;
  reference: string;
}
