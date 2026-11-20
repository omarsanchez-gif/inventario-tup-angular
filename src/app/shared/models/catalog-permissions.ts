export const permissionModuleDefinitions = [
  {
    id: 'categorias',
    label: 'Categorías',
    route: '/configuraciones/categorias',
  },
  {
    id: 'fabricantes',
    label: 'Fabricantes',
    route: '/configuraciones/fabricantes',
  },
  {
    id: 'modelosActivos',
    label: 'Modelos de activos',
    route: '/configuraciones/modelos-activos',
  },
  {
    id: 'campus',
    label: 'Campus',
    route: '/configuraciones/campus',
  },
  {
    id: 'areas',
    label: 'Áreas',
    route: '/configuraciones/areas',
  },
] as const;
export const permissionActionDefinitions = [
  { id: 'ver', label: 'Ver' },
  { id: 'crear', label: 'Crear' },
  { id: 'editar', label: 'Editar' },
  { id: 'cambiarEstado', label: 'Cambiar estado' },
  { id: 'eliminar', label: 'Eliminar' },
] as const;

export type PermissionModule = (typeof permissionModuleDefinitions)[number]['id'];
export type PermissionAction = (typeof permissionActionDefinitions)[number]['id'];
export type PermissionMap = Readonly<Record<PermissionModule, readonly PermissionAction[]>>;

export const permissionModules = permissionModuleDefinitions.map(
  ({ id }) => id,
) as readonly PermissionModule[];
export const permissionActions = permissionActionDefinitions.map(
  ({ id }) => id,
) as readonly PermissionAction[];

function permissionMap(factory: () => readonly PermissionAction[]): PermissionMap {
  return Object.fromEntries(
    permissionModules.map((module) => [module, factory()]),
  ) as PermissionMap;
}

export function emptyPermissionMap(): PermissionMap {
  return permissionMap(() => []);
}

export function fullPermissionMap(): PermissionMap {
  return permissionMap(() => [...permissionActions]);
}

export function hasPermission(
  role: 'admin' | 'usuario' | null,
  permissions: PermissionMap | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  return (
    role === 'admin' || (role === 'usuario' && permissions?.[module]?.includes(action) === true)
  );
}
