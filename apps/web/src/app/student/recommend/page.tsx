'use client';

import { useState } from 'react';
import { recommendationSchema } from '@lp/shared';
import { useToast } from '@/context/ToastContext';
import { useForm } from '@/hooks/useForm';
import { api, errorMessage } from '@/lib/api';
import type { Recommendation, RecommendationResult } from '@/types/api';
import CourseCard from '@/components/CourseCard';
import { EmptyState } from '@/components/States';
import {
  Badge,
  Button,
  Card,
  Field,
  LinkButton,
  PageHeader,
  Spinner,
  Textarea,
} from '@/components/ui';

const EXAMPLES = [
  'I want to be a software engineer, what courses should I follow?',
  'I work in marketing and want to get into data analysis.',
  'I am a designer who wants to understand users better.',
  'I want to deploy my web apps to the cloud securely.',
];

function EnrollButton({
  course,
  onEnrolled,
}: {
  course: Recommendation['course'];
  onEnrolled: (courseId: string) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  if (course.isEnrolled) return <Badge tone="green">Enrolled</Badge>;

  const enroll = async () => {
    setSaving(true);
    try {
      await api('/enrollments', { method: 'POST', body: { courseId: course._id } });
      toast.success(`Enrolled in “${course.title}”.`);
      onEnrolled(course._id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button size="sm" onClick={enroll} loading={saving}>
      Enroll
    </Button>
  );
}

export default function RecommendPage() {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const form = useForm(recommendationSchema, { prompt: '' });

  const onSubmit = form.submit(async ({ prompt }) => {
    setResult(null);
    const { data } = await api<RecommendationResult>('/recommendations', {
      method: 'POST',
      body: { prompt },
    });
    setResult(data);
  });

  const markEnrolled = (courseId: string) =>
    setResult(
      (r) =>
        r && {
          ...r,
          recommendations: r.recommendations.map((rec) =>
            rec.course._id === courseId
              ? { ...rec, course: { ...rec.course, isEnrolled: true } }
              : rec,
          ),
        },
    );

  return (
    <>
      <PageHeader
        title="AI course advisor"
        description="Describe what you want to achieve. Recommendations come only from courses in our catalog."
      />

      <Card className="p-5">
        <form onSubmit={onSubmit} noValidate>
          <Field label="Your goal" htmlFor="prompt" error={form.errors.prompt}>
            <Textarea
              {...form.bind('prompt')}
              rows={3}
              maxLength={500}
              placeholder="e.g. I want to be a software engineer, what courses should I follow?"
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => form.setField('prompt', example)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {example}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{form.values.prompt.length}/500</p>
            <Button type="submit" loading={form.submitting}>
              Get recommendations
            </Button>
          </div>
        </form>
      </Card>

      <section className="mt-8" aria-live="polite">
        {form.submitting && (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
            <Spinner /> Matching your goal against the catalog…
          </div>
        )}

        {form.formError && !form.submitting && (
          <Card className="border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
            {form.formError}
          </Card>
        )}

        {result && !form.submitting && (
          <>
            {result.summary && (
              <Card className="mb-6 border-brand-200 bg-brand-50 p-5">
                <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                  Advisor summary
                </p>
                <p className="mt-1 text-slate-800">{result.summary}</p>
              </Card>
            )}
            {result.recommendations.length === 0 ? (
              <EmptyState
                title="No matching courses right now"
                description="Try describing your goal differently, or browse the full catalog."
                action={<LinkButton href="/courses">Browse courses</LinkButton>}
              />
            ) : (
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.recommendations.map(({ course, reason }, i) => (
                  <li key={course._id}>
                    <CourseCard
                      course={course}
                      footer={
                        <div className="space-y-3">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold text-brand-700">#{i + 1} · Why: </span>
                            {reason}
                          </p>
                          <div className="flex justify-end">
                            <EnrollButton course={course} onEnrolled={markEnrolled} />
                          </div>
                        </div>
                      }
                    />
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </>
  );
}
