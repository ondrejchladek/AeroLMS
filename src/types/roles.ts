export const ROLES = {
  ADMIN: 'ADMIN',
  TRAINER: 'TRAINER',
  WORKER: 'WORKER'
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const isAdmin = (role: string | null | undefined): boolean => {
  return role === ROLES.ADMIN;
};

export const isTrainer = (role: string | null | undefined): boolean => {
  return role === ROLES.TRAINER;
};

export const isWorker = (role: string | null | undefined): boolean => {
  return role === ROLES.WORKER;
};

export const canManageTraining = (
  role: string | null | undefined,
  trainerId?: number | null,
  userId?: number | null
): boolean => {
  if (isAdmin(role)) return true;
  if (isTrainer(role) && trainerId && userId && trainerId === userId)
    return true;
  return false;
};

export const getRoleLabel = (role: string | null | undefined): string => {
  switch (role) {
    case ROLES.ADMIN:
      return 'Administrátor';
    case ROLES.TRAINER:
      return 'Školitel';
    case ROLES.WORKER:
      return 'Zaměstnanec';
    default:
      return 'Neznámá role';
  }
};
