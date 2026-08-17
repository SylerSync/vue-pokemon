export function getRandomWithExclusions(min, max, excludeArray) {
  // 1. Clean, filter to only valid range elements, and sort exclusions ascending
  const uniqueExcludes = [...new Set(excludeArray)]
    .filter(num => num >= min && num <= max)
    .sort((a, b) => a - b);

  // 2. Adjust the max range down by the number of active exclusions
  const availableRangeCount = (max - min + 1) - uniqueExcludes.length;

  if (availableRangeCount <= 0) return null; // No available options

  // 3. Generate a random index within the newly shrunk range
  let randomNum = Math.floor(Math.random() * availableRangeCount) + min;

  // 4. Shift the random number upward for every exclusion it meets or passes
  for (const exclude of uniqueExcludes) {
    if (randomNum >= exclude) {
      randomNum++;
    } else {
      break; // Safe to stop checking since uniqueExcludes is sorted
    }
  }

  return randomNum;
}