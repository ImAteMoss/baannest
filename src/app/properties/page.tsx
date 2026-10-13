import { Suspense } from "react";
import PropertiesClient from "./PropertiesClient";

export default function PropertiesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F3EFE5] flex items-center justify-center text-[#1F2E28]">
          <p>Loading properties...</p>
        </main>
      }
    >
      <PropertiesClient />
    </Suspense>
  );
}
