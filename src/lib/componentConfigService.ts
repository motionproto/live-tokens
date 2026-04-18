import type { ComponentConfig, ComponentConfigMeta } from './themeTypes';

/**
 * REST client for per-component config files. Parallel to `themeService.ts`
 * but scoped to `/api/component-configs/*`. Each component (button, card, …)
 * has its own lifecycle: default.json (generated from the `.svelte` source),
 * plus user-authored named configs, each with its own active / production
 * pointer and _backups directory.
 */

export interface ComponentSummary {
  name: string;
  activeFile: string;
  productionFile: string;
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const res = await fetch('/api/component-configs');
  if (!res.ok) throw new Error('Failed to list components');
  const data = await res.json();
  return data.components;
}

export async function listComponentConfigs(component: string): Promise<{
  component: string;
  files: ComponentConfigMeta[];
  activeFile: string;
  productionFile: string;
}> {
  const res = await fetch(`/api/component-configs/${encodeURIComponent(component)}`);
  if (!res.ok) throw new Error(`Failed to list configs for ${component}`);
  return res.json();
}

export async function loadComponentConfig(component: string, fileName: string): Promise<ComponentConfig> {
  const res = await fetch(
    `/api/component-configs/${encodeURIComponent(component)}/${encodeURIComponent(fileName)}`,
  );
  if (!res.ok) throw new Error(`Failed to load ${component}/${fileName}`);
  return res.json();
}

export async function saveComponentConfig(
  component: string,
  fileName: string,
  data: ComponentConfig,
): Promise<void> {
  const res = await fetch(
    `/api/component-configs/${encodeURIComponent(component)}/${encodeURIComponent(fileName)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Save failed');
  }
}

export async function deleteComponentConfig(component: string, fileName: string): Promise<void> {
  const res = await fetch(
    `/api/component-configs/${encodeURIComponent(component)}/${encodeURIComponent(fileName)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Delete failed');
  }
}

export async function getActiveComponentConfig(component: string): Promise<ComponentConfig | null> {
  try {
    const res = await fetch(`/api/component-configs/${encodeURIComponent(component)}/active`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function setActiveComponentFile(component: string, fileName: string): Promise<void> {
  const res = await fetch(`/api/component-configs/${encodeURIComponent(component)}/active`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Set active failed');
  }
}

export interface ComponentProductionInfo {
  fileName: string;
  name: string;
  aliases: Record<string, string>;
}

export async function getComponentProductionInfo(component: string): Promise<ComponentProductionInfo> {
  const res = await fetch(`/api/component-configs/${encodeURIComponent(component)}/production`);
  if (!res.ok) throw new Error('Failed to get production info');
  return res.json();
}

export async function setComponentProductionFile(
  component: string,
  fileName: string,
): Promise<{ ok: boolean; productionFile: string }> {
  const res = await fetch(`/api/component-configs/${encodeURIComponent(component)}/production`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Set production failed');
  }
  return res.json();
}
