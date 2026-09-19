import CourseStudentsView from '@/components/manage/CourseStudentsView';

export default function AdminCourseStudentsPage() {
  return <CourseStudentsView listHref="/admin/courses" listLabel="All courses" />;
}
