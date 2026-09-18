'use client';

import { useRouter } from 'next/navigation';
import { COURSE_STATUS, createCourseSchema, type CreateCourseInput } from '@lp/shared';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import type { Course } from '@/types/api';
import CourseForm from '@/components/CourseForm';
import { PageHeader } from '@/components/ui';

export default function NewCoursePage() {
  const router = useRouter();
  const toast = useToast();

  const create = async (values: CreateCourseInput) => {
    const { data } = await api<Course>('/courses', { method: 'POST', body: values });
    toast.success(
      data.status === COURSE_STATUS.PUBLISHED
        ? `“${data.title}” is live.`
        : `“${data.title}” saved as a draft.`,
    );
    router.push('/instructor/courses');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New course"
        description="Published courses appear in the catalog immediately."
      />
      <CourseForm
        schema={createCourseSchema}
        statuses={[COURSE_STATUS.PUBLISHED, COURSE_STATUS.DRAFT]}
        submitLabel="Create course"
        onSubmit={create}
        onCancel={() => router.push('/instructor/courses')}
      />
    </div>
  );
}
