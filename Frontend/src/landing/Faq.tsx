import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { faqData } from "../data/faqData";

export default function Faq() {
  return (
    <div>
      <div className="absolute top-[55%] rotate-12 right-26 w-[70%] h-28 bg-brand opacity-25 blur-3xl"></div>

      <Accordion type="single" collapsible className="w-full z-40">
        {faqData.map(({ id, question, answer }) => (
          <AccordionItem key={id} value={id} className="mb-5">
            <AccordionTrigger className="text-base text-gray-300 sm:text-xl py-4 px-9 rounded-t-full z-50">
              {question}
            </AccordionTrigger>
            <AccordionContent className="font-normal text-gray-200 text-base sm:text-lg px-9 pt-2">
              {answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
