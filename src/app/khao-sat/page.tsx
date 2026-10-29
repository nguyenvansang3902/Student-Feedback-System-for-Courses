import { StudentSurveyList } from "@/components/student-surveys/survey-list";
import { requireStudentSurveyPageActor } from "@/components/student-surveys/page-guard";
export default async function StudentSurveysPage() {
  const actor = await requireStudentSurveyPageActor();
  return <StudentSurveyList userId={actor.userId} />;
}
