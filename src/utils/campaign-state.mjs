/**
 * Campaign Lifecycle State Machine for Funderr.
 *
 * Models the valid state transitions of a crowdfunding campaign:
 *
 *   DRAFT ──► ACTIVE ──► FUNDED ──► COMPLETED
 *                │          │
 *                └──────────┴──► CANCELLED
 *                │
 *                └──► EXPIRED
 *
 * Only explicitly whitelisted transitions are permitted;
 * all others throw a CampaignTransitionError.
 */

export class CampaignTransitionError extends Error {
  constructor(from, to) {
    super(`Invalid campaign transition: ${from} → ${to}`);
    this.name = 'CampaignTransitionError';
    this.from = from;
    this.to = to;
  }
}

export const CampaignStatus = Object.freeze({
  DRAFT:     'DRAFT',
  ACTIVE:    'ACTIVE',
  FUNDED:    'FUNDED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED:   'EXPIRED',
});

/** Allowed transition edges: from → Set<to> */
const TRANSITIONS = new Map([
  [CampaignStatus.DRAFT,     new Set([CampaignStatus.ACTIVE,    CampaignStatus.CANCELLED])],
  [CampaignStatus.ACTIVE,    new Set([CampaignStatus.FUNDED,    CampaignStatus.CANCELLED, CampaignStatus.EXPIRED])],
  [CampaignStatus.FUNDED,    new Set([CampaignStatus.COMPLETED, CampaignStatus.CANCELLED])],
  [CampaignStatus.COMPLETED, new Set()],
  [CampaignStatus.CANCELLED, new Set()],
  [CampaignStatus.EXPIRED,   new Set()],
]);

/**
 * Validate and return the next status after a state transition.
 *
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {string} The confirmed next status
 * @throws {CampaignTransitionError} When the transition is not permitted
 */
export function transition(currentStatus, nextStatus) {
  const allowed = TRANSITIONS.get(currentStatus);
  if (!allowed) {
    throw new CampaignTransitionError(currentStatus, nextStatus);
  }
  if (!allowed.has(nextStatus)) {
    throw new CampaignTransitionError(currentStatus, nextStatus);
  }
  return nextStatus;
}

/**
 * Return all reachable next statuses from a given current status.
 * Returns an empty array for terminal states.
 *
 * @param {string} currentStatus
 * @returns {string[]}
 */
export function allowedTransitions(currentStatus) {
  return Array.from(TRANSITIONS.get(currentStatus) || []);
}

/**
 * Returns true when the status is a terminal state (no further transitions possible).
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminal(status) {
  const allowed = TRANSITIONS.get(status);
  return allowed !== undefined && allowed.size === 0;
}

/**
 * Stateful Campaign entity wrapper that encapsulates the current status
 * and enforces transitions through the state machine.
 */
export class Campaign {
  /**
   * @param {string} id
   * @param {string} [initialStatus='DRAFT']
   */
  constructor(id, initialStatus = CampaignStatus.DRAFT) {
    if (!TRANSITIONS.has(initialStatus)) {
      throw new TypeError(`Unknown campaign status: ${initialStatus}`);
    }
    this.id = id;
    this.status = initialStatus;
    this.history = [{ status: initialStatus, at: Date.now() }];
  }

  /**
   * Transition this campaign to a new status.
   * @param {string} nextStatus
   * @returns {Campaign} this (for chaining)
   * @throws {CampaignTransitionError}
   */
  transitionTo(nextStatus) {
    this.status = transition(this.status, nextStatus);
    this.history.push({ status: this.status, at: Date.now() });
    return this;
  }

  get isTerminal() {
    return isTerminal(this.status);
  }

  toJSON() {
    return { id: this.id, status: this.status, history: this.history };
  }
}
