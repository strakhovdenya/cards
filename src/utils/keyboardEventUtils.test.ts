// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { shouldIgnoreShortcut } from './keyboardEventUtils';

const mount = (html: string, selector: string): Element => {
  document.body.innerHTML = html;
  const element = document.querySelector(selector);
  if (!element) throw new Error(`No element for ${selector}`);
  return element;
};

const press = (target: EventTarget, key: string) =>
  shouldIgnoreShortcut({ key, target });

describe('shouldIgnoreShortcut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('classifies shortcut targets', () => {
    const ignoredTargets = [
      ['<input id="t" />', '#t'],
      ['<textarea id="t"></textarea>', '#t'],
      ['<select id="t"><option>a</option></select>', '#t'],
      ['<div id="t" contenteditable="true"></div>', '#t'],
      ['<div id="t" contenteditable=""></div>', '#t'],
      ['<div role="dialog"><span id="t"></span></div>', '#t'],
      ['<div class="MuiModal-root"><span id="t"></span></div>', '#t'],
      ['<button id="t">ok</button>', '#t'],
      ['<button><span id="t">ok</span></button>', '#t'],
      ['<a id="t" href="/x">link</a>', '#t'],
      ['<div id="t" role="tab" tabindex="0"></div>', '#t'],
      ['<div id="t" contenteditable="plaintext-only"></div>', '#t'],
      ['<div id="t" role="combobox" tabindex="0"></div>', '#t'],
    ];
    for (const [html, selector] of ignoredTargets) {
      expect(press(mount(html, selector), 'Enter'), html).toBe(true);
    }
    expect(press(document.body, 'Enter')).toBe(false);
  });

  it('lets letter shortcuts through on buttons', () => {
    const button = mount('<button id="t">ok</button>', '#t');
    expect(press(button, 'a')).toBe(false);
    expect(press(button, ' ')).toBe(true);
  });

  it('ignores letters typed into inputs', () => {
    expect(press(mount('<input id="t" />', '#t'), 'f')).toBe(true);
  });

  it('does not ignore contenteditable="false"', () => {
    const element = mount('<div id="t" contenteditable="false"></div>', '#t');
    expect(press(element, 'Enter')).toBe(false);
  });

  it('ignores modifier combos', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      const event = { key: 'p', target: document.body, [modifier]: true };
      expect(shouldIgnoreShortcut(event), modifier).toBe(true);
    }
    expect(press(document.body, 'p')).toBe(false);
  });

  it('ignores repeated activation keys', () => {
    const target = document.body;
    for (const key of ['Enter', ' ', 'Escape']) {
      expect(shouldIgnoreShortcut({ key, target, repeat: true }), key).toBe(
        true
      );
      expect(shouldIgnoreShortcut({ key, target, repeat: false }), key).toBe(
        false
      );
    }
    expect(shouldIgnoreShortcut({ key: 'a', target, repeat: true })).toBe(
      false
    );
  });

  it('ignores arrows on composite widgets', () => {
    const widgets = [
      '<div id="t" role="tab" tabindex="0"></div>',
      '<div id="t" role="slider" tabindex="0"></div>',
      '<div id="t" role="radio" tabindex="0"></div>',
    ];
    for (const html of widgets) {
      const target = mount(html, '#t');
      expect(press(target, 'ArrowLeft'), html).toBe(true);
      expect(press(target, 'ArrowRight'), html).toBe(true);
    }
    expect(press(document.body, 'ArrowLeft')).toBe(false);
    expect(press(document.body, 'ArrowRight')).toBe(false);
  });

  it('does not ignore events without an element target', () => {
    expect(press(window, 'Enter')).toBe(false);
  });
});
