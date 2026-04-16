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

function cardStyle(borderColor) {
  return {
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    padding: 20,
    background: '#ffffff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
  };
}

function queueSummaryBadge(summary) {
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '4px 10px',
        borderRadius: 999,
        background: '#eef2ff',
        color: '#3730a3',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {summary.badge}
    </span>
  );
}

function VerificationQueueSection({ state }) {
  const summary = describeVerificationQueue(state);

  return (
    <section style={cardStyle('#c7d2fe')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Provider verification</h2>
          <p style={{ margin: '8px 0 0', color: '#475569' }}>{summary.headline}</p>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>{summary.detail}</p>
        </div>
        {queueSummaryBadge(summary)}
      </div>

      {state.status === 'loaded' ? (
        <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          {state.verifications.map((verification) => (
            <article
              key={verification.verificationId}
              style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#f8fafc' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    {verification.businessName || verification.providerEmail}
                  </h3>
                  <p style={{ margin: '6px 0 0', color: '#475569' }}>
                    {verification.providerEmail} • {verification.tradeCategories.join(', ') || 'No trades listed'}
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                    Service area: {verification.serviceArea || 'not provided'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', color: '#64748b', fontSize: 13 }}>
                  <div>Submitted {new Date(verification.submittedAt).toLocaleString('de-AT')}</div>
                  <div>{verification.documents.length} document(s)</div>
                </div>
              </div>

              {verification.documents.length > 0 ? (
                <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#334155' }}>
                  {verification.documents.map((document) => (
                    <li key={document.documentId}>
                      {document.filename} ({document.mimeType})
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '12px 0 0', color: '#64748b' }}>No documents attached.</p>
              )}

              <form action={reviewVerificationAction} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                <input type="hidden" name="verificationId" value={verification.verificationId} />
                <label style={{ display: 'grid', gap: 6, color: '#334155', fontWeight: 600 }}>
                  Review note
                  <textarea
                    name="reviewNote"
                    rows={3}
                    placeholder="Optional operator note (recommended for rejection or request-more-info)"
                    style={{ borderRadius: 10, border: '1px solid #cbd5e1', padding: 10, font: 'inherit' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#2563eb', color: '#fff' }}
                  >
                    Approve provider
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="request-more-info"
                    style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#ea580c', color: '#fff' }}
                  >
                    Request more info
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#dc2626', color: '#fff' }}
                  >
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
    <section style={cardStyle('#bfdbfe')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Dispute queue</h2>
          <p style={{ margin: '8px 0 0', color: '#475569' }}>{summary.headline}</p>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>{summary.detail}</p>
        </div>
        {queueSummaryBadge(summary)}
      </div>

      {state.status === 'loaded' ? (
        <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          {state.disputes.map((dispute) => (
            <article
              key={dispute.disputeId}
              style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#f8fafc' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    Booking {dispute.bookingId} • {dispute.category}
                  </h3>
                  <p style={{ margin: '6px 0 0', color: '#475569' }}>{dispute.description}</p>
                  <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                    Reporter: {dispute.reporterRole} {dispute.reporterUserId}
                  </p>
                </div>
                <div style={{ textAlign: 'right', color: '#64748b', fontSize: 13 }}>
                  <div>Status: {dispute.status}</div>
                  <div>Opened {new Date(dispute.createdAt).toLocaleString('de-AT')}</div>
                </div>
              </div>

              <form action={advanceDisputeAction} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                <input type="hidden" name="disputeId" value={dispute.disputeId} />
                <label style={{ display: 'grid', gap: 6, color: '#334155', fontWeight: 600 }}>
                  Resolution note
                  <textarea
                    name="resolutionNote"
                    rows={3}
                    placeholder="Optional operator note for transition history"
                    style={{ borderRadius: 10, border: '1px solid #cbd5e1', padding: 10, font: 'inherit' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {dispute.status === 'open' ? (
                    <button
                      type="submit"
                      name="actionType"
                      value="startReview"
                      style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#2563eb', color: '#fff' }}
                    >
                      Start review
                    </button>
                  ) : null}
                  {dispute.status === 'under-review' ? (
                    <>
                      <button
                        type="submit"
                        name="actionType"
                        value="resolve"
                        style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#059669', color: '#fff' }}
                      >
                        Resolve dispute
                      </button>
                      <button
                        type="submit"
                        name="actionType"
                        value="close"
                        style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#475569', color: '#fff' }}
                      >
                        Close without resolution
                      </button>
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

const anomalyTypeLabels = {
  'payout-delayed': 'Payout delayed',
  'payout-blocked': 'Payout blocked',
  'invoice-missing': 'Invoice missing',
  'invoice-customer-mismatch': 'Invoice/customer mismatch',
};

function FinanceExceptionSection({ state }) {
  const summary = describeFinanceExceptionQueue(state);

  return (
    <section style={cardStyle('#fde68a')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Finance/support exceptions</h2>
          <p style={{ margin: '8px 0 0', color: '#475569' }}>{summary.headline}</p>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>{summary.detail}</p>
        </div>
        {queueSummaryBadge(summary)}
      </div>

      {state.status === 'loaded' ? (
        <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          {state.exceptions.map((exception) => (
            <article
              key={exception.exceptionId}
              style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fefce8' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    Booking {exception.bookingId} • {anomalyTypeLabels[exception.anomalyType]}
                  </h3>
                  <p style={{ margin: '6px 0 0', color: '#475569' }}>{exception.anomalyReason}</p>
                  <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                    {exception.providerUserId && `Provider: ${exception.providerUserId}`}
                    {exception.providerUserId && exception.customerUserId && ' • '}
                    {exception.customerUserId && `Customer: ${exception.customerUserId}`}
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                    Dispute: {exception.disputeId} • Resolution state: {exception.resolutionState}
                  </p>
                </div>
                <div style={{ textAlign: 'right', color: '#64748b', fontSize: 13 }}>
                  <div>Dispute status: {exception.disputeStatus}</div>
                  <div>Reported {new Date(exception.reportedAt).toLocaleString('de-AT')}</div>
                </div>
              </div>

              <form action={triageFinanceExceptionAction} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <input type="hidden" name="exceptionId" value={exception.exceptionId} />
                <button
                  type="submit"
                  name="actionType"
                  value="acknowledge"
                  style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#0f766e', color: '#fff' }}
                >
                  Acknowledge
                </button>
                <button
                  type="submit"
                  name="actionType"
                  value="followUp"
                  style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#0369a1', color: '#fff' }}
                >
                  Mark follow-up
                </button>
                <button
                  type="submit"
                  name="actionType"
                  value="routeToDispute"
                  style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: '#7c3aed', color: '#fff' }}
                >
                  Route to dispute/manual review
                </button>
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

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 32,
        fontFamily: 'Arial, sans-serif',
        background: '#f1f5f9',
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 24 }}>
        <section style={cardStyle('#94a3b8')}>
          <p style={{ margin: 0, color: '#475569', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {adminShell.appName}
          </p>
          <h1 style={{ margin: '8px 0 0', fontSize: 34 }}>Operator dashboard</h1>
          <p style={{ margin: '10px 0 0', color: '#475569', maxWidth: 760 }}>
            Live provider verification, dispute, and finance/support exception operations powered by real queue modules.
          </p>
          <p style={{ margin: '10px 0 0', color: '#64748b' }}>
            Session bootstrap:{' '}
            {sessionResult.ok
              ? `${sessionResult.operatorEmail} via ${sessionResult.source}`
              : 'missing operator bootstrap configuration'}
          </p>
        </section>

        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <VerificationQueueSection state={verificationState} />
          <DisputeQueueSection state={disputeState} />
          <FinanceExceptionSection state={financeExceptionState} />
        </div>
      </div>
    </main>
  );
}
