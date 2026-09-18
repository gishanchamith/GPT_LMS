export const ROLES = {
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Higher number = more authority. Used by outranks() for the hierarchy rule.
export const ROLE_LEVEL: Readonly<Record<Role, number>> = {
  [ROLES.STUDENT]: 1,
  [ROLES.INSTRUCTOR]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.SUPERADMIN]: 3,
};

// The only roles a visitor may pick on the public register form.
export const SELF_REGISTER_ROLES = [ROLES.STUDENT, ROLES.INSTRUCTOR] as const;

// Roles the super admin may assign (never superadmin — there is exactly one).
export const ASSIGNABLE_ROLES = [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.ADMIN] as const;

export const PERMISSIONS = {
  COURSE_CREATE: 'course:create',
  COURSE_UPDATE_OWN: 'course:update:own',
  COURSE_DELETE_OWN: 'course:delete:own',
  COURSE_UPDATE_ANY: 'course:update:any',
  COURSE_DELETE_ANY: 'course:delete:any',
  COURSE_READ_ANY: 'course:read:any',
  COURSE_STUDENTS_OWN: 'course:students:own',
  COURSE_STUDENTS_ANY: 'course:students:any',
  ENROLLMENT_CREATE: 'enrollment:create',
  ENROLLMENT_READ_OWN: 'enrollment:read:own',
  ENROLLMENT_UPDATE_OWN: 'enrollment:update:own',
  RECOMMENDATION_CREATE: 'recommendation:create',
  USER_READ: 'user:read',
  USER_STATUS: 'user:status',
  INSTRUCTOR_APPROVE: 'instructor:approve',
  STATS_READ: 'stats:read',
  ADMIN_MANAGE: 'admin:manage',
  ROLE_CHANGE: 'role:change',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

const ADMIN_PERMISSIONS: Permission[] = [
  P.COURSE_UPDATE_ANY,
  P.COURSE_DELETE_ANY,
  P.COURSE_READ_ANY,
  P.COURSE_STUDENTS_ANY,
  P.USER_READ,
  P.USER_STATUS,
  P.INSTRUCTOR_APPROVE,
  P.STATS_READ,
];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [ROLES.STUDENT]: [
    P.ENROLLMENT_CREATE,
    P.ENROLLMENT_READ_OWN,
    P.ENROLLMENT_UPDATE_OWN,
    P.RECOMMENDATION_CREATE,
  ],
  [ROLES.INSTRUCTOR]: [
    P.COURSE_CREATE,
    P.COURSE_UPDATE_OWN,
    P.COURSE_DELETE_OWN,
    P.COURSE_STUDENTS_OWN,
  ],
  [ROLES.ADMIN]: ADMIN_PERMISSIONS,
  [ROLES.SUPERADMIN]: [...ADMIN_PERMISSIONS, P.ADMIN_MANAGE, P.ROLE_CHANGE, P.AUDIT_READ],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role].includes(permission));
}

// Strictly greater: an admin cannot manage another admin, nobody manages the super admin.
export function outranks(actorRole: Role, targetRole: Role): boolean {
  return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}

// Where each role lands after login.
export const ROLE_HOME: Readonly<Record<Role, string>> = {
  [ROLES.STUDENT]: '/courses',
  [ROLES.INSTRUCTOR]: '/instructor/courses',
  [ROLES.ADMIN]: '/admin',
  [ROLES.SUPERADMIN]: '/admin',
};
