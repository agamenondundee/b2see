// Review notifications. Owners are notified ahead of and on a document review due
// date, and on overdue items. The primary channel is email; an optional Microsoft
// Teams webhook can be enabled in configuration. The mail service must be in a UK or
// EU region. When no channel is configured the intent is logged rather than sent, so
// the application runs without external services in development.

import nodemailer, { type Transporter } from 'nodemailer';
import { env, defaults } from './config';
import { prisma } from './prisma';

let transport: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!env.smtp.host) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    });
  }
  return transport;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const t = getTransport();
  if (!t) {
    console.log(`[notifications] email not configured; would send to ${to}: ${subject}`);
    return;
  }
  await t.sendMail({ from: env.smtp.from, to, subject, text });
}

async function postTeams(text: string): Promise<void> {
  const webhook = defaults.notifications.teams;
  if (!webhook.enabled || !webhook.webhookUrl) return;
  await fetch(webhook.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

// Notify document owners of reviews due within the configured window and of overdue
// reviews. Intended to run on a daily schedule.
export async function notifyReviewsDue(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + defaults.reviewDueWithinDays * 24 * 60 * 60 * 1000);
  const documents = await prisma.document.findMany({
    where: { status: 'Published', nextReviewDate: { lte: windowEnd } },
    include: { owner: { select: { email: true, displayName: true } } },
  });

  const byOwner = new Map<string, { name: string; due: string[]; overdue: string[] }>();
  for (const d of documents) {
    if (!d.owner?.email || !d.nextReviewDate) continue;
    const bucket = byOwner.get(d.owner.email) ?? { name: d.owner.displayName, due: [], overdue: [] };
    const line = `${d.documentId} ${d.title} (review by ${d.nextReviewDate.toISOString().slice(0, 10)})`;
    if (d.nextReviewDate < now) bucket.overdue.push(line);
    else bucket.due.push(line);
    byOwner.set(d.owner.email, bucket);
  }

  for (const [email, bucket] of byOwner) {
    const parts: string[] = [`Hello ${bucket.name},`, ''];
    if (bucket.overdue.length) parts.push('Overdue reviews:', ...bucket.overdue.map((l) => `  ${l}`), '');
    if (bucket.due.length) parts.push('Reviews due soon:', ...bucket.due.map((l) => `  ${l}`), '');
    parts.push('Please review these documents in the ISMS.');
    await sendEmail(email, 'ISMS document reviews due', parts.join('\n'));
  }

  if (byOwner.size > 0) {
    await postTeams(`ISMS reviews: ${documents.length} documents are due or overdue for review.`);
  }
}

// Run the review check shortly after start, then once a day.
export function startReviewScheduler(): void {
  const day = 24 * 60 * 60 * 1000;
  setTimeout(() => {
    void notifyReviewsDue();
    setInterval(() => void notifyReviewsDue(), day);
  }, 60 * 1000);
}
