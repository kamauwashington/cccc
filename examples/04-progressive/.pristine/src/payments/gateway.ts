import { cents } from '../orders/money.js';
import type { Cents } from '../orders/money.js';

export interface GatewayResult {
  ok: boolean;
  reference: string;
}

// A stand in for a real card processor. Every call is deterministic so the
// tests do not need a network.
export function authorize(orderId: string, amount: Cents): GatewayResult {
  return { ok: cents(amount) > 0, reference: `auth_${orderId}` };
}

export function capture(reference: string, amount: Cents): GatewayResult {
  return { ok: cents(amount) > 0, reference: reference.replace('auth_', 'cap_') };
}

export function voidAuthorization(reference: string): GatewayResult {
  return { ok: true, reference: reference.replace('auth_', 'void_') };
}

/** The gateway can already send money back. The orders domain does not use it yet. */
export function sendBack(reference: string, amount: Cents): GatewayResult {
  return { ok: cents(amount) > 0, reference: reference.replace(/^(auth|cap)_/, 'rfnd_') };
}
