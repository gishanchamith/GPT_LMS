type ValueOf<T> = T[keyof T];

export const USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;
export type UserStatus = ValueOf<typeof USER_STATUS>;

export const COURSE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;
export type CourseStatus = ValueOf<typeof COURSE_STATUS>;

export const ENROLLMENT_STATUS = { ACTIVE: 'active', COMPLETED: 'completed' } as const;
export type EnrollmentStatus = ValueOf<typeof ENROLLMENT_STATUS>;

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_CATEGORIES = [
  'Software Engineering',
  'Data Science',
  'Design',
  'Business',
  'Cloud & DevOps',
  'Cybersecurity',
] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export const AUDIT_ACTIONS = {
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  INSTRUCTOR_APPROVED: 'INSTRUCTOR_APPROVED',
  COURSE_UPDATED: 'COURSE_UPDATED',
  COURSE_STATUS_CHANGED: 'COURSE_STATUS_CHANGED',
  COURSE_DELETED: 'COURSE_DELETED',
  ADMIN_CREATED: 'ADMIN_CREATED',
  ADMIN_REMOVED: 'ADMIN_REMOVED',
  ROLE_CHANGED: 'ROLE_CHANGED',
} as const;
export type AuditAction = ValueOf<typeof AUDIT_ACTIONS>;

// Onboarding question 3: what the student wants out of learning.
export const LEARNING_GOALS = {
  CAREER_CHANGE: 'career-change',
  GROW_IN_ROLE: 'grow-in-role',
  BUILD_PROJECT: 'build-project',
  EXPLORE: 'explore',
} as const;
export type LearningGoal = ValueOf<typeof LEARNING_GOALS>;

export const LEARNING_GOAL_LABELS: Readonly<Record<LearningGoal, string>> = {
  [LEARNING_GOALS.CAREER_CHANGE]: 'Start a new career',
  [LEARNING_GOALS.GROW_IN_ROLE]: 'Grow in my current role',
  [LEARNING_GOALS.BUILD_PROJECT]: 'Build a project or side business',
  [LEARNING_GOALS.EXPLORE]: 'Explore something new for fun',
};
