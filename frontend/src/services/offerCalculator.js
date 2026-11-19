/**
 * Ride Offer & Fare Helper Service
 *
 * Welcome offer promotional discounts have been decommissioned.
 * All fares represent standard provider estimated and ML-predicted fares.
 */

export const WELCOME_OFFER_PERCENTAGE = 0;

/**
 * Normalizes ride fare without promotional discounts.
 *
 * @param {number} fare - The original provider estimated fare.
 * @returns {object} { originalFare, discountAmount: 0, finalFare, hasEligibleOffer: false, comparableFare, offerTitle: null }
 */
export function calculateRideOffer(fare) {
  const numericFare = Number(fare) || 0;
  const originalFare = Math.round(numericFare * 100) / 100;

  return {
    originalFare,
    discountAmount: 0,
    finalFare: originalFare,
    hasEligibleOffer: false,
    comparableFare: originalFare,
    offerTitle: null,
  };
}

/**
 * Decorates a list of ride options with standard fares (no welcome discounts applied).
 *
 * @param {Array} options - List of ride option objects.
 * @returns {Array} Ride options with consistent standard pricing.
 */
export function decorateOptionsWithOffers(options) {
  if (!Array.isArray(options)) return [];

  return options.map((opt) => {
    const fare = Number(opt.estimatedFare ?? opt.originalEstimatedFare ?? 0);
    return {
      ...opt,
      originalEstimatedFare: fare,
      platformDiscount: 0,
      finalEstimatedCost: fare,
      hasEligibleOffer: false,
      hasWelcomeOffer: false,
      comparableFare: fare,
      offerTitle: null,
    };
  });
}
