// Shapes of the JSON the API returns (ObjectIds and dates arrive as strings).
import type {
  AuditAction,
  CourseCategory,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  LearningGoal,
  Lesson,
  Role,
  UserStatus,
} from '@lp/shared';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserRef {
  _id: string;
  name: string;
  username?: string;
  email?: string;
  role?: Role;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  createdBy?: UserRef | string;
  preferences?: Preferences;
}

export interface Preferences {
  categories: CourseCategory[];
  level: CourseLevel;
  goal: LearningGoal;
  updatedAt?: string;
}

export interface Suggestions {
  preferences: Preferences | null;
  courses: CourseSummary[];
}

export interface CourseSummary {
  _id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  status: CourseStatus;
  enrollmentCount: number;
  instructor?: UserRef;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course extends CourseSummary {
  content: Lesson[];
  /** Only present for signed-in students. */
  isEnrolled?: boolean;
}

export interface Enrollment {
  _id: string;
  course: CourseSummary;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
}

export interface CourseStudent {
  _id: string;
  student: UserRef | null;
  status: EnrollmentStatus;
  enrolledAt: string;
}

export interface Recommendation {
  course: CourseSummary & { isEnrolled: boolean };
  reason: string;
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  summary: string;
}

export interface Stats {
  users: { byRole: Partial<Record<Role, number>>; byStatus: Partial<Record<UserStatus, number>> };
  courses: { byStatus: Partial<Record<CourseStatus, number>> };
  enrollments: { total: number; lastWeek: number };
  topCourses: Pick<CourseSummary, '_id' | 'title' | 'enrollmentCount' | 'category'>[];
}

export interface AuditLogEntry {
  _id: string;
  actor: UserRef | null;
  actorUsername: string;
  action: AuditAction;
  targetType?: 'User' | 'Course';
  targetId?: string;
  metadata?: {
    username?: string;
    title?: string;
    from?: string;
    to?: string;
    fields?: string[];
    [key: string]: unknown;
  };
  ip?: string;
  createdAt: string;
}
