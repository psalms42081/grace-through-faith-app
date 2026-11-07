/** A prayer is answered only after an explicit Mark answered action. */
export function isPrayerAnswered(answered: unknown): boolean {
  return answered === true;
}
