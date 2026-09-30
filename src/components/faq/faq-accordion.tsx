"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface FaqAccordionProps {
  id: string;
  question: string;
  answer: string;
  isDark: boolean;
}

export function FaqAccordion({ id, question, answer, isDark }: FaqAccordionProps) {
  const surfaceClass = isDark
    ? "rounded-[18px] border border-[#e0e0e0] bg-white p-0[#3a3a3a][#272729]"
    : "rounded-[18px] border border-[#e0e0e0] bg-[#f5f5f7] p-0[#3a3a3a][#272729]";

  return (
    <Accordion type="single" collapsible className={cn("w-full", surfaceClass)}>
      <AccordionItem value={id} className="border-0">
        <AccordionTrigger
          className={cn(
            "px-6 py-6 text-[17px] font-semibold text-[#1d1d1f] hover:no-underline",
            "hover:border-[#EA5329][#FFAD88]",
            "[&_[data-slot=accordion-trigger-icon]]:text-brand",
          )}
        >
          {question}
        </AccordionTrigger>
        <AccordionContent className="px-6 pt-0 pb-6">
          <div className="pt-4[#3a3a3a] border-t border-[#e0e0e0]">
            <p className="text-[#7a7a7a][#cccccc] text-[15px] leading-[1.5] font-normal whitespace-pre-line">
              {answer}
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
