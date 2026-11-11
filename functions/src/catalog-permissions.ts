import type { DocumentData, Query, Transaction } from 'firebase-admin/firestore';

export const PERMISSION_MODULES = ['categorias', 'fabricantes', 'modelosActivos'] as const;
export const PERMISSION_ACTIONS = ['ver', 'crear', 'editar', 'cambiarEstado', 'eliminar'] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionMap = Readonly<Record<PermissionModule, readonly PermissionAction[]>>;

export function emptyPermissionMap(): PermissionMap {
  return { categorias: [], fabricantes: [], modelosActivos: [] };
}

export function fullPermissionMap(): PermissionMap {
  return {
    categorias: [...PERMISSION_ACTIONS],
    fabricantes: [...PERMISSION_ACTIONS],
    modelosActivos: [...PERMISSION_ACTIONS],
  };
}

export function sanitizePermissionMap(value: unknown): PermissionMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyPermissionMap();
  const source = value as Readonly<Record<string, unknown>>;
  const result = emptyPermissionMap() as Record<PermissionModule, PermissionAction[]>;
  for (const module of PERMISSION_MODULES) {
    const values = source[module];
    if (!Array.isArray(values)) continue;
    const known = new Set(
      values.filter(
        (item): item is PermissionAction =>
          typeof item === 'string' && PERMISSION_ACTIONS.includes(item as PermissionAction),
      ),
    );
    if (!known.has('ver')) continue;
    result[module] = PERMISSION_ACTIONS.filter((action) => known.has(action));
  }
  return result;
}

export function validatePermissionMap(value: unknown): PermissionMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Readonly<Record<string, unknown>>;
  if (
    Object.keys(source).length !== PERMISSION_MODULES.length ||
    Object.keys(source).some((key) => !PERMISSION_MODULES.includes(key as PermissionModule))
  )
    return null;
  const normalized = emptyPermissionMap() as Record<PermissionModule, PermissionAction[]>;
  for (const module of PERMISSION_MODULES) {
    const values = source[module];
    if (!Array.isArray(values) || new Set(values).size !== values.length) return null;
    if (
      values.some(
        (item) =>
          typeof item !== 'string' || !PERMISSION_ACTIONS.includes(item as PermissionAction),
      )
    )
      return null;
    const actions = values as PermissionAction[];
    if (actions.some((action) => action !== 'ver') && !actions.includes('ver')) return null;
    normalized[module] = PERMISSION_ACTIONS.filter((action) => actions.includes(action));
  }
  return normalized;
}

export function canonicalPermissionFromData(
  data: DocumentData | undefined,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  if (!data || data['activo'] !== true) return false;
  if (data['rol'] === 'admin') return true;
  if (data['rol'] !== 'usuario') return false;
  return sanitizePermissionMap(data['permisos'])[module].includes(action);
}

export async function hasCanonicalPermission(
  transaction: Transaction | null,
  query: Query,
  module: PermissionModule,
  action: PermissionAction,
): Promise<boolean> {
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  return (
    snapshot.size === 1 && canonicalPermissionFromData(snapshot.docs[0]?.data(), module, action)
  );
}
