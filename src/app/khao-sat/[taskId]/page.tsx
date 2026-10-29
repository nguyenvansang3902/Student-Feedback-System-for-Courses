import { notFound, redirect } from "next/navigation";
import { StudentSurveyForm } from "@/components/student-surveys/survey-form";
import { requireStudentSurveyPageActor } from "@/components/student-surveys/page-guard";
import { AuthError } from "@/server/auth/types";
import { getStudentSurvey } from "@/server/services/student-surveys";
export default async function StudentSurveyPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const actor = await requireStudentSurveyPageActor();
  let item;
  try {
    item = await getStudentSurvey(actor, (await params).taskId);
  } catch (error) {
    if (error instanceof AuthError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }
  if (item.status === "DONE") redirect(`/khao-sat/${item.id}/da-nop`);
  const serverTime = new Date().getTime();
  return (
    <StudentSurveyForm
      key={item.id}
      initial={item}
      userId={actor.userId}
      serverTime={serverTime}
    />
  );
}
