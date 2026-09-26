import { useState } from "react";
import TestimonialCard from "../components/common/TestimonialCard";
import { testimonialCardsData } from "../data/testimonialData";

export default function MarqueeTestimonials() {
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  const animationDurations = [30, 40, 50]; // seconds

  return (
    <>
      <style>{`
        @keyframes marqueeScrollVertical {
          0% { transform: translateY(0%); }
          100% { transform: translateY(-50%); }
        }
        .marquee-inner {
          animation: marqueeScrollVertical linear infinite;
        }
        .marquee-paused {
          animation-play-state: paused;
        }
      `}</style>

      <section className="w-full max-w-7xl mx-auto py-10 px-4">
        <div className="max-w-32 flex justify-center bg-surface-800 mx-auto rounded-full px-6 py-2 mb-8">
          <span className="text-sm sm:text-base font-normal text-gray-200">Testimonials</span>
        </div>

        <h2 className="text-2xl md:text-5xl text-center text-white font-bold mb-4">What our users say !!</h2>
        <p className="text-lg text-gray-300 px-2 md:px-0 max-w-2xl text-center mx-auto mb-8 md:mb-12">
          Hear from users who are transforming their outreach with ColdMailerAI
        </p>

        <div className="flex gap-6 justify-center items-start">
          {[0, 1, 2].map((colIndex) => (
            <div
              key={colIndex}
              className={`marquee-column flex-1 max-w-md overflow-hidden relative h-[800px] rounded-xl ${colIndex === 1 ? "hidden sm:block" : ""} ${colIndex === 2 ? "hidden md:block" : ""}`}
              onMouseEnter={() => setHoveredColumn(colIndex)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <div className="absolute top-0 left-0 w-full h-20 z-10 bg-gradient-to-b from-surface-800 to-transparent pointer-events-none" />

              <div
                className={`marquee-inner ${
                  hoveredColumn === colIndex ? "marquee-paused" : ""
                } flex flex-col min-h-[200%] pt-10 pb-5 gap-4`}
                style={{
                  animationDuration: `${animationDurations[colIndex]}s`,
                }}
              >
                {[...testimonialCardsData, ...testimonialCardsData].map((card, index) => (
                  <TestimonialCard key={index} card={card} />
                ))}
              </div>

              <div className="absolute bottom-0 left-0 w-full h-20 z-10 bg-gradient-to-t from-surface-800 to-transparent pointer-events-none" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
