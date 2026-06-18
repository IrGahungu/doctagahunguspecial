import { Suspense } from "react";
import DoctorPageContent from "./DoctorPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DoctorPageContent />
    </Suspense>
  );
}