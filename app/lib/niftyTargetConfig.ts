// Single source of truth for the Nifty target-consistency business constants.
//
// These are FIXED business targets agreed with the desk — they are deliberately
// NOT derived from the uploaded sheet. Only the price series behind the charts
// is data-driven; the bar they are measured against lives here.

/** Weekly return target, in percent. */
export const WEEKLY_TARGET_RETURN = 0.225;

/** Monthly return target, in percent. */
export const MONTHLY_TARGET_RETURN = 1.0;

/**
 * Trailing window shown on both target charts, in years. The window is anchored
 * to the most recent trade_date present in the uploaded data — never to
 * `new Date()` — so uploading a file that ends in the past shows that file's
 * own last 2 years.
 */
export const TARGET_WINDOW_YEARS = 2;

/** Decimal places used when rendering each target (0.225% vs 1.00%). */
export const WEEKLY_TARGET_DECIMALS = 3;
export const MONTHLY_TARGET_DECIMALS = 2;

/** Label for the trailing window, used on the stat cards. */
export const TARGET_WINDOW_LABEL = `Last ${TARGET_WINDOW_YEARS}Y`;
