import { Suspense } from "react";
import DoctorPageContent from "./DoctorPageContent";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DoctorPageContent />
    </Suspense>
  );
}