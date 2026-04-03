export function hoursBetween(startAt, endAt) {
  const diff = new Date(endAt).getTime() - new Date(startAt).getTime();
  return Number((diff / (1000 * 60 * 60)).toFixed(2));
}

export function startOfDayIso(value) {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  ).toISOString();
}

export function endOfDayIso(value) {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  ).toISOString();
}

