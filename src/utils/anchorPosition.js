// Computes fixed-position coordinates for a popover anchored below (or,
// if there isn't room, above) a trigger element's rect — clamped to the
// viewport on every side so the popover is never partially off-screen.
export function computeAnchorPosition(rect, { width, preferredHeight = 320, margin = 16 } = {}) {
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const openUpward = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
  return {
    left: Math.min(rect.left, window.innerWidth - width - margin),
    ...(openUpward
      ? { bottom: window.innerHeight - rect.top + 8, maxHeight: spaceAbove }
      : { top: rect.bottom + 8, maxHeight: spaceBelow }),
  };
}
