export const formatDifficultyScore = (difficulty: number): string => difficulty.toFixed(1);

export const renderDifficultyStars = (difficulty: number, maxStars = 5): string => {
  const filledStars = Math.max(1, Math.min(maxStars, Math.round(difficulty)));
  return `${"★".repeat(filledStars)}${"☆".repeat(Math.max(0, maxStars - filledStars))}`;
};
