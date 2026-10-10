import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Copy, CopyCheckIcon, Loader2, MailOpen, Mic, MicOff, Image, X, Send } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "../../hooks/use-toast";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { formatBulletPoints, processGeneratedEmail } from '../../lib/processGeneratedEmail';
import { useCopyToClipboard, getUserInitial, parseEmail, openGmailCompose, processImageFiles } from '../../utils';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useMailboxes, useSendGeneratedEmail } from '../../hooks/useMailboxes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { RootState } from '../../context/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const MAX_TEXTAREA_HEIGHT = 100;

const PLACEHOLDER_SUGGESTIONS = [
  "No additional suggestions found.",
  "Please provide text containing an email and additional content.",
];

export interface EmailOutputProps {
  emailId?: string | null;
  leadId?: string | null;
  prompt: string;
  generatedEmail: string;
  bottomPrompt: string;
  setBottomPrompt: (prompt: string) => void;
  onUpdate: (e: React.FormEvent, images?: File[]) => void;
  loading: boolean;
  updating: boolean;
  onBack: () => void;
  error?: any;
  images?: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
}

export function EmailOutput({
  emailId = null,
  leadId = null,
  prompt,
  generatedEmail,
  bottomPrompt,
  setBottomPrompt,
  onUpdate,
  loading,
  updating,
  onBack,
  error,
  images = [],
  setImages
}: EmailOutputProps) {

  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [readMorePrompt, setReadMorePrompt] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const navigate = useNavigate();
  const keyboardOffset = useKeyboardOffset();
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const user = useSelector((state: RootState) => state.auth.userData);
  const userInitial = getUserInitial(user?.username);

  const { data: mailboxes = [] } = useMailboxes();
  const sendGeneratedEmailMutation = useSendGeneratedEmail();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendToEmail, setSendToEmail] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendMailboxId, setSendMailboxId] = useState("");

  const {
    listening,
    browserSupportsSpeechRecognition,
    handleMicClick,
    stopListening,
    handleValueChange,
  } = useVoiceInput(bottomPrompt, setBottomPrompt);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    processImageFiles(
      files,
      images.length,
      (newFile: File) => setImages((prev) => [...prev, newFile]),
      (newPreview: string) => setImagePreviews((prev) => [...prev, newPreview]),
      (err: string) => toast({ title: "Upload Error", description: err, variant: "destructive" }),
      1
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
        (err: string) => toast({ title: "Upload Error", description: err, variant: "destructive" }),
        1
      );
      e.preventDefault();
    }
  };

  const handleRemoveImage = (index: number) => {
    if (isInputLocked) return;
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

  const handleCopyToClipboard = useCopyToClipboard(setCopied);

  const { email, content } = useMemo(
    () => processGeneratedEmail(generatedEmail),
    [generatedEmail]
  );

  const [suggestions, setSuggestions] = useState("");

  useEffect(() => {
    const trimmed = content?.trim();
    if (trimmed && !PLACEHOLDER_SUGGESTIONS.includes(trimmed)) {
      setSuggestions(trimmed);
    }
  }, [content]);

  const formatAdditionalContent = (rawContent: string) => {
    return formatBulletPoints(rawContent);
  };

  const { subject, body } = useMemo(() => parseEmail(email), [email]);

  const handleGmailCompose = () => {
    openGmailCompose({
      to: user?.email || "",
      subject,
      body,
      userEmail: user?.email,
    });
  };

  const handleOpenSendModal = () => {
    if (mailboxes.length === 0) {
      toast({
        title: "No Connected Mailbox",
        description: "Please connect a Gmail, Outlook, or SMTP mailbox in your dashboard first.",
      });
      navigate("/dashboard/mailboxes");
      return;
    }
    const defaultMb = mailboxes.find((m: any) => m.isDefault && m.status === "active") || mailboxes.find((m: any) => m.status === "active") || mailboxes[0];
    setSendMailboxId(defaultMb?._id || "");
    setSendSubject(subject || "Follow up");
    setSendToEmail("");
    setSendModalOpen(true);
  };

  const handleDispatchEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendToEmail) {
      toast({
        title: "Recipient Required",
        description: "Please enter a destination email address.",
        variant: "destructive",
      });
      return;
    }

    if (!emailId) {
      toast({
        title: "Email not persisted",
        description: "Cannot dispatch unsaved email without an email ID.",
        variant: "destructive",
      });
      return;
    }

    sendGeneratedEmailMutation.mutate(
      {
        emailId,
        mailboxId: sendMailboxId,
        to: sendToEmail,
        subject: sendSubject,
        body,
        leadId,
      },
      {
        onSuccess: () => {
          setSendModalOpen(false);
        },
      }
    );
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (listening) stopListening();
    onUpdate(e, images);
  };

  const isInputLocked = !!error || updating || loading;
  const isUpdateDisabled = !bottomPrompt.trim() || isInputLocked;
  const isMicDisabled = isInputLocked;

  useEffect(() => {
    if (isMicDisabled && listening) stopListening();
  }, [isMicDisabled, listening, stopListening]);

  // Auto-resize the modification textareas (mobile + desktop share the same behaviour)
  useLayoutEffect(() => {
    [mobileTextareaRef, desktopTextareaRef].forEach((ref) => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    });
  }, [bottomPrompt]);

  const renderEmailBody = ({ dark = false } = {}) => {
    if (loading) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-2 ${dark ? "text-brand-200" : "text-blue-900"}`} />
            <p className={`font-medium ${dark ? "text-gray-300" : "text-blue-900"}`}>Generating your email...</p>
          </div>
        </div>
      );
    }
    if (error) {
      const showUpgrade = /upgrade|plan|limit|revision/i.test(error);
      return (
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-lg ${dark ? "bg-danger-dark" : "bg-red-50"}`}>
          <div className="max-w-md">
            <h3 className={`font-bold text-lg mb-1 ${dark ? "text-red-300" : "text-brand-deep"}`}>Email Generation Failed</h3>
            <p className={`text-sm whitespace-pre-wrap max-w-xs ${dark ? "text-red-200/80" : "text-brand-deep"}`}>{error}</p>
            {showUpgrade && (
              <> 
              <Button
                onClick={() => navigate("/generated-emails")}
                className="mt-4 mr-3 bg-brand-deep text-white hover:bg-brand-deep/90"
              >
                Create New Email
              </Button>
              <Button
                onClick={() => navigate("/dashboard/pricing")}
                className="mt-4 bg-brand-deep text-white hover:bg-brand-deep/90"
              >
                Upgrade Plan
              </Button>
              </>
            )}
          </div>
        </div>
      );
    }
    return (
      <pre className={`whitespace-pre-wrap font-sans ${dark ? "text-gray-100 text-[14px] leading-relaxed" : "text-black text-xs sm:text-base"}`}>{email}</pre>
    );
  };

  return (
    <>
      {/* ============================= MOBILE LAYOUT ============================= */}
      <div className="sm:hidden flex flex-col pb-28 mt-2">

        {/* Prompt bubble */}
        <div className="flex items-start gap-2.5 mb-4">
          <span className="shrink-0 h-8 w-8 flex items-center justify-center bg-brand-deep rounded-full text-sm font-semibold text-white">
            {userInitial?.toUpperCase()}
          </span>
          <div className="flex-1 bg-surface-800 border border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <p className="text-[15px] leading-relaxed text-gray-200 break-words">
              {!readMorePrompt ? prompt?.slice(0, 160) : prompt}
              {prompt?.length > 160 && (
                <button
                  onClick={() => setReadMorePrompt((v) => !v)}
                  className="ml-1 text-brand-100 font-medium"
                >
                  {readMorePrompt ? "Read less" : "…Read more"}
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Assistant response card */}
        <div className="rounded-2xl overflow-hidden border border-gray-700 bg-surface-850 shadow-lg">
          {/* Card header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-800 bg-surface-800">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/white-logo.png" alt="logo" className="h-6 w-6 p-1 rounded bg-brand-900" />
              <span className="text-xs font-medium text-gray-300 truncate">Generated Email</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleOpenSendModal}
                disabled={!!error || !email}
                aria-label="Send via Mailbox"
                className="h-7 px-2.5 flex items-center gap-1 text-xs text-gray-300 bg-surface-900 border border-gray-700 rounded-full active:scale-95 transition-transform disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                Send
              </button>
              <button
                onClick={() => handleCopyToClipboard(email)}
                disabled={!!error || !email}
                aria-label={copied ? "Copied" : "Copy email"}
                className="h-7 w-7 flex items-center justify-center text-gray-300 bg-surface-900 border border-gray-700 rounded-full active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
              >
                {copied ? <CopyCheckIcon className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              </button>
              <button
                onClick={onBack}
                aria-label="Back to input"
                className="flex items-center gap-1 text-xs text-gray-300 bg-surface-900 border border-gray-700 rounded-full px-2.5 py-1.5 active:scale-95 transition-transform"
              >
                <TiArrowBack className="h-3 w-3" />
                Back
              </button>
            </div>
          </div>

          {/* Email content */}
          <div className="relative p-4 min-h-[350px] max-h-[52vh] overflow-y-auto custom-scroll">
            {renderEmailBody({ dark: true })}
          </div>
        </div>

        {/* Additional suggestions */}
        {!error && suggestions?.trim()?.length > 0 && (
          <div className="mt-4 bg-surface-800 border border-gray-800 rounded-2xl p-3.5">
            <p className="text-xs font-semibold text-gray-400 mb-2">Suggestions & tips</p>
            <p className="text-gray-200 whitespace-pre-wrap text-[13.5px] tracking-wide leading-[1.7]">
              {formatAdditionalContent(suggestions)}
            </p>
          </div>
        )}
      </div>

      {/* Portal keeps fixed bar on the viewport — ancestors use transform-gpu / contain:paint */}
      {typeof document !== "undefined" &&
        createPortal(
          <form
            onSubmit={handleUpdateSubmit}
            style={{ bottom: keyboardOffset, paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
            className="sm:hidden fixed inset-x-0 z-30 px-3 pt-3 bg-gradient-to-t from-surface-900 via-surface-900 to-transparent transition-[bottom] duration-10"
          >


            <div className="flex items-end gap-2 bg-surface-800 border border-gray-700 rounded-[26px] px-2 py-2 focus-within:border-gray-500 transition-colors">
              <div className="flex-1 flex flex-col min-w-0">
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1 mb-1 ml-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-700">
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          disabled={isInputLocked}
                          className={`absolute -top-1.5 -right-1.5 bg-gray-900/90 hover:bg-red-500 text-gray-300 hover:text-white rounded-full p-0.5 border border-gray-700 transition-colors ${isInputLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
                  rows={imagePreviews.length > 0 ? 3 : 1}
                  placeholder={listening ? "Listening…" : "Add modifications..."}
                  className="w-full flex-1 resize-none bg-transparent text-gray-200 text-base placeholder:text-gray-500 px-2 py-2 max-h-36 overflow-y-auto focus:outline-none custom-scroll disabled:opacity-60"
                  value={bottomPrompt}
                  onChange={handleValueChange}
                  disabled={isInputLocked}
                  onPaste={handlePaste}
                />
                <div className="flex items-center gap-2 px-2 pb-2">
                  <label
                    htmlFor="image-upload-mobile"
                    className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-full transition-colors active:scale-95 ${images.length >= 1 || isInputLocked || listening ? 'bg-surface-800 text-gray-600 border border-gray-800 cursor-not-allowed' : 'bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-600 cursor-pointer'}`}
                    title="Add image"
                  >
                    <Image className="h-4 w-4" />
                    <input
                      ref={mobileFileInputRef}
                      id="image-upload-mobile"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={isInputLocked || listening || images.length >= 1}
                    />
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isMicDisabled}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                aria-pressed={listening}
                title={ browserSupportsSpeechRecognition
                    ? listening
                      ? "Stop listening"
                      : "Speak your prompt"
                    : "Voice input not supported"
                }
                className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-full transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${listening ? "bg-red-500/90 hover:bg-red-500 text-white animate-pulse" : "bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-600"}`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="submit"
                disabled={isUpdateDisabled}
                aria-label="Update email"
                className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-full transition-colors active:scale-95 ${isUpdateDisabled ? "bg-brand-800 text-gray-400" : "bg-brand-700 text-white"}`}
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
              </button>
            </div>
          </form>,
          document.body
        )}

      {/* ============================= DESKTOP / TABLET LAYOUT ============================= */}
      <div className="hidden sm:flex sm:flex-row gap-7 mt-1">

        <div className="sm:w-[63%] flex flex-col">

          <div className="flex justify-start items-center">
            <Button 
              onClick={() => handleCopyToClipboard(email)} 
              className="px-2 bg-none text-[12px]" 
              disabled={!!error || !email}
              size="sm"
            >
              {copied ? (
                <>
                  Copied <CopyCheckIcon className="mt-0.5 w-3 h-3 text-gray-200" />
                </>
              ) : (
                <>
                  Copy <Copy className="mt-0.5 w-1 h-1 p-0" />
                </>
              )}
            </Button>

            <Button 
              onClick={handleGmailCompose} 
              className="px-2 bg-none text-[12px]" 
              disabled={!!error || !email}
              size="sm"
            >
              Gmail <MailOpen className="mt-0.5 w-3 h-3 p-0" />
            </Button>

            <Button 
              onClick={handleOpenSendModal} 
              className="px-2 bg-none text-[12px]" 
              disabled={!!error || !email}
              size="sm"
            >
              Send via Mailbox <Send className="mt-0.5 w-3 h-3 p-0" />
            </Button>
          </div>

          <div className="bg-surface-850 border border-gray-700 p-5 w-full h-[calc(100dvh-10rem)] overflow-y-auto custom-scroll relative rounded-xl">
            {renderEmailBody({ dark: true })}
          </div>
        </div>

        <div className="w-full sm:w-[37%] flex flex-col h-[calc(100dvh-8rem)]">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex self-start mt-10 mb-2 bg-gray-950 hover:bg-gray-950 text-gray-300 hover:text-gray-200 px-2 h-6 text-xs font-bold"
          >
            <TiArrowBack className='w-4 h-4' />
            Back to Input
          </Button>

          <div className={`flex flex-col flex-1 min-h-0 border border-gray-400 p-2 pb-1 rounded-xl ${readMorePrompt ? "overflow-y-auto custom-scroll" : "overflow-hidden"}`}>
            <p className="bg-surface-600 p-2 text-lg font-normal text-gray-100 rounded-xl flex items-start gap-2 shadow-xl">
              <span className="bg-brand-deep px-3 py-1 rounded-full text-lg">
                {userInitial?.toUpperCase()}
              </span>
              <span className="flex-1 text-[16px]">
                {!readMorePrompt ? `${prompt.slice(0, 170)}` : prompt}
                {prompt?.length > 170 && (readMorePrompt ? (
                  <button onClick={() => setReadMorePrompt(false)} className='text-blue-500 text-base'>
                    Read Less
                  </button>
                ) : (
                  <button onClick={() => setReadMorePrompt(true)} className='text-blue-500 text-base'>
                    Read More
                  </button>
                ))}
              </span>
            </p>

            <div className={`block mt-3 bg-surface-700 shadow-xl p-2 rounded-xl ${readMorePrompt ? "h-auto" : "flex-1 min-h-0 overflow-y-auto custom-scroll"}`}>
              <p className='text-white whitespace-pre-wrap text-[14.5px] tracking-wide leading-[1.7] z-10'>
                {
                  error
                    ? "Could not generate additional suggestions due to the error."
                    : (suggestions?.trim()?.length > 0 ? formatAdditionalContent(suggestions) : "No additional content needed, the email is already generated. Or your request is not clear!")
                }
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateSubmit} className="w-full mt-2 shrink-0">


            <div className="flex flex-col bg-surface-800 border border-gray-700 rounded-[20px] p-2 shadow-lg focus-within:border-gray-500 transition-colors">
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1 mb-1 ml-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-700 shadow-md">
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={isInputLocked}
                        className={`absolute -top-1.5 -right-1.5 bg-gray-900/90 hover:bg-red-500 text-gray-300 hover:text-white rounded-full p-0.5 border border-gray-700 transition-colors shadow-sm ${isInputLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
                placeholder={listening ? "Listening…" : "Add any specific requirements or modifications..."}
                className="w-full resize-none bg-transparent text-gray-200 text-sm px-2 pt-1 placeholder:text-gray-500 focus:outline-none custom-scroll disabled:opacity-60"
                value={bottomPrompt}
                onChange={handleValueChange}
                disabled={isInputLocked}
                onPaste={handlePaste}
              />
              <div className="flex justify-between items-center gap-2 mt-2 px-2">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="image-upload-desktop"
                    className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-full transition-colors active:scale-95 ${images.length >= 1 || isInputLocked || listening ? 'bg-surface-800 text-gray-600 cursor-not-allowed' : 'bg-surface-700 hover:bg-surface-600 text-gray-300 cursor-pointer'}`}
                    title="Add image"
                  >
                    <Image className="h-4 w-4" />
                    <input
                      ref={desktopFileInputRef}
                      id="image-upload-desktop"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={isInputLocked || listening || images.length >= 1}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={isMicDisabled}
                    aria-label={listening ? "Stop voice input" : "Start voice input"}
                    aria-pressed={listening}
                    title={
                      browserSupportsSpeechRecognition
                        ? listening
                          ? "Stop listening"
                          : "Speak your prompt"
                        : "Voice input not supported"
                    }
                    className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${listening ? "bg-red-500/90 hover:bg-red-500 text-white animate-pulse" : "bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-700"}`}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdateDisabled}
                    aria-label="Update email"
                    className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-full transition-colors active:scale-95 ${isUpdateDisabled ? 'bg-brand-800 text-gray-400' : 'bg-brand-700 text-white'}`}
                  >
                    {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Send Email via Connected Mailbox Dialog */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Dispatch via Connected Mailbox
            </DialogTitle>
            <DialogDescription>
              Select a connected mailbox to deliver this cold email directly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDispatchEmail} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-medium text-gray-300">Sending Mailbox</label>
              <Select
                value={sendMailboxId}
                onValueChange={(value) => setSendMailboxId(value)}
              >
                <SelectTrigger className="mt-1 w-full bg-surface-950 border-white/10 text-[12px] md:text-[13px] text-white">
                  <SelectValue placeholder="Select a connected mailbox" />
                </SelectTrigger>
                <SelectContent className="bg-surface-950 border-white/15 text-white text-[12px] md:text-[13px]">
                  {mailboxes.map((mb: any) => (
                    <SelectItem className="text-[12px] md:text-[13px]" key={mb._id} value={mb._id}>
                      {mb.email} ({mb.provider?.toUpperCase()}) — {mb.sentToday || 0}/{mb.dailyLimit} sent today
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-300">
                To (Recipient Email) <span className="text-red-400">*</span>
              </label>
              <Input
                type="email"
                required
                placeholder="prospect@targetcompany.com"
                value={sendToEmail}
                onChange={(e) => setSendToEmail(e.target.value)}
                className="mt-1 bg-surface-950 border-white/10 md:text-[13px]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-300">Subject</label>
              <Input
                type="text"
                placeholder="Email Subject"
                value={sendSubject}
                onChange={(e) => setSendSubject(e.target.value)}
                className="mt-1 bg-surface-950 border-white/10 md:text-[13px]"
              />
            </div>

            <div className="rounded-lg border border-white/5 bg-surface-950 p-3">
              <p className="text-xs font-medium text-gray-400 mb-1">Preview Body Snippet</p>
              <p className="text-[12px] text-gray-300 line-clamp-3 font-mono">
                {body || email}
              </p>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSendModalOpen(false)}
                className="text-gray-400 hover:text-white border border-gray-800 bg-surface-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendGeneratedEmailMutation.isPending}
                className="bg-brand hover:bg-brand-400 text-white font-semibold text-xs py-1 gap-1.5"
              >
                {sendGeneratedEmailMutation.isPending ? "Dispatching..." : "Send Email Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
