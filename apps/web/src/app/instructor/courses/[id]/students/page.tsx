import CourseStudentsView from '@/components/manage/CourseStudentsView';

export default function InstructorCourseStudentsPage() {
  return <CourseStudentsView listHref="/instructor/courses" listLabel="My courses" />;
}
