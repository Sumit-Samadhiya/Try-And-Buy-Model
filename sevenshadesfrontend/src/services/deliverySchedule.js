export const deliverySlots = ['10:00 AM - 02:00 PM', '02:00 PM - 06:00 PM', '06:00 PM - 09:00 PM'];
export const indiaDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const slotAvailable = (date, slot, now = Date.now()) => {
  const hour = [14, 18, 21][deliverySlots.indexOf(slot)];
  return !!hour && new Date(`${date}T${hour}:00:00+05:30`).getTime() > now;
};
