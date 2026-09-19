import { COURSE_LEVELS, COURSE_STATUS, type PreferencesInput } from '@lp/shared';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import type { UserDocument } from '../models/User.js';
import { assertCategoriesUsable } from './category.service.js';

const SUGGESTION_LIMIT = 6;

export async function savePreferences(
  user: UserDocument,
  input: PreferencesInput,
): Promise<UserDocument> {
  const categories = await assertCategoriesUsable(input.categories);
  user.preferences = { ...input, categories, updatedAt: new Date() };
  await user.save();
  return user;
}

// Rule-based suggestions from the onboarding answers: the student's fields become the
// category filter, and courses at their level rank first, then the next level up.
// No AI call, so this is instant, free and always available.
export async function suggestCourses(user: UserDocument) {
  const prefs = user.preferences;
  if (!prefs?.categories?.length) return { preferences: null, courses: [] };

  const enrolled = await Enrollment.find({ student: user._id }).distinct('course');
  const courses = await Course.find({
    status: COURSE_STATUS.PUBLISHED,
    category: { $in: prefs.categories },
    _id: { $nin: enrolled },
  })
    .select('-content')
    .populate('instructor', 'name username')
    .lean();

  const levelIndex = COURSE_LEVELS.indexOf(prefs.level);
  // 0 = their level, 1 = one step up (the natural next course), then the rest.
  const distance = (level: (typeof COURSE_LEVELS)[number]) => {
    const diff = COURSE_LEVELS.indexOf(level) - levelIndex;
    if (diff === 0) return 0;
    if (diff === 1) return 1;
    return 2 + Math.abs(diff);
  };

  courses.sort(
    (a, b) => distance(a.level) - distance(b.level) || b.enrollmentCount - a.enrollmentCount,
  );

  return {
    preferences: { categories: prefs.categories, level: prefs.level, goal: prefs.goal },
    courses: courses.slice(0, SUGGESTION_LIMIT),
  };
}
