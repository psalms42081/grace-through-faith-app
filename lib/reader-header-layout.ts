/** Back button (22px icon, 4px padding each side) plus the title's 4px start margin. */
export const READER_HEADER_LEFT_ALLOWANCE = 34;
/** Space kept between the title and the chips. */
export const READER_HEADER_TITLE_GAP = 8;
/** A long version code (e.g. SRP1865) ellipsizes instead of crowding the title. */
export const READER_VERSION_CHIP_MAX_WIDTH = 72;

/**
 * The navigation header gives the right-hand chips whatever width the title leaves and lets
 * them overflow leftwards over it, so the title is capped to the space the measured chips leave.
 * Returns undefined until both widths are known.
 */
export function readerHeaderTitleMaxWidth(headerWidth: number, chipsWidth: number): number | undefined {
  if (headerWidth <= 0 || chipsWidth <= 0) return undefined;
  return Math.max(0, Math.floor(headerWidth - READER_HEADER_LEFT_ALLOWANCE - chipsWidth - READER_HEADER_TITLE_GAP));
}
