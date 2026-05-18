import { revalidatePath } from 'next/cache';

import { adminShell } from '../admin-shell';
import {
  describeDisputeQueue,
  describeFinanceExceptionQueue,
  describeVerificationQueue,
} from '../features/dashboard/dashboard-presenter';
import { loadDisputeQueueState, submitDisputeTransition } from '../features/disputes/dispute-queue-actions';
import { createErrorState as createDisputeErrorState } from '../features/disputes/dispute-queue-state';
import {
  loadFinanceExceptionState,
  submitFinanceExceptionTriage,
} from '../features/finance-exceptions/finance-exception-actions';
import { createFinanceErrorState } from '../features/finance-exceptions/finance-exception-state';
import { resolveOperatorSession } from '../features/operator-session/operator-session';
import { loadQueueState, submitReviewDecision } from '../features/provider-review/verification-queue-actions';
import { createQueueErrorState } from '../features/provider-review/verification-queue-state';

async function reviewVerificationAction(formData) {
  'use server';

  const sessionResult = await resolveOperatorSession();
  if (!sessionResult.ok) {
    return { ok: false, error: `Session authentication failed: ${sessionResult.errorMessage || 'Unable to resolve operator session'}` };
  }

  const verificationId = String(formData.get('verificationId') ?? '');
  const decision = String(formData.get('decision') ?? 'approved');
  const reviewNote = String(formData.get('reviewNote') ?? '').trim();

  const currentState = await loadQueueState(sessionResult.sessionToken);
  if (currentState.status !== 'loaded') {
    return { ok: false, error: `Failed to load verification queue: ${currentState.status === 'error' ? currentState.errorMessage : 'Queue state not loaded'}` };
  }

  if (decision !== 'approved' && decision !== 'rejected' && decision !== 'request-more-info') {
    return { ok: false, error: `Invalid decision: "${decision}". Must be "approved", "rejected", or "request-more-info"` };
  }

  const nextState = await submitReviewDecision(
    currentState,
    sessionResult.sessionToken,
    verificationId,
    decision,
    reviewNote || undefined,
  );

  if (nextState.status === 'error') {
    return { ok: false, error: nextState.errorMessage };
  }

  if (nextState.status === 'loaded' && nextState.reviewAction.status === 'error') {
    return { ok: false, error: nextState.reviewAction.errorMessage };
  }

  revalidatePath('/');
  return { ok: true };
}

async function advanceDisputeAction(formData) {
  'use server';

  const sessionResult = await resolveOperatorSession();
  if (!sessionResult.ok) {
    return;
  }

  const disputeId = String(formData.get('disputeId') ?? '');
  const actionType = String(formData.get('actionType') ?? 'startReview');
  const resolutionNote = String(formData.get('resolutionNote') ?? '').trim();

  if (actionType !== 'startReview' && actionType !== 'resolve' && actionType !== 'close') {
    return;
  }

  const currentState = await loadDisputeQueueState(sessionResult.sessionToken);
  if (currentState.status !== 'loaded') {
    return;
  }

  await submitDisputeTransition(
    currentState,
    sessionResult.sessionToken,
    disputeId,
    actionType,
    { resolutionNote: resolutionNote || undefined },
  );

  revalidatePath('/');
}

async function triageFinanceExceptionAction(formData) {
  'use server';

  const sessionResult = await resolveOperatorSession();
  if (!sessionResult.ok) {
    return;
  }

  const exceptionId = String(formData.get('exceptionId') ?? '');
  const actionType = String(formData.get('actionType') ?? '');

  if (actionType !== 'acknowledge' && actionType !== 'followUp' && actionType !== 'routeToDispute') {
    return { ok: false, error: `Invalid actionType: "${actionType}". Must be "acknowledge", "followUp", or "routeToDispute"` };
  }

  const currentState = await loadFinanceExceptionState(sessionResult.sessionToken);
  if (currentState.status !== 'loaded') {
    return;
  }

  const newState = await submitFinanceExceptionTriage(
    currentState,
    sessionResult.sessionToken,
    exceptionId,
    actionType,
  );

  if (newState.status === 'loaded' && newState.queueAction.status === 'error') {
    return { ok: false, error: newState.queueAction.errorMessage };
  }

  revalidatePath('/');
}

const shell = {
  background: '#0B1020',
  panel: '#131A2C',
  panelSoft: '#1A2236',
  panelMuted: '#202B42',
  card: '#F8FAFC',
  cardSoft: '#FFFFFF',
  text: '#E8EEF8',
  textMuted: '#9DA8BF',
  textDark: '#111827',
  textDarkMuted: '#4B5563',
  borderDark: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(148,163,184,0.20)',
  accent: '#0266FF',
  cta: '#FF8A00',
  success: '#10B981',
  danger: '#DC2626',
  warning: '#D97706',
};

const anomalyTypeLabels = {
  'payout-delayed': 'Payout delayed',
  'payout-blocked': 'Payout blocked',
  'invoice-missing': 'Invoice missing',
  'invoice-customer-mismatch': 'Invoice/customer mismatch',
};

function shellCard(extra = {}) {
  return {
    borderRadius: 24,
    border: `1px solid ${shell.borderDark}`,
    background: shell.panel,
    boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
    ...extra,
  };
}

function contentCard(extra = {}) {
  return {
    borderRadius: 24,
    border: `1px solid ${shell.borderLight}`,
    background: shell.cardSoft,
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
    ...extra,
  };
}

function badge(text, styles = {}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        ...styles,
      }}
    >
      {text}
    </span>
  );
}

function metricCard(label, value, accent) {
  return (
    <div
      style={{
        ...contentCard(),
        padding: 20,
      }}
    >
      <div style={{ color: shell.textDarkMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ marginTop: 10, color: accent, fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function actionButton({ label, value, name = 'actionType', background, color = '#fff' }) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      style={{
        border: 0,
        borderRadius: 14,
        padding: '12px 16px',
        background,
        color,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function Sidebar() {
  return (
    <aside
      style={{
        ...shellCard(),
        padding: 24,
        display: 'grid',
        gap: 28,
        alignSelf: 'start',
        position: 'sticky',
        top: 32,
      }}
    >
      <div>
        <div style={{ color: shell.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {adminShell.appName}
        </div>
        <div style={{ color: shell.text, fontSize: 28, fontWeight: 800, marginTop: 10 }}>Operations cockpit</div>
        <div style={{ color: shell.textMuted, marginTop: 12, lineHeight: 1.6 }}>
          Premium internal tooling for provider onboarding, dispute handling, and finance exception review.
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {[
          ['Provider verification', 'Active queue review and decisioning'],
          ['Dispute operations', 'Escalation and resolution workflow'],
          ['Finance exceptions', 'Support and payout anomaly triage'],
        ].map(([title, detail]) => (
          <div key={title} style={{ borderRadius: 18, padding: 16, background: shell.panelSoft, border: `1px solid ${shell.borderDark}` }}>
            <div style={{ color: shell.text, fontWeight: 700 }}>{title}</div>
            <div style={{ color: shell.textMuted, marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>{detail}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function VerificationQueueSection({ state }) {
  const summary = describeVerificationQueue(state);

  return (
    <section style={{ ...contentCard(), padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, color: shell.textDark, fontSize: 30, letterSpacing: '-0.03em' }}>Provider verification</h2>
          <p style={{ margin: '10px 0 0', color: shell.textDarkMuted }}>{summary.headline}</p>
          <p style={{ margin: '6px 0 0', color: '#6B7280' }}>{summary.detail}</p>
        </div>
        {badge(summary.badge, { background: 'rgba(2,102,255,0.10)', color: shell.accent })}
      </div>

      {state.status === 'loaded' ? (
        <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
          {state.verifications.map((verification) => (
            <article
              key={verification.verificationId}
              style={{
                borderRadius: 20,
                padding: 20,
                border: `1px solid ${shell.borderLight}`,
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: shell.textDark, fontSize: 20 }}>
                    {verification.businessName || verification.providerEmail}
                  </h3>
                  <p style={{ margin: '8px 0 0', color: shell.textDarkMuted }}>
                    {verification.providerEmail} • {verification.tradeCategories.join(', ') || 'No trades listed'}
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#6B7280' }}>
                    Service area: {verification.serviceArea || 'not provided'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', color: '#6B7280', fontSize: 13 }}>
                  <div>Submitted {new Date(verification.submittedAt).toLocaleString('de-AT')}</div>
                  <div>{verification.documents.length} document(s)</div>
                </div>
              </div>

              {verification.documents.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                  {verification.documents.map((document) => (
                    <div key={document.documentId} style={{ borderRadius: 999, padding: '8px 12px', background: '#E8EEF8', color: shell.textDark, fontSize: 13, fontWeight: 600 }}>
                      {document.filename} ({document.mimeType})
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: '14px 0 0', color: '#6B7280' }}>No documents attached.</p>
              )}

              <form action={reviewVerificationAction} style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                <input type="hidden" name="verificationId" value={verification.verificationId} />
                <label style={{ display: 'grid', gap: 8, color: shell.textDark, fontWeight: 700 }}>
                  Review note
                  <textarea
                    name="reviewNote"
                    rows={3}
                    placeholder="Optional note for the provider review history"
                    style={{ borderRadius: 16, border: `1px solid ${shell.borderLight}`, padding: 14, font: 'inherit', resize: 'vertical' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="submit" name="decision" value="approved" style={{ border: 0, borderRadius: 14, padding: '12px 16px', background: shell.accent, color: '#fff', fontWeight: 700 }}>
                    Approve provider
                  </button>
                  <button type="submit" name="decision" value="request-more-info" style={{ border: 0, borderRadius: 14, padding: '12px 16px', background: shell.cta, color: '#fff', fontWeight: 700 }}>
                    Request more info
                  </button>
                  <button type="submit" name="decision" value="rejected" style={{ border: 0, borderRadius: 14, padding: '12px 16px', background: shell.danger, color: '#fff', fontWeight: 700 }}>
                    Reject provider
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DisputeQueueSection({ state }) {
  const summary = describeDisputeQueue(state);

  return (
    <section style={{ ...contentCard(), padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, color: shell.textDark, fontSize: 30, letterSpacing: '-0.03em' }}>Dispute queue</h2>
          <p style={{ margin: '10px 0 0', color: shell.textDarkMuted }}>{summary.headline}</p>
          <p style={{ margin: '6px 0 0', color: '#6B7280' }}>{summary.detail}</p>
        </div>
        {badge(summary.badge, { background: 'rgba(2,102,255,0.10)', color: shell.accent })}
      </div>

      {state.status === 'loaded' ? (
        <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
          {state.disputes.map((dispute) => (
            <article
              key={dispute.disputeId}
              style={{
                borderRadius: 20,
                padding: 20,
                border: `1px solid ${shell.borderLight}`,
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: shell.textDark, fontSize: 20 }}>
                    Booking {dispute.bookingId} • {dispute.category}
                  </h3>
                  <p style={{ margin: '8px 0 0', color: shell.textDarkMuted }}>{dispute.description}</p>
                  <p style={{ margin: '6px 0 0', color: '#6B7280' }}>
                    Reporter: {dispute.reporterRole} {dispute.reporterUserId}
                  </p>
                </div>
                <div style={{ textAlign: 'right', color: '#6B7280', fontSize: 13 }}>
                  <div>Status: {dispute.status}</div>
                  <div>Opened {new Date(dispute.createdAt).toLocaleString('de-AT')}</div>
                </div>
              </div>

              <form action={advanceDisputeAction} style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                <input type="hidden" name="disputeId" value={dispute.disputeId} />
                <label style={{ display: 'grid', gap: 8, color: shell.textDark, fontWeight: 700 }}>
                  Resolution note
                  <textarea
                    name="resolutionNote"
                    rows={3}
                    placeholder="Optional transition context"
                    style={{ borderRadius: 16, border: `1px solid ${shell.borderLight}`, padding: 14, font: 'inherit', resize: 'vertical' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {dispute.status === 'open'
                    ? actionButton({ label: 'Start review', value: 'startReview', background: shell.accent })
                    : null}
                  {dispute.status === 'under-review' ? (
                    <>
                      {actionButton({ label: 'Resolve dispute', value: 'resolve', background: shell.success })}
                      {actionButton({ label: 'Close without resolution', value: 'close', background: '#475569' })}
                    </>
                  ) : null}
                </div>
              </form>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FinanceExceptionSection({ state }) {
  const summary = describeFinanceExceptionQueue(state);

  return (
    <section style={{ ...contentCard(), padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, color: shell.textDark, fontSize: 30, letterSpacing: '-0.03em' }}>Finance exceptions</h2>
          <p style={{ margin: '10px 0 0', color: shell.textDarkMuted }}>{summary.headline}</p>
          <p style={{ margin: '6px 0 0', color: '#6B7280' }}>{summary.detail}</p>
        </div>
        {badge(summary.badge, { background: 'rgba(255,138,0,0.12)', color: shell.cta })}
      </div>

      {state.status === 'loaded' ? (
        <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
          {state.exceptions.map((exception) => (
            <article
              key={exception.exceptionId}
              style={{
                borderRadius: 20,
                padding: 20,
                border: `1px solid ${shell.borderLight}`,
                background: '#FFFDF7',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: shell.textDark, fontSize: 20 }}>
                    Booking {exception.bookingId} • {anomalyTypeLabels[exception.anomalyType]}
                  </h3>
                  <p style={{ margin: '8px 0 0', color: shell.textDarkMuted }}>{exception.anomalyReason}</p>
                  <p style={{ margin: '6px 0 0', color: '#6B7280' }}>
                    {exception.providerUserId && `Provider: ${exception.providerUserId}`}
                    {exception.providerUserId && exception.customerUserId && ' • '}
                    {exception.customerUserId && `Customer: ${exception.customerUserId}`}
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#6B7280' }}>
                    Dispute: {exception.disputeId} • Resolution state: {exception.resolutionState}
                  </p>
                </div>
                <div style={{ textAlign: 'right', color: '#6B7280', fontSize: 13 }}>
                  <div>Dispute status: {exception.disputeStatus}</div>
                  <div>Reported {new Date(exception.reportedAt).toLocaleString('de-AT')}</div>
                </div>
              </div>

              <form action={triageFinanceExceptionAction} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                <input type="hidden" name="exceptionId" value={exception.exceptionId} />
                {actionButton({ label: 'Acknowledge', value: 'acknowledge', background: '#0F766E' })}
                {actionButton({ label: 'Mark follow-up', value: 'followUp', background: shell.accent })}
                {actionButton({ label: 'Route to dispute/manual review', value: 'routeToDispute', background: '#7C3AED' })}
              </form>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default async function AdminHomePage() {
  const sessionResult = await resolveOperatorSession();

  const [verificationState, disputeState, financeExceptionState] = sessionResult.ok
    ? await Promise.all([
        loadQueueState(sessionResult.sessionToken),
        loadDisputeQueueState(sessionResult.sessionToken),
        loadFinanceExceptionState(sessionResult.sessionToken),
      ])
    : [
        createQueueErrorState(sessionResult.errorMessage),
        createDisputeErrorState(sessionResult.errorMessage),
        createFinanceErrorState(sessionResult.errorMessage),
      ];

  const verificationSummary = describeVerificationQueue(verificationState);
  const disputeSummary = describeDisputeQueue(disputeState);
  const financeSummary = describeFinanceExceptionQueue(financeExceptionState);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: shell.background,
        color: shell.text,
        fontFamily: 'Inter, Arial, sans-serif',
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '320px minmax(0, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <Sidebar />

        <div style={{ display: 'grid', gap: 28 }}>
          <section style={{ ...shellCard(), padding: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: shell.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Operator dashboard
                </div>
                <h1 style={{ margin: '10px 0 0', fontSize: 52, lineHeight: 1.02, letterSpacing: '-0.04em', color: shell.text, maxWidth: 760 }}>
                  Control the marketplace with clarity.
                </h1>
                <p style={{ margin: '14px 0 0', color: shell.textMuted, maxWidth: 720, lineHeight: 1.7 }}>
                  Live provider verification, dispute operations, and finance/support exception handling in one premium operations cockpit.
                </p>
                <p style={{ margin: '14px 0 0', color: shell.textMuted }}>
                  Session bootstrap:{' '}
                  {sessionResult.ok
                    ? `${sessionResult.operatorEmail} via ${sessionResult.source}`
                    : 'missing operator bootstrap configuration'}
                </p>
              </div>
              {badge('Live control', { background: 'rgba(16,185,129,0.14)', color: '#6EE7B7' })}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
            {metricCard('Verification queue', verificationSummary.badge, shell.accent)}
            {metricCard('Dispute queue', disputeSummary.badge, shell.cta)}
            {metricCard('Finance exceptions', financeSummary.badge, shell.success)}
          </section>

          <div style={{ display: 'grid', gap: 24 }}>
            <VerificationQueueSection state={verificationState} />
            <DisputeQueueSection state={disputeState} />
            <FinanceExceptionSection state={financeExceptionState} />
          </div>
        </div>
      </div>
    </main>
  );
}
