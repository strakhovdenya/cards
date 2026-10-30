const ALWAYS_IGNORED_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="combobox"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '.MuiModal-root',
].join(', ');

const ACTIVATABLE_SELECTOR = [
  'button',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="switch"]',
].join(', ');

const COMPOSITE_WIDGET_SELECTOR = [
  '[role="tab"]',
  '[role="slider"]',
  '[role="radio"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="spinbutton"]',
].join(', ');

const ACTIVATION_KEYS = new Set(['Enter', ' ', 'Space']);
const NON_REPEATING_KEYS = new Set(['Enter', ' ', 'Space', 'Escape']);
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

const isElement = (target: EventTarget | null): target is Element =>
  typeof Element !== 'undefined' && target instanceof Element;

type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'target'> &
  Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat'>>;

export const shouldIgnoreShortcut = (event: ShortcutEvent): boolean => {
  const { target, key, ctrlKey, metaKey, altKey, repeat } = event;
  if (ctrlKey || metaKey || altKey) return true;
  if (repeat && NON_REPEATING_KEYS.has(key)) return true;
  if (!isElement(target)) return false;
  if (ARROW_KEYS.has(key) && target.closest(COMPOSITE_WIDGET_SELECTOR)) {
    return true;
  }
  if (target.closest(ALWAYS_IGNORED_SELECTOR)) return true;
  return (
    ACTIVATION_KEYS.has(key) && target.closest(ACTIVATABLE_SELECTOR) !== null
  );
};
