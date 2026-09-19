'use client';

import { COURSE_LEVELS, COURSE_STATUS, type CourseStatus, type Lesson } from '@lp/shared';
import type { z } from 'zod';
import { useCategories } from '@/hooks/useCategories';
import { useForm } from '@/hooks/useForm';
import { capitalize } from '@/lib/format';
import { Button, Card, Field, Input, Select, Textarea } from './ui';

export interface CourseFormValues {
  title: string;
  description: string;
  category: string;
  level: string;
  status: CourseStatus;
  content: Lesson[];
}

const EMPTY_COURSE: CourseFormValues = {
  title: '',
  description: '',
  category: '',
  level: 'beginner',
  status: COURSE_STATUS.PUBLISHED,
  content: [],
};

// Used for both create and edit; `Output` is whatever the given schema parses to.
interface CourseFormProps<Output> {
  schema: z.ZodType<Output>;
  initial?: Partial<CourseFormValues>;
  statuses: CourseStatus[];
  submitLabel: string;
  onSubmit: (values: Output) => Promise<void>;
  onCancel: () => void;
}

export default function CourseForm<Output>({
  schema,
  initial,
  statuses,
  submitLabel,
  onSubmit,
  onCancel,
}: CourseFormProps<Output>) {
  // The form holds raw strings; the schema narrows category/level when it parses.
  const form = useForm(schema, { ...EMPTY_COURSE, ...initial });
  const lessons = form.values.content;
  // A course may keep a category that has since been hidden, so keep its own in the list.
  const categories = useCategories(initial?.category);

  const setLessons = (next: Lesson[]) => form.setField('content', next);
  const updateLesson = (i: number, key: keyof Lesson, value: string) =>
    setLessons(lessons.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  const moveLesson = (i: number, delta: -1 | 1) => {
    const next = [...lessons];
    [next[i], next[i + delta]] = [next[i + delta]!, next[i]!];
    setLessons(next);
  };

  return (
    <form onSubmit={form.submit(onSubmit)} noValidate className="space-y-6">
      {form.formError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {form.formError}
        </p>
      )}

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-slate-900">Details</h2>
        <Field label="Title" htmlFor="title" error={form.errors.title}>
          <Input {...form.bind('title')} maxLength={120} />
        </Field>
        <Field
          label="Description"
          htmlFor="description"
          error={form.errors.description}
          hint="What will students learn? This is also what the AI advisor reads."
        >
          <Textarea {...form.bind('description')} rows={5} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category" htmlFor="category" error={form.errors.category}>
            <Select {...form.bind('category')}>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Level" htmlFor="level" error={form.errors.level}>
            <Select {...form.bind('level')}>
              {COURSE_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {capitalize(l)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Visibility"
            htmlFor="status"
            error={form.errors.status}
            hint="Drafts are only visible to you."
          >
            <Select {...form.bind('status')}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {capitalize(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Lessons</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={lessons.length >= 50}
            onClick={() => setLessons([...lessons, { title: '', body: '' }])}
          >
            + Add lesson
          </Button>
        </div>
        {form.errors.content && <p className="mt-2 text-xs text-red-600">{form.errors.content}</p>}
        {lessons.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No lessons yet. You can add them later too.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {lessons.map((lesson, i) => (
              <li key={i} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">Lesson {i + 1}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={i === 0}
                      onClick={() => moveLesson(i, -1)}
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={i === lessons.length - 1}
                      onClick={() => moveLesson(i, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="dangerGhost"
                      size="sm"
                      onClick={() => setLessons(lessons.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Field error={form.errors[`content.${i}.title`]}>
                    <Input
                      placeholder="Lesson title"
                      value={lesson.title}
                      onChange={(e) => updateLesson(i, 'title', e.target.value)}
                      error={form.errors[`content.${i}.title`]}
                      aria-label={`Lesson ${i + 1} title`}
                    />
                  </Field>
                  <Textarea
                    placeholder="Lesson notes (optional)"
                    rows={3}
                    value={lesson.body}
                    onChange={(e) => updateLesson(i, 'body', e.target.value)}
                    aria-label={`Lesson ${i + 1} notes`}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={form.submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
