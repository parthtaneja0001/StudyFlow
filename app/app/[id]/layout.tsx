import { CourseHeaderWrapper } from "./_header-wrapper";
import { CourseProvider } from "@/components/course-provider";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="relative min-h-screen">
      <CourseProvider id={id}>
        <CourseHeaderWrapper />
        <main className="max-w-7xl mx-auto px-5 md:px-8 py-8">{children}</main>
      </CourseProvider>
    </div>
  );
}
