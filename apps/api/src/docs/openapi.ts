import {
  ASSIGNABLE_ROLES,
  AUDIT_ACTIONS,
  COURSE_LEVELS,
  LEARNING_GOALS,
  ROLES,
  USER_STATUS,
} from '@lp/shared';

// ---------- helpers ----------
type Schema = Record<string, unknown>;

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: Schema) => ({ content: { 'application/json': { schema } } });
const body = (schema: Schema) => ({ required: true, ...json(schema) });
const arrayOf = (schema: Schema): Schema => ({ type: 'array', items: schema });

function success(
  data: Schema,
  { description = 'OK', paginated = false }: { description?: string; paginated?: boolean } = {},
) {
  const properties: Schema = { success: { type: 'boolean', example: true }, data };
  if (paginated) properties.meta = ref('PaginationMeta');
  return { description, ...json({ type: 'object', properties }) };
}

const errors = (...codes: number[]) =>
  Object.fromEntries(codes.map((code) => [code, { $ref: `#/components/responses/E${code}` }]));

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const query = (name: string, schema: Schema, description?: string) => ({
  name,
  in: 'query',
  schema,
  description,
});
const pageParams = [
  query('page', { type: 'integer', minimum: 1, default: 1 }),
  query('limit', { type: 'integer', minimum: 1, maximum: 50, default: 10 }),
];
const courseFilterParams = [
  query('search', { type: 'string' }, 'Case-insensitive match on title, description or category'),
  query('category', { type: 'string' }, 'A category name from GET /categories'),
  query('level', { type: 'string', enum: COURSE_LEVELS }),
  ...pageParams,
];

const PREFERENCES: Schema = {
  type: 'object',
  required: ['categories', 'level', 'goal'],
  properties: {
    categories: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'string', description: 'A category name from GET /categories' },
    },
    level: { type: 'string', enum: COURSE_LEVELS },
    goal: { type: 'string', enum: Object.values(LEARNING_GOALS) },
  },
};

const errorResponse = (description: string) => ({ description, ...json(ref('Error')) });

// ---------- components ----------
const components = {
  securitySchemes: {
    cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  },
  responses: {
    E400: errorResponse('Validation failed'),
    E401: errorResponse('Not signed in, or the session is no longer valid'),
    E403: errorResponse('Signed in but not allowed'),
    E404: errorResponse('Not found'),
    E409: errorResponse('Conflict (duplicate)'),
    E429: errorResponse('Rate limited'),
    E502: errorResponse('Upstream AI provider failed'),
  },
  schemas: {
    Error: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    PaginationMeta: {
      type: 'object',
      properties: {
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
        totalPages: { type: 'integer' },
      },
    },
    User: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', enum: Object.values(ROLES) },
        status: { type: 'string', enum: Object.values(USER_STATUS) },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    Category: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        active: { type: 'boolean', description: 'Hidden categories stay on existing courses' },
        courseCount: { type: 'integer', description: 'Admin list only' },
      },
    },
    Lesson: {
      type: 'object',
      properties: { title: { type: 'string' }, body: { type: 'string' } },
    },
    Course: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', description: 'A category name from GET /categories' },
        level: { type: 'string', enum: COURSE_LEVELS },
        content: arrayOf(ref('Lesson')),
        instructor: {
          type: 'object',
          properties: { _id: { type: 'string' }, name: { type: 'string' } },
        },
        status: { type: 'string', enum: ['draft', 'published', 'archived'] },
        enrollmentCount: { type: 'integer' },
        isEnrolled: { type: 'boolean', description: 'Only present for signed-in students' },
      },
    },
    CourseInput: {
      type: 'object',
      required: ['title', 'description', 'category'],
      properties: {
        title: { type: 'string', example: 'Intro to Node.js' },
        description: { type: 'string', example: 'Build servers with Node.js and Express.' },
        category: { type: 'string', description: 'A category name from GET /categories' },
        level: { type: 'string', enum: COURSE_LEVELS },
        content: arrayOf(ref('Lesson')),
        status: { type: 'string', enum: ['draft', 'published', 'archived'] },
      },
    },
    Enrollment: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        course: ref('Course'),
        student: { oneOf: [{ type: 'string' }, ref('User')] },
        status: { type: 'string', enum: ['active', 'completed'] },
        enrolledAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};

// ---------- paths ----------
const auth = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register as a student or instructor (instructors start pending)',
      requestBody: body({
        type: 'object',
        required: ['name', 'username', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Ada Lovelace' },
          username: { type: 'string', example: 'ada' },
          email: { type: 'string', example: 'ada@example.com' },
          password: { type: 'string', example: 'correct-horse-battery' },
          role: { type: 'string', enum: ['student', 'instructor'], default: 'student' },
        },
      }),
      responses: {
        201: success(
          { type: 'object', properties: { user: ref('User') } },
          { description: 'Created; the session is set as the httpOnly `token` cookie' },
        ),
        ...errors(400, 409, 429),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in (the session is set as an httpOnly cookie, never returned in the body)',
      requestBody: body({
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'student1' },
          password: { type: 'string', example: 'Password123!' },
        },
      }),
      responses: {
        200: success({ type: 'object', properties: { user: ref('User') } }),
        ...errors(400, 401, 403, 429),
      },
    },
  },
  '/auth/logout': {
    post: { tags: ['Auth'], summary: 'Clear the session cookie', responses: { 200: success({}) } },
  },
  '/auth/me/password': {
    put: {
      tags: ['Auth'],
      summary: 'Change your password (signs out every other session)',
      requestBody: body({
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      }),
      responses: {
        200: success(
          { type: 'object', properties: { user: ref('User') } },
          { description: 'Changed; a fresh session cookie is set for this client' },
        ),
        ...errors(400, 401, 429),
      },
    },
  },
  '/auth/me/preferences': {
    put: {
      tags: ['Auth'],
      summary: "Save the student's three onboarding answers (field, level, goal)",
      requestBody: body(PREFERENCES),
      responses: {
        200: success({ type: 'object', properties: { user: ref('User') } }),
        ...errors(400, 401, 403),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: {
        200: success({ type: 'object', properties: { user: ref('User') } }),
        ...errors(401, 403),
      },
    },
  },
};

const courses = {
  '/courses': {
    get: {
      tags: ['Courses'],
      summary: 'Browse published courses',
      parameters: courseFilterParams,
      responses: { 200: success(arrayOf(ref('Course')), { paginated: true }), ...errors(400) },
    },
    post: {
      tags: ['Courses'],
      summary: 'Create a course (active instructors)',
      requestBody: body(ref('CourseInput')),
      responses: { 201: success(ref('Course')), ...errors(400, 401, 403) },
    },
  },
  '/categories': {
    get: {
      tags: ['Courses'],
      summary: 'Visible course categories (for forms, filters and onboarding)',
      security: [],
      responses: { 200: success(arrayOf(ref('Category'))) },
    },
  },
  '/courses/suggested': {
    get: {
      tags: ['Courses'],
      summary: 'Suggestions from the onboarding answers (students; rule-based, no AI)',
      description:
        "Published courses in the student's chosen fields, their level first, excluding courses they are enrolled in.",
      responses: {
        200: success({
          type: 'object',
          properties: { preferences: PREFERENCES, courses: arrayOf(ref('Course')) },
        }),
        ...errors(401, 403),
      },
    },
  },
  '/courses/mine': {
    get: {
      tags: ['Courses'],
      summary: "The signed-in instructor's courses (all statuses)",
      responses: { 200: success(arrayOf(ref('Course'))), ...errors(401, 403) },
    },
  },
  '/courses/{id}': {
    parameters: [idParam],
    get: {
      tags: ['Courses'],
      summary: 'Course detail (drafts visible to the owner and admins only)',
      responses: { 200: success(ref('Course')), ...errors(400, 404) },
    },
    put: {
      tags: ['Courses'],
      summary: 'Update a course (owner, or admin for any course)',
      requestBody: body(ref('CourseInput')),
      responses: { 200: success(ref('Course')), ...errors(400, 401, 403, 404) },
    },
    delete: {
      tags: ['Courses'],
      summary: 'Delete a course and its enrollments (owner, or admin)',
      responses: { 200: success({}), ...errors(401, 403, 404) },
    },
  },
  '/courses/{id}/students': {
    parameters: [idParam],
    get: {
      tags: ['Courses'],
      summary: 'Students enrolled in a course (owner, or admin)',
      responses: { 200: success(arrayOf(ref('Enrollment'))), ...errors(401, 403, 404) },
    },
  },
};

const enrollments = {
  '/enrollments': {
    post: {
      tags: ['Enrollments'],
      summary: 'Enroll in a published course (students)',
      requestBody: body({
        type: 'object',
        required: ['courseId'],
        properties: { courseId: { type: 'string' } },
      }),
      responses: { 201: success(ref('Enrollment')), ...errors(400, 401, 403, 404, 409) },
    },
  },
  '/enrollments/me': {
    get: {
      tags: ['Enrollments'],
      summary: "The signed-in student's enrollments",
      responses: { 200: success(arrayOf(ref('Enrollment'))), ...errors(401, 403) },
    },
  },
  '/enrollments/{id}': {
    parameters: [idParam],
    delete: {
      tags: ['Enrollments'],
      summary: 'Leave a course (your own enrollment)',
      responses: { 200: success({}), ...errors(401, 403, 404) },
    },
  },
  '/enrollments/{id}/complete': {
    parameters: [idParam],
    patch: {
      tags: ['Enrollments'],
      summary: 'Mark one of your enrollments completed',
      responses: { 200: success(ref('Enrollment')), ...errors(401, 403, 404) },
    },
  },
};

const recommendations = {
  '/recommendations': {
    post: {
      tags: ['AI'],
      summary: 'Grounded course recommendations (students and guests; rate-limited)',
      security: [{}, { cookieAuth: [] }, { bearerAuth: [] }],
      description:
        'Open to guests (5 requests / 15 min per IP) and students (10 / 15 min). Signed-in students ' +
        'also get their onboarding answers added as context. The published catalog is retrieved ' +
        'first and the model may only choose from it. ' +
        'Every returned id is re-validated against the database before it reaches the client.',
      requestBody: body({
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: {
            type: 'string',
            example: 'I want to be a software engineer, what courses should I follow?',
          },
        },
      }),
      responses: {
        200: success({
          type: 'object',
          properties: {
            summary: { type: 'string' },
            recommendations: arrayOf({
              type: 'object',
              properties: { course: ref('Course'), reason: { type: 'string' } },
            }),
          },
        }),
        ...errors(400, 401, 403, 429, 502),
      },
    },
  },
};

const userListParams = [
  query('role', { type: 'string', enum: Object.values(ROLES) }),
  query('status', { type: 'string', enum: Object.values(USER_STATUS) }),
  query('search', { type: 'string' }, 'Matches name, username or email'),
  ...pageParams,
];

const admin = {
  '/admin/stats': {
    get: {
      tags: ['Admin'],
      summary: 'Platform stats (MongoDB aggregations)',
      responses: {
        200: success({
          type: 'object',
          properties: {
            users: {
              type: 'object',
              properties: {
                byRole: { type: 'object', additionalProperties: { type: 'integer' } },
                byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
              },
            },
            courses: {
              type: 'object',
              properties: {
                byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
              },
            },
            enrollments: {
              type: 'object',
              properties: { total: { type: 'integer' }, lastWeek: { type: 'integer' } },
            },
            topCourses: arrayOf(ref('Course')),
          },
        }),
        ...errors(401, 403),
      },
    },
  },
  '/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'List users',
      parameters: userListParams,
      responses: { 200: success(arrayOf(ref('User')), { paginated: true }), ...errors(401, 403) },
    },
  },
  '/admin/users/{id}/status': {
    parameters: [idParam],
    patch: {
      tags: ['Admin'],
      summary: 'Suspend or reactivate a user (strictly lower role only; suspension is instant)',
      requestBody: body({
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['active', 'suspended'] } },
      }),
      responses: { 200: success(ref('User')), ...errors(400, 401, 403, 404) },
    },
  },
  '/admin/instructors/{id}/approve': {
    parameters: [idParam],
    patch: {
      tags: ['Admin'],
      summary: 'Approve a pending instructor',
      responses: { 200: success(ref('User')), ...errors(400, 401, 403, 404) },
    },
  },
  '/admin/courses': {
    get: {
      tags: ['Admin'],
      summary: 'All courses, any status',
      parameters: [
        query('status', { type: 'string', enum: ['draft', 'published', 'archived'] }),
        ...courseFilterParams,
      ],
      responses: { 200: success(arrayOf(ref('Course')), { paginated: true }), ...errors(401, 403) },
    },
  },
  '/admin/courses/{id}/status': {
    parameters: [idParam],
    patch: {
      tags: ['Admin'],
      summary: 'Publish, unpublish (draft) or archive any course',
      requestBody: body({
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['draft', 'published', 'archived'] } },
      }),
      responses: { 200: success(ref('Course')), ...errors(400, 401, 403, 404) },
    },
  },
  '/admin/courses/{id}': {
    parameters: [idParam],
    delete: {
      tags: ['Admin'],
      summary: 'Delete any course and its enrollments',
      responses: { 200: success({}), ...errors(401, 403, 404) },
    },
  },
  '/admin/categories': {
    get: {
      tags: ['Admin'],
      summary: 'All categories, hidden ones included, with course counts',
      responses: { 200: success(arrayOf(ref('Category'))), ...errors(401, 403) },
    },
    post: {
      tags: ['Admin'],
      summary: 'Add a category',
      requestBody: body({
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', example: 'Mobile Development' } },
      }),
      responses: { 201: success(ref('Category')), ...errors(400, 401, 403, 409) },
    },
  },
  '/admin/categories/{id}': {
    parameters: [idParam],
    patch: {
      tags: ['Admin'],
      summary: 'Rename (courses and student interests follow) or hide/show a category',
      requestBody: body({
        type: 'object',
        properties: { name: { type: 'string' }, active: { type: 'boolean' } },
      }),
      responses: { 200: success(ref('Category')), ...errors(400, 401, 403, 404, 409) },
    },
  },
};

const superadmin = {
  '/superadmin/admins': {
    get: {
      tags: ['Super admin'],
      summary: 'List admins',
      responses: { 200: success(arrayOf(ref('User'))), ...errors(401, 403) },
    },
    post: {
      tags: ['Super admin'],
      summary: 'Create an admin',
      requestBody: body({
        type: 'object',
        required: ['name', 'username', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
        },
      }),
      responses: { 201: success(ref('User')), ...errors(400, 401, 403, 409) },
    },
  },
  '/superadmin/admins/{id}': {
    parameters: [idParam],
    delete: {
      tags: ['Super admin'],
      summary: 'Remove an admin account',
      responses: { 200: success({}), ...errors(400, 401, 403, 404) },
    },
  },
  '/superadmin/users/{id}/role': {
    parameters: [idParam],
    patch: {
      tags: ['Super admin'],
      summary: "Change a user's role (never to superadmin); ends their sessions",
      requestBody: body({
        type: 'object',
        required: ['role'],
        properties: { role: { type: 'string', enum: ASSIGNABLE_ROLES } },
      }),
      responses: { 200: success(ref('User')), ...errors(400, 401, 403, 404) },
    },
  },
  '/superadmin/audit-logs': {
    get: {
      tags: ['Super admin'],
      summary: 'Audit log of privileged actions',
      parameters: [
        query('actor', { type: 'string' }, 'User id of the actor'),
        query('action', { type: 'string', enum: Object.values(AUDIT_ACTIONS) }),
        ...pageParams,
      ],
      responses: {
        200: success(
          arrayOf({
            type: 'object',
            properties: {
              actor: ref('User'),
              actorUsername: { type: 'string' },
              action: { type: 'string' },
              targetType: { type: 'string' },
              targetId: { type: 'string' },
              metadata: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          }),
          { paginated: true },
        ),
        ...errors(401, 403),
      },
    },
  },
};

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Learning Platform API',
    version: '1.0.0',
    description:
      'All responses use `{ success, data, meta? }` or `{ success: false, message, errors? }`.\n\n' +
      'Authenticate with **POST /auth/login**: the session is an httpOnly cookie, which ' +
      'Swagger, Postman and browsers all keep automatically. Scripts may also send ' +
      '`Authorization: Bearer <jwt>`.',
  },
  servers: [{ url: '/api' }],
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  tags: [
    { name: 'Auth' },
    { name: 'Courses' },
    { name: 'Enrollments' },
    { name: 'AI' },
    { name: 'Admin', description: 'admin and superadmin' },
    { name: 'Super admin', description: 'superadmin only' },
  ],
  components,
  paths: { ...auth, ...courses, ...enrollments, ...recommendations, ...admin, ...superadmin },
};
