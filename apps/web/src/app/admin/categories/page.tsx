'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createCategorySchema } from '@lp/shared';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { useForm } from '@/hooks/useForm';
import { api, errorMessage } from '@/lib/api';
import { plural } from '@/lib/format';
import type { Category } from '@/types/api';
import { AsyncView, EmptyState } from '@/components/States';
import { Badge, Button, Card, Input, PageHeader, Table, Td } from '@/components/ui';

function AddCategoryForm({ onAdded }: { onAdded: (category: Category) => void }) {
  const toast = useToast();
  const form = useForm(createCategorySchema, { name: '' });

  const onSubmit = form.submit(async ({ name }) => {
    const { data } = await api<Category>('/admin/categories', { method: 'POST', body: { name } });
    toast.success(`“${data.name}” added. Instructors can use it right away.`);
    form.setValues({ name: '' });
    onAdded({ ...data, courseCount: 0 });
  });

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-start gap-3">
        <div className="min-w-60 flex-1">
          <label htmlFor="name" className="sr-only">
            New category name
          </label>
          <Input {...form.bind('name')} placeholder="New category, e.g. Mobile Development" />
          {(form.errors.name || form.formError) && (
            <p className="mt-1 text-xs text-red-600">{form.errors.name || form.formError}</p>
          )}
        </div>
        <Button type="submit" loading={form.submitting}>
          Add category
        </Button>
      </form>
    </Card>
  );
}

function CategoryRow({
  category,
  onChanged,
}: {
  category: Category;
  onChanged: (updated: Category) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);

  const save = async (body: { name?: string; active?: boolean }, message: string) => {
    setBusy(true);
    try {
      const { data } = await api<Category>(`/admin/categories/${category._id}`, {
        method: 'PATCH',
        body,
      });
      onChanged({ ...category, ...data });
      toast.success(message);
      setEditing(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const rename = () => {
    const next = name.trim();
    if (!next || next === category.name) return setEditing(false);
    void save(
      { name: next },
      category.courseCount
        ? `Renamed to “${next}” on ${plural(category.courseCount, 'course')}.`
        : `Renamed to “${next}”.`,
    );
  };

  return (
    <tr>
      <Td className="font-medium text-slate-900">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') rename();
                if (e.key === 'Escape') setEditing(false);
              }}
              aria-label={`New name for ${category.name}`}
              autoFocus
              // Typing replaces the old name instead of appending to it.
              onFocus={(e) => e.currentTarget.select()}
              className="py-1"
            />
            <Button size="sm" onClick={rename} loading={busy}>
              Save
            </Button>
          </div>
        ) : (
          category.name
        )}
      </Td>
      <Td>
        {category.courseCount ? (
          <Link
            href={`/courses?category=${encodeURIComponent(category.name)}`}
            className="text-brand-700 hover:underline"
          >
            {plural(category.courseCount, 'course')}
          </Link>
        ) : (
          <span className="text-slate-500">No courses</span>
        )}
      </Td>
      <Td>
        <Badge tone={category.active ? 'green' : 'gray'}>
          {category.active ? 'visible' : 'hidden'}
        </Badge>
      </Td>
      <Td>
        <div className="flex justify-end gap-1 whitespace-nowrap">
          {!editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(category.name);
                setEditing(true);
              }}
            >
              Rename
            </Button>
          )}
          <Button
            size="sm"
            variant={category.active ? 'dangerGhost' : 'secondary'}
            loading={busy && !editing}
            onClick={() =>
              save(
                { active: !category.active },
                category.active
                  ? `“${category.name}” hidden. Existing courses keep it.`
                  : `“${category.name}” is available again.`,
              )
            }
          >
            {category.active ? 'Hide' : 'Show'}
          </Button>
        </div>
      </Td>
    </tr>
  );
}

export default function CategoriesPage() {
  const state = useApiData<Category[]>('/admin/categories');

  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  const replace = (updated: Category) =>
    state.setData((list) => list.map((c) => (c._id === updated._id ? updated : c)).sort(byName));
  const add = (created: Category) => state.setData((list) => [...list, created].sort(byName));

  return (
    <>
      <PageHeader
        title="Categories"
        description="What instructors file courses under and students pick during onboarding. Renaming updates every course; hiding stops new use but keeps existing courses."
      />
      <div className="space-y-6">
        <AddCategoryForm onAdded={add} />
        <AsyncView state={state} empty={<EmptyState title="No categories yet" />}>
          {(categories) => (
            <Table head={['Category', 'Courses', 'Status', '']}>
              {categories.map((c) => (
                <CategoryRow key={c._id} category={c} onChanged={replace} />
              ))}
            </Table>
          )}
        </AsyncView>
      </div>
    </>
  );
}
