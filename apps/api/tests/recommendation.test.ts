import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ROLES } from '@lp/shared';
import Enrollment from '../src/models/Enrollment.js';
import ApiError from '../src/utils/ApiError.js';
import { callOpenAI } from '../src/services/ai/openai.client.js';
import { api, bearer, createCourse, createUser } from './helpers.js';
import type { UserDocument, CourseDocument } from './helpers.js';

vi.mock('../src/services/ai/openai.client.js', () => ({ callOpenAI: vi.fn() }));

const FAKE_ID = '64b000000000000000000000';
const prompt = 'I want to be a software engineer, what courses should I follow?';

let student: UserDocument;
let node: CourseDocument;
let react: CourseDocument;
let draft: CourseDocument;

beforeEach(async () => {
  vi.mocked(callOpenAI).mockReset();
  const instructor = await createUser({ role: ROLES.INSTRUCTOR });
  student = await createUser({ role: ROLES.STUDENT });
  node = await createCourse(instructor, { title: 'Node.js Fundamentals' });
  react = await createCourse(instructor, { title: 'React from Zero' });
  draft = await createCourse(instructor, { title: 'Secret Draft', status: 'draft' });
});

const reply = (obj: object) => vi.mocked(callOpenAI).mockResolvedValue(JSON.stringify(obj));
const ask = (user = student, body = { prompt }) =>
  api().post('/api/recommendations').set(bearer(user)).send(body);

describe('POST /api/recommendations', () => {
  it('returns only real, published courses and drops invented or duplicate ids', async () => {
    reply({
      recommendations: [
        { courseId: node.id, reason: 'Backend basics.' },
        { courseId: FAKE_ID, reason: 'A course the model made up.' },
        { courseId: react.id, reason: 'Frontend next.' },
        { courseId: node.id, reason: 'Duplicate.' },
        { courseId: draft.id, reason: 'Not published.' },
      ],
      summary: 'Start with the backend, then the frontend.',
    });

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('Start with the backend, then the frontend.');
    expect(
      res.body.data.recommendations.map((r: { course: { title: string } }) => r.course.title),
    ).toEqual(['Node.js Fundamentals', 'React from Zero']);
  });

  it('only shows the model the published catalog', async () => {
    reply({ recommendations: [], summary: '' });
    await ask();
    const { system, user } = vi.mocked(callOpenAI).mock.calls[0][0];
    expect(system).toContain(node.id);
    expect(system).not.toContain(draft.id);
    expect(user).toBe(prompt);
  });

  it('flags courses the student is already enrolled in', async () => {
    await Enrollment.create({ student: student._id, course: node._id });
    reply({ recommendations: [{ courseId: node.id, reason: 'x' }], summary: '' });
    const res = await ask();
    expect(res.body.data.recommendations[0].course.isEnrolled).toBe(true);
  });

  it('tolerates JSON wrapped in markdown fences', async () => {
    vi.mocked(callOpenAI).mockResolvedValue(
      '```json\n' +
        JSON.stringify({ recommendations: [{ courseId: node.id, reason: 'x' }] }) +
        '\n```',
    );
    const res = await ask();
    expect(res.status).toBe(200);
    expect(res.body.data.recommendations).toHaveLength(1);
  });

  it('returns 502 when the model replies with something unparseable', async () => {
    vi.mocked(callOpenAI).mockResolvedValue('Sure! Here are some courses: ...');
    const res = await ask();
    expect(res.status).toBe(502);
  });

  it('passes through provider failures as a friendly error', async () => {
    vi.mocked(callOpenAI).mockRejectedValue(
      new ApiError(502, 'The recommendation service is unavailable'),
    );
    const res = await ask();
    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/unavailable/);
  });

  it('does not call the model when there is no catalog', async () => {
    const { default: Course } = await import('../src/models/Course.js');
    await Course.deleteMany({});
    const res = await ask();
    expect(res.status).toBe(200);
    expect(res.body.data.recommendations).toEqual([]);
    expect(callOpenAI).not.toHaveBeenCalled();
  });

  it('validates the prompt and restricts the endpoint to students', async () => {
    const instructor = await createUser({ role: ROLES.INSTRUCTOR });
    expect((await ask(student, { prompt: 'hi' })).status).toBe(400);
    expect((await ask(instructor)).status).toBe(403);
    expect((await api().post('/api/recommendations').send({ prompt })).status).toBe(401);
  });
});
