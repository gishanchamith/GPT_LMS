'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LEARNING_GOAL_LABELS, recommendationSchema, ROLES } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useForm } from '@/hooks/useForm';
import { api, errorMessage } from '@/lib/api';
import { capitalize } from '@/lib/format';
import type { Recommendation, RecommendationResult, User } from '@/types/api';
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
  const { user } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <LinkButton href="/login?next=/advisor" size="sm" variant="secondary">
        Log in to enroll
      </LinkButton>
    );
  }
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

// Who is asking changes the note above the form, not the advisor itself.
function AudienceNote({ user }: { user: User | null }) {
  if (!user) {
    return (
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50 p-4 text-sm">
        <p className="text-slate-700">
          You&apos;re trying the advisor as a guest.{' '}
          <span className="text-slate-600">
            Create a free account to save your interests and enroll in one click.
          </span>
        </p>
        <LinkButton href="/register" size="sm">
          Create a free account
        </LinkButton>
      </Card>
    );
  }
  const prefs = user.preferences;
  if (!prefs) {
    return (
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <p className="text-slate-700">
          Answer 3 quick questions and the advisor will know your background.
        </p>
        <LinkButton href="/student/onboarding" size="sm" variant="secondary">
          Answer 3 questions
        </LinkButton>
      </Card>
    );
  }
  return (
    <p className="mb-4 text-sm text-slate-600">
      Personalised with your interests: <strong>{prefs.categories.join(', ')}</strong> ·{' '}
      {capitalize(prefs.level)} · {LEARNING_GOAL_LABELS[prefs.goal]}.{' '}
      <Link href="/student/onboarding" className="text-brand-700 hover:underline">
        Edit
      </Link>
    </p>
  );
}

export default function AdvisorPage() {
  const { user, loading } = useAuth();
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

  const header = (
    <PageHeader
      title="AI course advisor"
      description="Describe what you want to achieve. Recommendations come only from courses in our catalog."
    />
  );

  if (!loading && user && user.role !== ROLES.STUDENT) {
    return (
      <>
        {header}
        <EmptyState
          title="The advisor is for students and visitors"
          description="Staff accounts can browse the catalog, but course recommendations are only offered to learners."
          action={<LinkButton href="/courses">Browse courses</LinkButton>}
        />
      </>
    );
  }

  return (
    <>
      {header}
      {!loading && <AudienceNote user={user} />}

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
