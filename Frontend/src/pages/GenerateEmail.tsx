import React, { useState } from "react";
import { MovingDots } from "../components/common/MovingDots";
import { Header } from "../components/layout/Header";
import { EmailGenerator } from "../components/email/EmailGenerator";
import { Footer } from "../components/layout/Footer";
import Sidebar from "../components/layout/Sidebar";
import { useCurrentUser } from "../hooks/useUser";
import Seo from "../components/common/Seo";

export const GenerateEmail: React.FC = () => {
  const [generatedEmail, setGeneratedEmails] = useState(false);

  useCurrentUser();

  return (
    <>
      <Seo title="Generate Email" path="/generate-email" noIndex />
      <Sidebar />

      {/* Main Content */}
      <div className="h-[100dvh] overflow-hidden flex flex-col relative bg-surface-900 z-0">
        <div className="hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2 w-[65%] h-44 bg-brand opacity-20 blur-3xl rounded-full"></div>

        {/* Mobile-only glow near the bottom input */}
        <div className="sm:hidden absolute bottom-0 -left-10 w-2/3 h-44 bg-brand opacity-30 blur-3xl"></div>
        <div className="sm:hidden absolute bottom-0 -right-10 w-2/3 h-44 bg-brand-200 opacity-30 blur-3xl"></div>

        <div className="sm:hidden absolute top-0 -left-20 w-2/3 h-20 bg-brand opacity-25 blur-3xl"></div>

        <div className="hidden sm:block">
          <MovingDots />
        </div>

        <Header />

        <main className="z-20 h-full custom-scroll flex-1 flex sm:flex-col items-center justify-center px-2">
          <EmailGenerator emailGenerated={setGeneratedEmails} />
        </main>

        {!generatedEmail && (
          <div className="hidden sm:block">
            <Footer />
          </div>
        )}
      </div>
    </>
  );
};

export default GenerateEmail;
