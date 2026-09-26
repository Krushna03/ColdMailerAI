import { NavLink } from "react-router-dom";

export default function CallToAction() {
  return (
    <section className="w-full pb-16 bg-black text-white relative overflow-hidden">
      <div className="absolute left-[42%] top-5 w-64 h-64 bg-brand opacity-25 blur-3xl rounded-full z-0"></div>

      <div className="container mx-auto px-4 flex flex-col items-center text-center max-w-3xl z-10 relative">
        <div className="mb-6">
          <button className="bg-black border border-gray-700 rounded-full px-4 py-2 flex items-center">
            <img
              src="/white-logo.png"
              width={20}
              height={20}
              alt="Radison logo"
              className="mr-2"
            />
            <span>ColdMailerAI</span>
          </button>
        </div>

        <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
          Start generating emails
          <br />
          that work for you
        </h2>

        <div className="flex flex-col items-center">
          <NavLink
            to="/generate-email"
            className="bg-brand-700 hover:bg-brand-800 text-white font-medium py-2 px-5 md:py-3 md:px-8 rounded-full text-lg transition-colors duration-200 mb-3 cursor-pointer"
          >
            Try it for Free
          </NavLink>
        </div>
      </div>
    </section>
  );
}
