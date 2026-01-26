/**
 * Converts steps to distance in kilometers
 * @param steps - Number of steps
 * @param strideLength - Average stride length in meters (default: 0.78m)
 * @returns Distance in kilometers
 */
export const stepsToDistance = (steps: number, strideLength: number = 0.78): number => {
  return (steps * strideLength) / 1000;
};

/**
 * Converts steps to calories burned
 * @param steps - Number of steps
 * @param weight - User weight in kg (default: 75kg)
 * @returns Estimated calories burned
 */
export const stepsToCalories = (steps: number, weight: number = 75): number => {
  return steps * 0.04; // Standard approximation: 1 step ≈ 0.04 calories
};

/**
 * Calculates pace (minutes per kilometer)
 * @param distanceKm - Distance in kilometers
 * @param durationSeconds - Duration in seconds
 * @returns Pace in minutes per kilometer
 */
export const calculatePace = (distanceKm: number, durationSeconds: number): number => {
  if (distanceKm === 0) return 0;
  return (durationSeconds / 60) / distanceKm;
};

/**
 * Calculates stride length based on height
 * @param heightCm - Height in centimeters
 * @returns Estimated stride length in meters
 */
export const calculateStrideLength = (heightCm: number): number => {
  return (heightCm * 0.415) / 100; // Standard formula: height × 0.415
};

/**
 * Calculates BMI (Body Mass Index)
 * @param heightCm - Height in centimeters
 * @param weightKg - Weight in kilograms
 * @returns BMI value
 */
export const calculateBMI = (heightCm: number, weightKg: number): number => {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
};
