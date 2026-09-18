import {
  AUDIT_ACTIONS,
  DEFAULT_COURSE_CATEGORIES,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@lp/shared';
import Category, { type CategoryDocument } from '../models/Category.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import type { AuditContext } from '../utils/request.js';
import { logAction } from './audit.service.js';

const byName = { name: 1 } as const;

// A new database starts with the default categories; later changes are made by admins.
export async function ensureDefaultCategories(): Promise<void> {
  if (await Category.exists({})) return;
  await Category.insertMany(
    DEFAULT_COURSE_CATEGORIES.map((name) => ({ name, key: name.toLowerCase() })),
  );
}

// What course forms, the catalog filter and onboarding offer.
export function listActiveCategories() {
  return Category.find({ active: true }).select('name').sort(byName).lean();
}

// For the admin page: every category, hidden ones included, with how many courses use it.
export async function listAllCategories() {
  const [categories, counts] = await Promise.all([
    Category.find().sort(byName).lean(),
    Course.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);
  const byCategory = new Map(counts.map((c) => [c._id, c.count]));
  return categories.map((c) => ({ ...c, courseCount: byCategory.get(c.name) ?? 0 }));
}

async function findByName(name: string) {
  return Category.findOne({ key: name.trim().toLowerCase() });
}

// Courses and onboarding answers may only use existing, visible categories. `current` lets a
// course keep a category that was hidden after it was assigned.
export async function assertCategoryUsable(name: string, current?: string): Promise<string> {
  const category = await findByName(name);
  if (!category || (!category.active && category.name !== current)) {
    throw new ApiError(400, 'Validation failed', { category: 'Pick one of the listed categories' });
  }
  return category.name;
}

// Returns the canonical names in the order the student picked them.
export async function assertCategoriesUsable(names: string[]): Promise<string[]> {
  const keys = [...new Set(names.map((n) => n.trim().toLowerCase()))];
  const found = await Category.find({ key: { $in: keys }, active: true }).lean();
  const byKey = new Map(found.map((c) => [c.key, c.name]));
  if (byKey.size !== keys.length) {
    throw new ApiError(400, 'Validation failed', { categories: 'Pick from the listed fields' });
  }
  return keys.map((k) => byKey.get(k)!);
}

export async function createCategory(
  ctx: AuditContext,
  { name }: CreateCategoryInput,
): Promise<CategoryDocument> {
  if (await findByName(name)) throw new ApiError(409, `"${name}" already exists`);
  const category = await Category.create({
    name,
    key: name.toLowerCase(),
    createdBy: ctx.user._id,
  });
  await logAction(
    ctx,
    AUDIT_ACTIONS.CATEGORY_CREATED,
    { type: 'Category', id: category._id },
    {
      title: category.name,
    },
  );
  return category;
}

// Renaming updates every course and every student's onboarding answers that use the old name,
// so nothing is left pointing at a category that no longer exists.
export async function updateCategory(
  ctx: AuditContext,
  id: string,
  { name, active }: UpdateCategoryInput,
): Promise<CategoryDocument> {
  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, 'Category not found');
  const from = category.name;

  if (name !== undefined && name !== from) {
    const clash = await findByName(name);
    if (clash && !clash._id.equals(category._id)) {
      throw new ApiError(409, `"${name}" already exists`);
    }
    category.name = name;
  }
  if (active !== undefined) category.active = active;
  await category.save();

  if (category.name !== from) {
    await Promise.all([
      Course.updateMany({ category: from }, { category: category.name }),
      User.updateMany(
        { 'preferences.categories': from },
        { $set: { 'preferences.categories.$[c]': category.name } },
        { arrayFilters: [{ c: from }] },
      ),
    ]);
  }

  await logAction(
    ctx,
    AUDIT_ACTIONS.CATEGORY_UPDATED,
    { type: 'Category', id: category._id },
    {
      title: category.name,
      ...(category.name !== from && { from, to: category.name }),
      ...(active !== undefined && { active }),
    },
  );
  return category;
}
