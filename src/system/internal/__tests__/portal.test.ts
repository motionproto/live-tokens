// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { portal } from '../portal';

let container: HTMLDivElement;

beforeEach(() => {
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.innerHTML = '';
});

function nodeInContainer(): HTMLElement {
  const node = document.createElement('div');
  container.appendChild(node);
  return node;
}

describe('portal action', () => {
  it('moves the node to <body> when enabled', () => {
    const node = nodeInContainer();
    portal(node, true);
    expect(node.parentElement).toBe(document.body);
  });

  it('leaves the node in place when disabled at init', () => {
    const node = nodeInContainer();
    portal(node, false);
    expect(node.parentElement).toBe(container);
  });

  it('destroy() removes a portaled node', () => {
    const node = nodeInContainer();
    const action = portal(node, true);
    action.destroy();
    expect(node.isConnected).toBe(false);
  });

  it('returns the node to its original slot when toggled back', () => {
    const node = nodeInContainer();
    const sibling = document.createElement('span');
    container.appendChild(sibling); // node should land before this on return

    const action = portal(node, false);
    expect(node.parentElement).toBe(container);

    action.update(true);
    expect(node.parentElement).toBe(document.body);

    action.update(false);
    expect(node.parentElement).toBe(container);
    // Restored ahead of the sibling that followed it originally.
    expect(node.nextElementSibling).toBe(sibling);
  });

  it('repeated toggles keep working and leave no orphan anchor', () => {
    const node = nodeInContainer();
    const action = portal(node, true);
    action.update(false);
    action.update(true);
    action.update(false);
    expect(node.parentElement).toBe(container);
    action.destroy();
    // The action's only added node is the anchor comment; it is gone after
    // destroy. The in-flow node stays — Svelte owns its removal, not us.
    expect(node.parentElement).toBe(container);
    const comments = [...container.childNodes].filter((n) => n.nodeType === Node.COMMENT_NODE);
    expect(comments).toHaveLength(0);
  });
});
