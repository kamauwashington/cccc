import { cents, subtract } from '../orders/money.js';
import type { Cents } from '../orders/money.js';
import * as gateway from './gateway.js';
import { PaymentMethod, PaymentStatus } from './types.js';
import type { Payment } from './types.js';

export class PaymentError extends Error {}

const payments = new Map<string, Payment>();
let sequence = 0;

export function authorizePayment(
  orderId: string,
  amountCents: Cents,
  method: PaymentMethod = PaymentMethod.Card
): Payment {
  const result = gateway.authorize(orderId, cents(amountCents));
  if (!result.ok) throw new PaymentError(`gateway refused order ${orderId}`);
  sequence += 1;
  const payment: Payment = {
    id: `pay_${String(sequence).padStart(4, '0')}`,
    orderId,
    method,
    status: PaymentStatus.Authorized,
    amountCents,
    refundedCents: 0,
    reference: result.reference,
  };
  payments.set(payment.id, payment);
  return payment;
}

export function capturePayment(id: string): Payment {
  const payment = getPayment(id);
  if (payment.status !== PaymentStatus.Authorized) {
    throw new PaymentError(`payment ${id} is ${payment.status}, not authorized`);
  }
  const result = gateway.capture(payment.reference, payment.amountCents);
  payment.status = result.ok ? PaymentStatus.Captured : PaymentStatus.Failed;
  payment.reference = result.reference;
  return payment;
}

export function voidPayment(id: string): Payment {
  const payment = getPayment(id);
  payment.status = PaymentStatus.Voided;
  payment.reference = gateway.voidAuthorization(payment.reference).reference;
  return payment;
}

export function getPayment(id: string): Payment {
  const payment = payments.get(id);
  if (!payment) throw new PaymentError(`no payment ${id}`);
  return payment;
}

export function paymentsForOrder(orderId: string): Payment[] {
  return [...payments.values()].filter((p) => p.orderId === orderId);
}

export function outstanding(payment: Payment): Cents {
  return subtract(payment.amountCents, payment.refundedCents);
}

export function resetPayments(): void {
  payments.clear();
  sequence = 0;
}
