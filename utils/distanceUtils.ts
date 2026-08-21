export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

export function calculateDeliveryFee(distanceKm: number, pricePerKm: number = 150): number {
  // If distance is less than 1km, charge for 1km minimum
  const effectiveDistance = Math.max(1, Math.ceil(distanceKm));
  return effectiveDistance * pricePerKm;
}

// ── Delivery fee bounds ──
export const MIN_DELIVERY_FEE = 500;
/** Cap applied to the subsidised tier (rawFee 1001–1500) */
export const SUBSIDISED_CAP = 1000;
/** Threshold above which the flat discount applies instead of the cap */
export const FULL_RATE_THRESHOLD = 1500;
/** Fixed discount the company absorbs for very long distances (rawFee > 1500) */
export const SUBSIDY_CAP = 500;

export interface DeliveryFeeDetails {
  /** Raw unclamped fee based on actual distance */
  rawFee: number;
  /** Fee after applying the 4-tier delivery model */
  boundedFee: number;
}

/**
 * 4-tier delivery fee model:
 * 1. rawFee ≤ 500        → 500       (minimum to protect driver)
 * 2. 500 < rawFee ≤ 1000 → rawFee    (actual cost, no subsidy)
 * 3. 1000 < rawFee ≤ 1500→ 1000      (capped, company absorbs up to 500)
 * 4. rawFee > 1500       → rawFee-500 (flat 500 discount from company)
 */
export function calculateDeliveryFeeDetails(
  distanceKm: number,
  pricePerKm: number = 150
): DeliveryFeeDetails {
  const rawFee = calculateDeliveryFee(distanceKm, pricePerKm);

  let boundedFee: number;
  if (rawFee <= MIN_DELIVERY_FEE) {
    boundedFee = MIN_DELIVERY_FEE;
  } else if (rawFee <= SUBSIDISED_CAP) {
    boundedFee = rawFee;
  } else if (rawFee <= FULL_RATE_THRESHOLD) {
    boundedFee = SUBSIDISED_CAP;
  } else {
    boundedFee = rawFee - SUBSIDY_CAP;
  }

  return { rawFee, boundedFee };
}
