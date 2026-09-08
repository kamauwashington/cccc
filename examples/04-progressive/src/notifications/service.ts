import { TEMPLATES } from './templates.js';
import { Channel, NotificationKind } from './types.js';
import type { Notification } from './types.js';

export class NotificationError extends Error {}

const sent: Notification[] = [];

export function notify(
  kind: NotificationKind,
  orderId: string,
  to: string,
  channel: Channel = Channel.Email
): Notification {
  const template = TEMPLATES[kind];
  if (!template) throw new NotificationError(`no template for ${kind}`);
  const notification: Notification = {
    id: `ntf_${String(sent.length + 1).padStart(4, '0')}`,
    kind,
    channel,
    to,
    subject: template.subject,
    body: template.body(orderId),
  };
  sent.push(notification);
  return notification;
}

export function outbox(): readonly Notification[] {
  return sent;
}

export function resetNotifications(): void {
  sent.length = 0;
}
