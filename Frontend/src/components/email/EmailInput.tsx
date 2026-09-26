import React, { useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff, Image, X } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useKeyboardOffset } from "../../hooks/useKeyboardOffset";
import { useVoiceInput } from "../../hooks/useVoiceInput";
import { PROMPT_SUGGESTIONS } from "../../data/promptSuggestions";
import { processImageFiles } from "../../utils";

const MAX_MOBILE_TEXTAREA_HEIGHT = 120;
const MAX_DESKTOP_TEXTAREA_HEIGHT = 200;

export interface EmailInputProps {
  prompt: string;
  setPrompt: (value: string | ((prev: string) => string)) => void;
  onSubmit: (e: React.FormEvent, images?: File[]) => void;
  images?: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
}

export function EmailInput({ prompt, setPrompt, onSubmit, images = [], setImages }: EmailInputProps) {
  const { toast } = useToast();
  const keyboardOffset = useKeyboardOffset();
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    listening,
    browserSupportsSpeechRecognition,
    handleMicClick,
    stopListening,
    handleValueChange,
  } = useVoiceInput(prompt, setPrompt);

  useLayoutEffect(() => {
    let mobileExpanded = false;
    const mobileEl = mobileTextareaRef.current;
    if (mobileEl) {
      mobileEl.style.height = "auto";
      const sHeight = mobileEl.scrollHeight;
      mobileEl.style.height = `${Math.min(sHeight, MAX_MOBILE_TEXTAREA_HEIGHT)}px`;
      mobileExpanded = prompt.trim() !== "" && sHeight > 40;
    }
    let desktopExpanded = false;
    const desktopEl = desktopTextareaRef.current;
    if (desktopEl) {
      desktopEl.style.height = "auto";
      const sHeight = desktopEl.scrollHeight;
      desktopEl.style.height = `${Math.min(sHeight, MAX_DESKTOP_TEXTAREA_HEIGHT)}px`;
      desktopExpanded = prompt.trim() !== "" && sHeight > 40;
    }
    setIsExpanded(mobileExpanded || desktopExpanded);
  }, [prompt]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    processImageFiles(
      files,
      images.length,
      (newFile: File) => setImages((prev) => [...prev, newFile]),
      (newPreview: string) => setImagePreviews((prev) => [...prev, newPreview]),
      (err: string) => toast({ title: "Upload Error", description: err, variant: "destructive" })
    );
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      processImageFiles(
        files,
        images.length,
        (newFile: File) => setImages((prev) => [...prev, newFile]),
        (newPreview: string) => setImagePreviews((prev) => [...prev, newPreview]),
        (err: string) => toast({ title: "Upload Error", description: err, variant: "destructive" })
      );
      e.preventDefault();
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (mobileFileInputRef.current) {
      mobileFileInputRef.current.value = "";
    }
    if (desktopFileInputRef.current) {
      desktopFileInputRef.current.value = "";
    }
  };

  useLayoutEffect(() => {
    if (images.length === 0) {
      setImagePreviews([]);
      if (mobileFileInputRef.current) {
        mobileFileInputRef.current.value = "";
      }
      if (desktopFileInputRef.current) {
        desktopFileInputRef.current.value = "";
      }
    }
  }, [images]);

  const handleFormSubmit = (e: React.FormEvent) => {
    if (listening) stopListening();
    onSubmit(e, images);
  };

  return (
    <div className="w-full max-w-[750px] mx-auto px-0 flex flex-col">
      {/* Mobile Layout */}
      <div className="sm:hidden flex flex-1 flex-col pb-36">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-0.5">
          <div className="inline-flex items-center gap-2 bg-brand-900 shadow-2xl rounded-full px-3 py-1 mb-3">
            <img src="/white-logo.png" alt="logo" className="h-7 w-7 p-1 rounded" />
            <span className="text-sm text-white">ColdMailerAI - AI Powered Email Generator</span>
          </div>
          <h1 className="text-[24px] font-bold tracking-wide mb-2 text-gray-200">
            Craft Perfect Cold Emails
          </h1>
          <p className="text-md sm:text-xl text-gray-300">
            Generate personalized, <br className="sm:hidden block" /> engaging emails with AI assistance
          </p>
        </div>


        <form
          onSubmit={handleFormSubmit}
          style={{ bottom: keyboardOffset, paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          className="fixed inset-x-0 z-30 px-3 pt-2 transition-[bottom] duration-10"
        >
          <div className="flex items-end gap-2 bg-surface-800 border border-gray-700 rounded-[26px] px-2 py-2 focus-within:border-gray-500 transition-colors">
            <div className="flex-1 flex flex-col min-w-0">
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1 mb-1 ml-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-700">
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-1.5 -right-1.5 bg-gray-900/90 hover:bg-red-500 text-gray-300 hover:text-white rounded-full p-0.5 border border-gray-700 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                ref={mobileTextareaRef}
                rows={imagePreviews.length > 0 ? 3 : 2}
                placeholder={listening ? "Listening…" : "Describe your email..."}
                className="w-full flex-1 resize-none bg-transparent text-gray-200 text-base placeholder:text-gray-500 px-2 py-2 max-h-40 overflow-y-auto focus:outline-none custom-scroll"
                aria-label="Describe your email"
                value={prompt}
                onChange={handleValueChange}
                onPaste={handlePaste}
              />
              <div className="flex items-center gap-2 px-2 pb-2">
                <label
                  htmlFor="image-upload"
                  className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${images.length >= 2 || listening ? 'bg-surface-800 text-gray-600 border border-gray-800 cursor-not-allowed' : 'bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-600 cursor-pointer'}`}
                  title="Add image"
                >
                  <Image className="h-3.5 w-3.5" />
                  <input
                    ref={mobileFileInputRef}
                    id="image-upload"
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={listening || images.length >= 2}
                  />
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={handleMicClick}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={listening}
              title={
                browserSupportsSpeechRecognition
                  ? listening
                    ? "Stop listening"
                    : "Speak your prompt"
                  : "Voice input not supported"
              }
              className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-full transition-colors active:scale-95 ${listening ? "bg-red-500/90 hover:bg-red-500 text-white animate-pulse" : "bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-600"}`}
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="submit"
              disabled={!prompt.trim()}
              aria-label="Generate email"
              className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-full transition-colors active:scale-95 ${!prompt.trim() ? "bg-brand-800 text-gray-400" : "bg-brand-700 text-white"}`}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex sm:flex-col w-full max-w-[760px] mx-auto mb-6">
        <div className="text-center mb-7 shrink-0">
          <div className="inline-flex items-center gap-2 bg-brand-900/80 border border-white/10 shadow-2xl rounded-full px-4 py-1.5 mb-4">
            <img src="/white-logo.png" alt="logo" className="h-7 w-7 p-1 rounded" />
            <span className="text-xs sm:text-sm font-medium text-gray-200">ColdMailerAI · AI Powered Email Generator</span>
          </div>
          <h1 className="text-[34px] md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-b from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Craft Perfect Cold Emails
          </h1>
          <p className="text-lg text-gray-400">
            Describe your goal and let AI write a ready-to-send email
          </p>
        </div>


        <form onSubmit={handleFormSubmit} className="flex flex-col">
          <div className={`relative ${imagePreviews.length > 0 ? 'min-h-[240px]' : 'min-h-[160px]'} h-auto flex flex-col rounded-[24px] p-[1.5px] bg-gradient-to-br from-brand-400/50 via-gray-700/40 to-gray-800/20 focus-within:from-brand-400 focus-within:via-brand-500/40 transition-colors duration-200 shadow-2xl shadow-brand-900/40`}>
            <div className="flex-1 flex flex-col rounded-[22px] bg-surface-850/95 backdrop-blur-sm px-4 py-3">
              <div className="flex-1 flex flex-col">
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-700 shadow-md">
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-1.5 -right-1.5 bg-gray-900/90 hover:bg-red-500 text-gray-300 hover:text-white rounded-full p-0.5 border border-gray-700 transition-colors shadow-sm"
                          aria-label="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  ref={desktopTextareaRef}
                  placeholder={
                    listening
                      ? "Listening… speak your email goal"
                      : "Describe your email — who it's for, the goal, and any key details…"
                  }
                  className="w-full resize-none bg-transparent text-gray-100 text-md leading-relaxed overflow-y-auto placeholder:text-gray-500 focus:outline-none custom-scroll"
                  aria-label="Describe your email"
                  value={prompt}
                  onChange={handleValueChange}
                  onPaste={handlePaste}
                />
                <div className="flex items-center justify-between mt-auto pt-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="image-upload-desktop"
                      className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${images.length >= 2 || listening ? 'bg-surface-800 text-gray-600 cursor-not-allowed' : 'bg-surface-700 hover:bg-surface-600 text-gray-300 cursor-pointer'}`}
                      title="Add image"
                    >
                      <Image className="h-4 w-4" />
                      <input
                        ref={desktopFileInputRef}
                        id="image-upload-desktop"
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={listening || images.length >= 2}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMicClick}
                      aria-label={listening ? "Stop voice input" : "Start voice input"}
                      aria-pressed={listening}
                      title={
                        browserSupportsSpeechRecognition
                          ? listening
                            ? "Stop listening"
                            : "Speak your prompt"
                          : "Voice input not supported"
                      }
                      className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors active:scale-95 ${listening ? "bg-red-500/90 hover:bg-red-500 text-white animate-pulse" : "bg-surface-700 hover:bg-surface-600 text-gray-300 "}`}
                    >
                      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                      type="submit"
                      disabled={!prompt.trim()}
                      aria-label="Generate email"
                      className={`h-10 w-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${!prompt.trim() ? "bg-brand-800/70 text-gray-400 cursor-not-allowed" : "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 cursor-pointer"}`}
                    >
                      <ArrowUp className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {
          !isExpanded && (
            <div className="flex flex-wrap justify-center gap-2 mt-5 shrink-0">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    if (listening) stopListening();
                    setPrompt(suggestion);
                  }}
                  className="text-xs text-gray-300 bg-surface-800/80 hover:bg-surface-700 border border-gray-700 hover:border-brand-500/60 rounded-full px-4 py-1.5 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}
