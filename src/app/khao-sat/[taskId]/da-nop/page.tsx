import { notFound, redirect } from "next/navigation";
import { StudentSurveyConfirmation } from "@/components/student-surveys/survey-confirmation";
import { requireStudentSurveyPageActor } from "@/components/student-surveys/page-guard";
import { AuthError } from "@/server/auth/types";
import { getStudentSurvey } from "@/server/services/student-surveys";
export default async function StudentSurveyConfirmationPage({
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
  if (item.status !== "DONE") redirect(`/khao-sat/${item.id}`);
  return <StudentSurveyConfirmation item={item} userId={actor.userId} />;
}
