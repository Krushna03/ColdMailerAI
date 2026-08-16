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
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useCopyToClipboard } from "../../utils/clipboard";

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
          <span className="text-gray-400">Subject: </span>
          {template.subject}
        </p>
      )}
      {isEmail ? template.body : template.prompt}
    </div>
  );
}

export default function CommunityTemplateCard({
  template,
  onUseTemplate,
  index = 0,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyToClipboard = useCopyToClipboard(setCopied);

  const isEmail = template.type === "email";
  const contentToCopy = getTemplateContent(template);

  const handleCopy = (e) => {
    e.stopPropagation();
    copyToClipboard(contentToCopy);
  };

  const handleUse = (e) => {
    e.stopPropagation();
    setOpen(false);
    onUseTemplate?.(template);
  };

  return (
    <>
      <div
        className="group relative flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-surface-800/90 to-surface-850/90 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-2xl hover:shadow-brand-900/30"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-950/40 px-3 py-1 text-xs font-medium text-brand-300">
              {isEmail ? (
                <Mail className="h-3.5 w-3.5 text-brand-400" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              )}
              {template.category}
            </span>

            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-gray-400">
              {isEmail ? "Full Email" : "Prompt Template"}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-brand-200 transition-colors">
              {template.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-400">
              {template.description}
            </p>
          </div>

          <div className="relative rounded-xl border border-white/5 bg-black/40 p-3.5">
            <p className="line-clamp-3 font-mono text-xs leading-relaxed text-gray-300">
              {isEmail ? (
                <>
                  <span className="text-gray-500 font-sans font-medium">Subject: </span>
                  {template.subject}
                  <br />
                  <span className="text-gray-500 font-sans font-medium">Body: </span>
                  {template.body}
                </>
              ) : (
                template.prompt
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="h-8 gap-1.5 px-2.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 border-white/10 bg-white/5 px-3 text-xs text-gray-200 hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleUse}
              className="h-8 gap-1.5 bg-brand-600 px-3 text-xs font-medium text-white shadow-md hover:bg-brand-500"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Use Template
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-surface-900 text-white backdrop-blur-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-950/40 px-3 py-0.5 text-xs font-medium text-brand-300">
                {template.category}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              {template.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              {template.description}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 max-h-[50vh] overflow-y-auto rounded-xl border border-white/10 bg-surface-950/80 p-4 custom-scroll">
            <TemplatePreview template={template} isEmail={isEmail} />
          </div>

          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="text-gray-400 hover:bg-white/10 hover:text-white"
              >
                Close
              </Button>
            </DialogClose>

            <Button
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5 border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Content
                </>
              )}
            </Button>

            <Button
              onClick={handleUse}
              className="gap-1.5 bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500"
            >
              <Sparkles className="h-4 w-4" />
              Use Template in App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
