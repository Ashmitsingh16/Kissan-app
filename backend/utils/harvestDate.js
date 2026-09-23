module.exports = function harvestDate(value, sowingDate) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid harvest date');
  const date = new Date(value + 'T00:00:00.000Z');
  const sowing = new Date(sowingDate);
  const days = (date - sowing) / 86400000;
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value ||
      !Number.isFinite(days) || days < 0 || days > 730) throw new Error('Harvest date is outside the supported two-year crop window');
  return date;
};
