import { Check, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqItems = [
  {
    question: "What is Goalspace?",
    answer: "Goalspace is an AI-powered learning and goal achievement platform that helps you break down your goals into manageable spaces, provides personalized mentorship, and tracks your progress. It combines structured learning paths with intelligent guidance to help you succeed."
  },
  {
    question: "How does the AI mentorship work?",
    answer: "Each space in Goalspace comes with a dedicated AI mentor tailored to your goal. The mentor provides personalized guidance, answers questions, helps you stay on track, and adapts its teaching style to your learning preferences. You can interact with your mentor through chat and receive real-time feedback on your progress."
  },
  {
    question: "Can I track multiple goals simultaneously?",
    answer: "Yes! Goalspace allows you to manage multiple goals simultaneously. Each goal can be broken down into separate spaces, each with its own mentor, resources, and progress tracking. The platform helps you balance and prioritize your different goals effectively."
  },
  {
    question: "How does the knowledge base feature work?",
    answer: "The knowledge base is a smart documentation system within each space that helps you organize learning materials, tutorials, guides, and exercises. You can easily add, categorize, and search through documents, making it simple to maintain and access your learning resources."
  },
  {
    question: "Is my data secure and private?",
    answer: "Yes, we take security and privacy seriously. All your data is encrypted, stored securely, and protected by industry-standard security measures. Your personal information and learning progress are only accessible to you, and we never share your data with third parties."
  },
  {
    question: "Can I collaborate with others?",
    answer: "Currently, Goalspace focuses on individual goal achievement and learning. However, we're working on collaboration features that will allow you to share spaces, learn together, and support each other's goals while maintaining privacy and personal customization."
  },
  {
    question: "How do I get started?",
    answer: "Getting started is easy! Simply sign up for an account, create your first goal, and let our AI help you break it down into manageable spaces. Each space will be equipped with a mentor, resources, and tools to help you succeed. You can start with a single goal and expand as you become more comfortable with the platform."
  },
  {
    question: "What types of goals can I work on?",
    answer: "Goalspace supports a wide range of goals, from learning new skills and languages to personal development and project completion. Whether you're looking to master programming, improve your fitness, learn an instrument, or achieve professional certifications, our AI mentors and space system can be adapted to support your specific needs."
  }
];

function FAQ() {
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="flex gap-10 flex-col">
            <div className="flex gap-4 flex-col">
              <div>
                <Badge variant="outline">FAQ</Badge>
              </div>
              <div className="flex gap-2 flex-col">
                <h4 className="text-3xl md:text-5xl tracking-tighter max-w-xl text-left font-regular">
                  Frequently Asked Questions
                </h4>
                <p className="text-lg max-w-xl lg:max-w-lg leading-relaxed tracking-tight text-muted-foreground text-left">
                  Find answers to common questions about Goalspace, our AI mentors, and how we can help you achieve your goals more effectively.
                </p>
              </div>
              <div className="">
                <Button className="gap-4" variant="outline">
                  Have more questions? Contact us <PhoneCall className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={"index-" + index}>
                <AccordionTrigger>
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

export { FAQ };
