import type { SecurityScoreWeights } from "./security-score.types";

export const DEFAULT_SECURITY_SCORE_WEIGHTS: SecurityScoreWeights = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

export const DEFAULT_SECURITY_SCORE_STARTING_SCORE = 100;
export const DEFAULT_SECURITY_SCORE_MINIMUM_SCORE = 0;
export const DEFAULT_SECURITY_SCORE_MAXIMUM_SCORE = 100;

