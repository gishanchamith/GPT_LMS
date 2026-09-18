import HomeActions from '@/components/HomeActions';

const FEATURES = [
  {
    title: 'A catalog worth browsing',
    text: 'Software engineering, data science, design, business, cloud and security, searchable and filterable by level.',
  },
  {
    title: 'An AI advisor that only suggests real courses',
    text: 'Describe your goal in your own words, no account needed. Every recommendation is a course you can enroll in today.',
  },
  {
    title: 'Built for instructors too',
    text: 'Publish courses with structured lessons and see exactly who is enrolled.',
  },
];

export default function HomePage() {
  return (
    <div className="py-8 sm:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">LearnHub</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
          Learn the skills that move your career forward
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Tell us where you want to go, and our AI advisor maps a path through real courses taught
          by real instructors.
        </p>
        <HomeActions />
      </section>

      <section className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
