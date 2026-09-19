'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  COURSE_LEVELS,
  LEARNING_GOAL_LABELS,
  preferencesSchema,
  type CourseLevel,
  type LearningGoal,
} from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { api, errorMessage } from '@/lib/api';
import { capitalize } from '@/lib/format';
import type { Suggestions, User } from '@/types/api';
import { FilterShortcuts, SuggestedGrid } from '@/components/Suggestions';
import { Button, Card, LinkButton } from '@/components/ui';

const LEVEL_HINTS: Record<CourseLevel, string> = {
  beginner: "I'm new to this",
  intermediate: 'I know the basics',
  advanced: 'I have real experience',
};

const MAX_FIELDS = 3;

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-lg border p-4 text-left text-sm transition-colors ${
        selected
          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
          : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const saved = user?.preferences;

  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<string[]>(saved?.categories ?? []);
  const categoryOptions = useCategories();
  const [level, setLevel] = useState<CourseLevel | null>(saved?.level ?? null);
  const [goal, setGoal] = useState<LearningGoal | null>(saved?.goal ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  const toggleCategory = (c: string) =>
    setCategories((current) =>
      current.includes(c)
        ? current.filter((x) => x !== c)
        : current.length < MAX_FIELDS
          ? [...current, c]
          : current,
    );

  const finish = async () => {
    const parsed = preferencesSchema.safeParse({ categories, level, goal });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please answer every question');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api<{ user: User }>('/auth/me/preferences', {
        method: 'PUT',
        body: parsed.data,
      });
      updateUser(data.user);
      const next = await api<Suggestions>('/courses/suggested');
      setSuggestions(next.data);
      setStep(3);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const questions = [
    {
      title: 'Which fields interest you?',
      hint: `Pick up to ${MAX_FIELDS}.`,
      ready: categories.length > 0,
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {categoryOptions.map((c) => (
            <Choice key={c} selected={categories.includes(c)} onClick={() => toggleCategory(c)}>
              <span className="font-medium text-slate-900">{c}</span>
            </Choice>
          ))}
        </div>
      ),
    },
    {
      title: 'How much experience do you have?',
      hint: 'We start you at the right level.',
      ready: level !== null,
      body: (
        <div className="grid gap-3 sm:grid-cols-3">
          {COURSE_LEVELS.map((l) => (
            <Choice key={l} selected={level === l} onClick={() => setLevel(l)}>
              <span className="block font-medium text-slate-900">{capitalize(l)}</span>
              <span className="mt-0.5 block text-xs text-slate-600">{LEVEL_HINTS[l]}</span>
            </Choice>
          ))}
        </div>
      ),
    },
    {
      title: "What's your main goal?",
      hint: 'The AI advisor uses this to explain its picks.',
      ready: goal !== null,
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(LEARNING_GOAL_LABELS) as [LearningGoal, string][]).map(([g, label]) => (
            <Choice key={g} selected={goal === g} onClick={() => setGoal(g)}>
              <span className="font-medium text-slate-900">{label}</span>
            </Choice>
          ))}
        </div>
      ),
    },
  ];

  if (step === 3 && suggestions?.preferences) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-slate-900">Here&apos;s where to start</h1>
        <p className="mt-1 text-sm text-slate-600">
          Based on your answers. Jump into a filtered catalog, or pick one of these courses.
        </p>
        <div className="mt-5">
          <FilterShortcuts preferences={suggestions.preferences} />
        </div>
        <div className="mt-6">
          <SuggestedGrid suggestions={suggestions} />
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <LinkButton href="/advisor">Ask the AI advisor</LinkButton>
          <LinkButton href="/courses" variant="secondary">
            Browse all courses
          </LinkButton>
        </div>
      </div>
    );
  }

  const question = questions[step]!;
  const last = step === questions.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-brand-700">
          Question {step + 1} of {questions.length}
        </p>
        <button
          type="button"
          onClick={() => router.push('/courses')}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Skip for now
        </button>
      </div>
      <div className="mb-6 flex gap-1.5" aria-hidden="true">
        {questions.map((q, i) => (
          <div
            key={q.title}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      <Card className="p-6">
        <h1 className="text-xl font-semibold text-slate-900">{question.title}</h1>
        <p className="mt-1 mb-5 text-sm text-slate-600">{question.hint}</p>
        {question.body}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-between gap-2">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {last ? (
            <Button onClick={finish} loading={saving} disabled={!question.ready}>
              See my suggestions
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!question.ready}>
              Next
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
