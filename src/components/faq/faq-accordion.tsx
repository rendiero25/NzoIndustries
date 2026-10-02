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
    ? "rounded-[18px] border border-border bg-white p-0[#3a3a3a][#272729]"
    : "rounded-[18px] border border-border bg-muted p-0[#3a3a3a][#272729]";

  return (
    <Accordion type="single" collapsible className={cn("w-full", surfaceClass)}>
      <AccordionItem value={id} className="border-0">
        <AccordionTrigger
          className={cn(
            "px-6 py-6 text-base font-semibold text-foreground hover:no-underline",
            "hover:border-foreground[#FFAD88]",
            "[&_[data-slot=accordion-trigger-icon]]:text-brand",
          )}
        >
          {question}
        </AccordionTrigger>
        <AccordionContent className="px-6 pt-0 pb-6">
          <div className="pt-4[#3a3a3a] border-t border-border">
            <p className="text-muted-foreground[#cccccc] text-[15px] leading-[1.5] font-normal whitespace-pre-line">
              {answer}
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
