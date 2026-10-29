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

const ACTIVATION_KEYS = new Set(['Enter', ' ', 'Space']);

const isElement = (target: EventTarget | null): target is Element =>
  typeof Element !== 'undefined' && target instanceof Element;

export const shouldIgnoreShortcut = (
  event: Pick<KeyboardEvent, 'key' | 'target'>
): boolean => {
  const { target, key } = event;
  if (!isElement(target)) return false;
  if (target.closest(ALWAYS_IGNORED_SELECTOR)) return true;
  return (
    ACTIVATION_KEYS.has(key) && target.closest(ACTIVATABLE_SELECTOR) !== null
  );
};
