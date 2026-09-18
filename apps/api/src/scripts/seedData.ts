import type { CourseCategory, CourseLevel, CourseStatus, Lesson } from '@lp/shared';

// Demo accounts. Every non-superadmin account uses SEED_PASSWORD (default below).
export const DEMO_PASSWORD = 'Password123!';

interface SeedPerson {
  name: string;
  username: string;
  email: string;
  pending?: boolean;
}

export const USERS: { admin: SeedPerson; instructors: SeedPerson[]; students: SeedPerson[] } = {
  admin: { name: 'Amara Perera', username: 'admin', email: 'admin@learnhub.dev' },
  instructors: [
    { name: 'Nimal Fernando', username: 'instructor', email: 'nimal@learnhub.dev' },
    { name: 'Sara Kim', username: 'sara', email: 'sara@learnhub.dev' },
    { name: 'Pending Pat', username: 'pending', email: 'pat@learnhub.dev', pending: true },
  ],
  students: [
    { name: 'Kavindi Silva', username: 'student', email: 'kavindi@learnhub.dev' },
    { name: 'Tom Baker', username: 'tom', email: 'tom@learnhub.dev' },
    { name: 'Priya Nair', username: 'priya', email: 'priya@learnhub.dev' },
    { name: 'Leo Martin', username: 'leo', email: 'leo@learnhub.dev' },
  ],
};

const lessons = (...titles: string[]): Lesson[] =>
  titles.map((title, i) => ({
    title,
    body: `Lesson ${i + 1}: ${title}. Read the notes, follow the walkthrough, then complete the exercise at the end.`,
  }));

export interface SeedCourse {
  /** Index into USERS.instructors */
  by: number;
  title: string;
  category: CourseCategory;
  level: CourseLevel;
  status?: CourseStatus;
  description: string;
  content: Lesson[];
}

export const COURSES: SeedCourse[] = [
  // Software Engineering
  {
    by: 0,
    title: 'Programming Fundamentals with JavaScript',
    category: 'Software Engineering',
    level: 'beginner',
    description:
      'Variables, control flow, functions and data structures. The first course for anyone who wants to become a software engineer.',
    content: lessons('Your first program', 'Control flow', 'Functions', 'Arrays and objects'),
  },
  {
    by: 0,
    title: 'Node.js and Express: Building REST APIs',
    category: 'Software Engineering',
    level: 'intermediate',
    description:
      'Design and build production-ready REST APIs with Node.js, Express, validation, error handling and JWT authentication.',
    content: lessons('HTTP and REST', 'Routing and middleware', 'Validation', 'Auth with JWT'),
  },
  {
    by: 1,
    title: 'React for Frontend Developers',
    category: 'Software Engineering',
    level: 'intermediate',
    description:
      'Components, hooks, state management and data fetching. Build modern single-page apps and understand how React renders.',
    content: lessons(
      'Components and JSX',
      'State and hooks',
      'Effects and data fetching',
      'Routing',
    ),
  },
  {
    by: 0,
    title: 'Data Structures and Algorithms',
    category: 'Software Engineering',
    level: 'advanced',
    description:
      'Big-O analysis, trees, graphs, dynamic programming and the problem-solving patterns used in technical interviews.',
    content: lessons('Complexity analysis', 'Trees and heaps', 'Graphs', 'Dynamic programming'),
  },
  {
    by: 1,
    title: 'Git and Team Workflows',
    category: 'Software Engineering',
    level: 'beginner',
    description:
      'Branching, pull requests, code review and resolving conflicts. The collaboration habits every engineering team expects.',
    content: lessons('Commits and history', 'Branching', 'Pull requests', 'Resolving conflicts'),
  },
  // Data Science
  {
    by: 1,
    title: 'Python for Data Analysis',
    category: 'Data Science',
    level: 'beginner',
    description:
      'Python, pandas and Jupyter for cleaning, exploring and summarising real-world datasets.',
    content: lessons(
      'Python refresher',
      'pandas DataFrames',
      'Cleaning data',
      'Exploratory analysis',
    ),
  },
  {
    by: 1,
    title: 'Machine Learning Foundations',
    category: 'Data Science',
    level: 'intermediate',
    description:
      'Regression, classification, model evaluation and scikit-learn pipelines, with the maths explained intuitively.',
    content: lessons(
      'Supervised learning',
      'Linear models',
      'Trees and ensembles',
      'Evaluating models',
    ),
  },
  {
    by: 0,
    title: 'SQL and Database Design',
    category: 'Data Science',
    level: 'beginner',
    description:
      'Write SQL queries, design normalised schemas and understand indexes. Useful for engineers and analysts alike.',
    content: lessons('SELECT and filtering', 'Joins', 'Aggregation', 'Schema design and indexes'),
  },
  // Design
  {
    by: 1,
    title: 'UI Design Principles',
    category: 'Design',
    level: 'beginner',
    description:
      'Typography, colour, spacing and hierarchy: the principles behind interfaces that feel clear and trustworthy.',
    content: lessons('Visual hierarchy', 'Typography', 'Colour', 'Layout and spacing'),
  },
  {
    by: 1,
    title: 'Figma from Wireframe to Prototype',
    category: 'Design',
    level: 'beginner',
    description:
      'Go from sketches to interactive prototypes in Figma using components, auto layout and variants.',
    content: lessons('Frames and wireframes', 'Components', 'Auto layout', 'Prototyping'),
  },
  {
    by: 1,
    title: 'UX Research Methods',
    category: 'Design',
    level: 'intermediate',
    description: 'Plan interviews, run usability tests and turn findings into product decisions.',
    content: lessons('Research planning', 'User interviews', 'Usability testing', 'Synthesis'),
  },
  // Business
  {
    by: 0,
    title: 'Product Management Essentials',
    category: 'Business',
    level: 'beginner',
    description:
      'Discovery, prioritisation, roadmaps and working with engineers to ship products customers love.',
    content: lessons('The PM role', 'Discovery', 'Prioritisation', 'Roadmaps'),
  },
  {
    by: 0,
    title: 'Agile and Scrum in Practice',
    category: 'Business',
    level: 'beginner',
    description:
      'Sprints, standups, retrospectives and estimation, and how software teams actually use them.',
    content: lessons('Agile values', 'Scrum roles', 'Sprint ceremonies', 'Estimation'),
  },
  {
    by: 1,
    title: 'Digital Marketing Analytics',
    category: 'Business',
    level: 'intermediate',
    description: 'Measure campaigns, build funnels and run A/B tests using web analytics tools.',
    content: lessons('Metrics that matter', 'Funnels', 'A/B testing', 'Reporting'),
  },
  // Cloud & DevOps
  {
    by: 0,
    title: 'AWS Cloud Practitioner',
    category: 'Cloud & DevOps',
    level: 'beginner',
    description:
      'Core AWS services (EC2, S3, IAM, VPC) and how to deploy and secure a simple web application.',
    content: lessons('Cloud concepts', 'EC2 and S3', 'IAM', 'Networking basics'),
  },
  {
    by: 0,
    title: 'Docker and CI/CD Pipelines',
    category: 'Cloud & DevOps',
    level: 'intermediate',
    description:
      'Containerise applications and automate testing and deployment with GitHub Actions.',
    content: lessons('Containers', 'Dockerfiles', 'Compose', 'GitHub Actions'),
  },
  // Cybersecurity
  {
    by: 0,
    title: 'Web Application Security',
    category: 'Cybersecurity',
    level: 'intermediate',
    description:
      'The OWASP Top 10 in practice: XSS, injection, broken access control and how to prevent them.',
    content: lessons('Threat modelling', 'Injection', 'XSS and CSRF', 'Access control'),
  },
  {
    by: 1,
    title: 'Cybersecurity Fundamentals',
    category: 'Cybersecurity',
    level: 'beginner',
    description:
      'Networks, encryption, authentication and the security mindset, for anyone starting in tech.',
    content: lessons('Security mindset', 'Networking', 'Cryptography basics', 'Authentication'),
  },
  // Non-published examples, so admin screens have something to moderate.
  {
    by: 1,
    title: 'Advanced TypeScript Patterns',
    category: 'Software Engineering',
    level: 'advanced',
    status: 'draft',
    description: 'Generics, conditional types and type-safe API design. Still being written.',
    content: lessons('Generics', 'Conditional types'),
  },
  {
    by: 0,
    title: 'jQuery for Beginners',
    category: 'Software Engineering',
    level: 'beginner',
    status: 'archived',
    description: 'A legacy course kept for existing students; no longer open for enrollment.',
    content: lessons('Selectors', 'Events'),
  },
];

export const ENROLLMENTS: [studentIndex: number, courseTitle: string, completed: boolean][] = [
  [0, 'Programming Fundamentals with JavaScript', true],
  [0, 'Git and Team Workflows', false],
  [1, 'Python for Data Analysis', false],
  [1, 'Machine Learning Foundations', false],
  [2, 'UI Design Principles', true],
  [2, 'Figma from Wireframe to Prototype', false],
  [3, 'Programming Fundamentals with JavaScript', false],
  [3, 'Node.js and Express: Building REST APIs', false],
  [3, 'AWS Cloud Practitioner', false],
];

// `npm run seed -- --small`: just enough to click through every role.
// 7 users (the first two students), 6 courses (one of them a draft) and 3 enrollments.
export const SMALL = {
  studentCount: 2,
  courseTitles: [
    'Programming Fundamentals with JavaScript',
    'Node.js and Express: Building REST APIs',
    'Python for Data Analysis',
    'UI Design Principles',
    'AWS Cloud Practitioner',
    'Advanced TypeScript Patterns',
  ],
  enrollments: [
    [0, 'Programming Fundamentals with JavaScript', true],
    [0, 'Node.js and Express: Building REST APIs', false],
    [1, 'Python for Data Analysis', false],
  ] as [studentIndex: number, courseTitle: string, completed: boolean][],
};
