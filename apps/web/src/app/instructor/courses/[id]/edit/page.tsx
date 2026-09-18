'use client';

import { useParams, useRouter } from 'next/navigation';
import { COURSE_STATUS, updateCourseSchema, type UpdateCourseInput } from '@lp/shared';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import type { Course } from '@/types/api';
import CourseForm from '@/components/CourseForm';
import { AsyncView } from '@/components/States';
import { PageHeader } from '@/components/ui';

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const state = useApiData<Course>(`/courses/${id}`);

  const save = async (values: UpdateCourseInput) => {
    await api(`/courses/${id}`, { method: 'PUT', body: values });
    toast.success('Changes saved.');
    router.push('/instructor/courses');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit course" />
      <AsyncView state={state}>
        {({ title, description, category, level, status, content }) => (
          <CourseForm
            schema={updateCourseSchema}
            initial={{ title, description, category, level, status, content }}
            statuses={Object.values(COURSE_STATUS)}
            submitLabel="Save changes"
            onSubmit={save}
            onCancel={() => router.push('/instructor/courses')}
          />
        )}
      </AsyncView>
    </div>
  );
}
