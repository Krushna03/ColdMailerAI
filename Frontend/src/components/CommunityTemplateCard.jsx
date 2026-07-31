import { useState } from "react";
import { Check, Copy, Eye, Mail, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useCopyToClipboard } from "../utils/clipboard";

const getTemplateContent = (template) => {
  if (template.type === "email") {
    return `Subject: ${template.subject}\n\n${template.body}`;
  }

  return template.prompt;
};

function TemplatePreview({ template, isEmail }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
      {isEmail && (
        <p className="mb-4 font-medium text-white">
          Subject: {template.subject}
        </p>
      )}
      <p>{isEmail ? template.body : template.prompt}</p>
    </div>
  );
}

export default function CommunityTemplateCard({ template }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const copyTemplate = useCopyToClipboard(setCopied);
  const isEmail = template.type === "email";

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-800/80 transition duration-300 hover:-translate-y-1 hover:border-brand-400/50 hover:shadow-[0_20px_60px_-30px_rgba(111,52,237,0.8)] curs">
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isEmail ? "bg-brand-500/15 text-brand-200" : "bg-amber-400/10 text-amber-300"}`}>
              {isEmail ? <Mail className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {template.featured && (
                <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-brand-100">
                  Popular
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                {template.category}
              </span>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-white">{template.title}</h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-gray-400">{template.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <span key={tag} className="text-xs text-gray-500">
                #{tag}
              </span>
            ))}
          </div>

          <div className="relative mt-5 max-h-52 overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                {isEmail ? "Email preview" : "Prompt template"}
              </span>
              <span className="text-xs text-gray-500">{template.tone}</span>
            </div>

            <div className="px-4 py-4">
              <TemplatePreview template={template} isEmail={isEmail} />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface-800 to-transparent" />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            <Eye className="h-4 w-4" />
            View template
          </button>
          <button
            type="button"
            onClick={() => copyTemplate(getTemplateContent(template), template.id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            {copied === template.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === template.id ? "Copied" : "Copy"}
          </button>
        </div>
      </article>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white [&>button]:focus:ring-brand-400/40 [&>button]:focus:ring-offset-surface-900">
          <DialogHeader className="space-y-0 border-b border-white/10 px-6 pb-5 pt-6 pr-12 text-left">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isEmail ? "bg-brand-500/15 text-brand-200" : "bg-amber-400/10 text-amber-300"}`}>
                {isEmail ? <Mail className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isEmail ? "Email template" : "Prompt template"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                {template.category}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                {template.tone}
              </span>
            </div>

            <DialogTitle className="text-2xl font-semibold tracking-normal text-white">
              {template.title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-gray-400">
              {template.description}
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scroll flex-1 overflow-y-auto px-6 py-5">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                {isEmail ? "Email preview" : "Prompt template"}
              </p>
              <TemplatePreview template={template} isEmail={isEmail} />
            </div>

            {template.type === "prompt" && template.variables?.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                  Variables to fill
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-gray-300"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 border-t border-white/10 p-4 sm:space-x-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => copyTemplate(getTemplateContent(template), template.id)}
              className="bg-brand text-white hover:bg-brand-600"
            >
              {copied === template.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === template.id ? "Copied" : "Copy template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}