export const permissionModules = ['categorias', 'fabricantes', 'modelosActivos', 'campus'] as const;
export const permissionActions = ['ver', 'crear', 'editar', 'cambiarEstado', 'eliminar'] as const;

export type PermissionModule = (typeof permissionModules)[number];
export type PermissionAction = (typeof permissionActions)[number];
export type PermissionMap = Readonly<Record<PermissionModule, readonly PermissionAction[]>>;

export function emptyPermissionMap(): PermissionMap {
  return { categorias: [], fabricantes: [], modelosActivos: [], campus: [] };
}

export function fullPermissionMap(): PermissionMap {
  return {
    categorias: [...permissionActions],
    fabricantes: [...permissionActions],
    modelosActivos: [...permissionActions],
    campus: [...permissionActions],
  };
}

export function hasPermission(
  role: 'admin' | 'usuario' | null,
  permissions: PermissionMap | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  return (
    role === 'admin' || (role === 'usuario' && permissions?.[module].includes(action) === true)
  );
}
