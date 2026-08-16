import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp, Loader2, Lock, Mic, MicOff, Image, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Header } from "../components/layout/Header"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import Sidebar from "../components/layout/Sidebar"
import { TiArrowBack } from "react-icons/ti"
import { ensureAuthenticated, useLogout } from "../helpers/tokenValidation"
import { useErrorToast } from "../hooks/useErrorToast"
import { useCopyToClipboard, parseEmail, getToken, capitalizeFirstLetter, openGmailCompose, getUserInitial, getUserData, processImageFiles } from "../utils"
import { useKeyboardOffset } from "../hooks/useKeyboardOffset"
import { EmailHistoryCard } from "../components/email/EmailHistoryCard"
import { useEmail, useUpdateEmailIteration } from "../hooks/useEmail"
import { usePlanUsage } from "../hooks/usePlanUsage"
import Seo from "../components/common/Seo"
import IterationLimitModal from "../components/email/IterationLimitModal"
import { useVoiceInput } from "../hooks/useVoiceInput"
import EmailHistorySkeleton from "../loaders/EmailHistorySkeleton"

export default function EmailHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const token = getToken()
  const logoutUser = useLogout()
  const showErrorToast = useErrorToast()

  const emailHistoryFromState = location.state?.email

  const initialData =
    emailHistoryFromState?._id === id && emailHistoryFromState?.generatedEmail
      ? emailHistoryFromState
      : undefined

  const { data: emailDetails, isLoading: fetchLoading } = useEmail(id, { initialData })
  const { mutate: iterateEmail, isPending: isGenerating } = useUpdateEmailIteration()

  const [newModification, setNewModification] = useState("")
  const { listening, browserSupportsSpeechRecognition, handleMicClick, stopListening, handleValueChange } = useVoiceInput(newModification, setNewModification)

  const [copiedId, setCopiedId] = useState(null)
  const keyboardOffset = useKeyboardOffset()
  const mobileTextareaRef = useRef(null)
  const desktopTextareaRef = useRef(null)
  const mobileFileInputRef = useRef(null)
  const desktopFileInputRef = useRef(null)
  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    processImageFiles(
      files,
      images.length,
      (newFile) => setImages((prev) => [...prev, newFile]),
      (newPreview) => setImagePreviews((prev) => [...prev, newPreview]),
      (err) => toast({ title: "Upload Error", description: err, variant: "destructive" }),
      1
    );
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
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
        (newFile) => setImages((prev) => [...prev, newFile]),
        (newPreview) => setImagePreviews((prev) => [...prev, newPreview]),
        (err) => toast({ title: "Upload Error", description: err, variant: "destructive" }),
        1
      );
      e.preventDefault();
    }
  };

  const handleRemoveImage = (index) => {
    if (isGenerating) return;
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (mobileFileInputRef.current) {
      mobileFileInputRef.current.value = "";
    }
    if (desktopFileInputRef.current) {
      desktopFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
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

  const handleClipboardCopy = useCopyToClipboard(setCopiedId)
  const isGenerateDisabled = !newModification.trim() || isGenerating

  // Auto-resize the textareas
  useLayoutEffect(() => {
    const mobileEl = mobileTextareaRef.current
    if (mobileEl) {
      mobileEl.style.height = "auto"
      mobileEl.style.height = `${Math.min(mobileEl.scrollHeight, 160)}px`
    }
    const desktopEl = desktopTextareaRef.current
    if (desktopEl) {
      desktopEl.style.height = "auto"
      desktopEl.style.height = `${Math.min(desktopEl.scrollHeight, 320)}px`
    }
  }, [newModification])

  const user = useSelector((state) => state.auth.userData)
  const userEmail = user?.email || ""
  const userInitial = getUserInitial(user?.username)

  const handleGmailCompose = useCallback((subject, body) => {
    openGmailCompose({ to: userEmail, subject, body, userEmail })
  }, [userEmail])

  const original = useMemo(() => parseEmail(emailDetails?.generatedEmail || ""), [emailDetails])

  const { planUsage } = usePlanUsage()
  const updatesCount = emailDetails?.chatEmails?.length || 0

  const regenLimit = useMemo(() => {
    const maxRegen = planUsage?.capabilities?.maxRegenerationsPerEmail
    if (planUsage) return maxRegen == null ? Infinity : maxRegen
    const currentUser = user || getUserData()
    // Fallbacks while plan usage is still loading
    return currentUser?.isPaidUser ? 3 : 1
  }, [user, planUsage])

  const limitReached = updatesCount >= regenLimit
  const maxVersions = Number.isFinite(regenLimit) ? regenLimit + 1 : null

  const [showLimitModal, setShowLimitModal] = useState(false)

  const handleCreateNewEmail = useCallback(() => {
    setShowLimitModal(false)
    navigate("/generate-email")
  }, [navigate])

  const handleUpgrade = useCallback(() => {
    setShowLimitModal(false)
    navigate("/dashboard/pricing")
  }, [navigate])

  const [iterations, setIterations] = useState([])

  useEffect(() => {
    if (emailDetails?.chatEmails?.length) {
      const mapped = emailDetails.chatEmails.map((item, index) => {
        const { subject, body } = parseEmail(item.generatedEmail)
        return {
          id: item?._id,
          version: index + 2,
          subject,
          body,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          modifications: item.prompt,
        }
      })
      const sortedMapped = mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setIterations(sortedMapped)
    } else {
      setIterations([])
    }
  }, [emailDetails])
  
  const generateNewEmailIteration = (e) => {
    e.preventDefault();
    if (isGenerating) return;
    if (limitReached) {
      setShowLimitModal(true);
      return;
    }
    if (!newModification.trim()) return;

    if (!ensureAuthenticated(token, logoutUser)) return;

    iterateEmail(
      { emailId: id, modification: newModification, images },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "New email iteration generated successfully",
            variant: "success",
          });
          setImages([]);
          
          if (updatesCount + 1 >= regenLimit) {
            setShowLimitModal(true);
          }
        },
        onError: (err) => {
          console.error("Axios error:", err);
          if (err.response?.status === 401) {
            logoutUser("Session expired. Please log in again.");
          }
          showErrorToast(err, { title: "Error" });
        },
        onSettled: () => {
          setNewModification("");
        },
      }
    );
  };
  
  return (
    <div className="h-full min-h-screen overflow-y-hidden flex flex-col relative bg-surface-900 z-0">
      <Seo title="Email History" noIndex />
      <div className="absolute top-20 -left-14 w-1/2 h-48 bg-brand opacity-30 blur-3xl pointer-events-none transform-gpu will-change-transform"></div>
      <div className="absolute bottom-20 right-0 w-1/2 h-40 bg-brand opacity-30 blur-3xl pointer-events-none transform-gpu will-change-transform"></div>

      <Sidebar />
      <Header />

      <div className="relative z-10 container mx-auto px-3 sm:px-8 lg:px-14 py-6 flex-1 overflow-y-auto custom-scroll transform-gpu [contain:paint]">
        {fetchLoading ? (
          <EmailHistorySkeleton />
        ) : !emailDetails ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-260px)]">
            <p className="text-red-400 text-lg font-medium">History not found or access denied.</p>
            <Button onClick={() => navigate("/generate-email")} className="mt-4 bg-brand hover:bg-brand-400">
              Go to Generator
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: prompt as a chat bubble with the user's avatar */}
            <div className="lg:hidden flex items-start gap-2.5 mb-4">
              <span className="shrink-0 h-8 w-8 flex items-center justify-center bg-brand-deep rounded-full text-sm font-semibold text-white">
                {userInitial?.toUpperCase()}
              </span>
              <div className="flex-1 bg-surface-800 border border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <p className="text-[15px] leading-relaxed text-gray-200 break-words">
                  {capitalizeFirstLetter(emailDetails?.prompt || '')}
                </p>
              </div>
            </div>

            <div className="w-full lg:flex lg:mt-4">
              <div className="flex flex-col lg:w-[65%] lg:mr-6 z-0">
                {/* Email versions as dark cards (matches the generated email UI) */}
                <div className="space-y-4 lg:space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] lg:max-h-[calc(100vh-8rem)] pb-28 lg:pb-4 custom-scroll">
                  {iterations?.map((iteration) => (
                    <EmailHistoryCard
                      key={iteration.id}
                      id={iteration.id}
                      badge="Latest"
                      badgeClass="bg-green-500/15 text-green-300"
                      date={iteration.createdAt}
                      subject={iteration.subject}
                      body={iteration.body}
                      modifications={iteration.modifications}
                      copiedId={copiedId}
                      onCopy={handleClipboardCopy}
                      onGmailCompose={handleGmailCompose}
                    />
                  ))}
                  <EmailHistoryCard
                    id="original"
                    badge="Original"
                    badgeClass="bg-purple-500/15 text-purple-300"
                    date={emailDetails?.createdAt}
                    subject={original.subject}
                    body={original.body}
                    copiedId={copiedId}
                    onCopy={handleClipboardCopy}
                    onGmailCompose={handleGmailCompose}
                  />
                </div>
              </div>

              {/* Desktop input panel */}
              <div className="hidden lg:block lg:w-[35%] sticky bottom-2">
                <Button 
                  onClick={() => navigate(`/generate-email`)}
                  className="inline-flex bg-none text-gray-300 hover:text-gray-200 px-3 h-8 text-sm mb-4 gap-1 hover:bg-none border border-gray-600 rounded-full"
                >
                  <TiArrowBack className='h-5 w-5' />
                  Back to Input
                </Button>

                <div className="mb-4 bg-surface-850 border border-gray-700 rounded-2xl p-4 shadow-lg">
                  <p className="text-sm leading-relaxed text-gray-200 break-words">
                    {capitalizeFirstLetter(emailDetails?.prompt || '')}
                  </p>
                </div>

                {limitReached ? (
                  <div className="flex flex-col bg-surface-850 border border-amber-500/30 rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 text-amber-300 mb-2">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">Revision limit reached</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      You&apos;ve used all {maxVersions ?? "available"} versions for this email. Upgrade for more revisions or start a new email.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateNewEmail}
                        className="flex-1 h-9 text-sm bg-surface-800 hover:bg-surface-700 text-gray-200 border border-gray-600"
                      >
                        New email
                      </Button>
                      <Button
                        onClick={() => setShowLimitModal(true)}
                        className="flex-1 h-9 text-sm bg-brand-700 hover:bg-brand-600 text-white"
                      >
                        Upgrade
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      if (listening) stopListening()
                      generateNewEmailIteration(e)
                    }}
                  >


                    <div className="flex flex-col bg-surface-850 border border-gray-700 rounded-2xl p-2 shadow-lg focus-within:border-gray-500 transition-colors">
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
                                disabled={isGenerating}
                                className={`absolute -top-1.5 -right-1.5 bg-gray-900/90 hover:bg-red-500 text-gray-300 hover:text-white rounded-full p-0.5 border border-gray-700 transition-colors shadow-sm ${isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
                            : "Generate more cold mail..."
                        }
                        value={newModification}
                        onChange={handleValueChange}
                        disabled={isGenerating}
                        className="w-full h-auto min-h-[80px] resize-none bg-transparent text-gray-200 text-sm px-2 pt-1 placeholder:text-gray-500 focus:outline-none custom-scroll disabled:opacity-60 disabled:cursor-not-allowed"
                        onPaste={handlePaste}
                      />
                      <div className="flex justify-between items-center gap-2 mt-2 px-2">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="image-upload-desktop"
                            className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${images.length >= 1 || isGenerating || listening ? 'bg-surface-800 text-gray-600 border border-gray-800 cursor-not-allowed' : 'bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-600 cursor-pointer'}`}
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
                              disabled={isGenerating || listening || images.length >= 1}
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
                            className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${listening ? "bg-red-500/90 hover:bg-red-500 text-white animate-pulse" : "bg-surface-700 hover:bg-surface-600 text-gray-300"}`}
                          >
                            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </button>
                          <button
                            type="submit"
                            disabled={isGenerateDisabled}
                            aria-label="Generate email"
                            className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-full transition-colors active:scale-95 ${isGenerateDisabled ? 'bg-brand-800 text-gray-400 cursor-not-allowed' : 'bg-brand-700 hover:bg-brand-600 text-white cursor-pointer'}`}
                          >
                            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Must live outside transform-gpu scroll parent so position:fixed sticks to the viewport */}
      {emailDetails && !fetchLoading && (
        <form
          onSubmit={(e) => {
            if (listening) stopListening()
            generateNewEmailIteration(e)
          }}
          style={{ bottom: keyboardOffset, paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          className="lg:hidden fixed inset-x-0 z-30 px-3 pt-3 bg-gradient-to-t from-surface-900 via-surface-900 to-transparent transition-[bottom] duration-10"
        >


          {limitReached ? (
            <div className="flex items-center justify-between gap-2 bg-surface-800 border border-amber-500/30 rounded-[26px] px-4 py-3">
              <div className="flex items-center gap-2 text-amber-300 text-sm">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Free version limit reached</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLimitModal(true)}
                className="shrink-0 text-xs font-medium bg-brand-700 text-white rounded-full px-3 py-1.5"
              >
                Upgrade
              </button>
            </div>
          ) : (
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
                          disabled={isGenerating}
                          className={`absolute -top-1.5 -right-1.5 bg-gray-900/90 hover:bg-red-500 text-gray-300 hover:text-white rounded-full p-0.5 border border-gray-700 transition-colors ${isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
                  placeholder={listening ? "Listening…" : "Generate more cold mail..."}
                  className="w-full flex-1 resize-none bg-transparent text-gray-200 text-base placeholder:text-gray-500 px-2 py-2 max-h-36 overflow-y-auto focus:outline-none custom-scroll disabled:opacity-60"
                  value={newModification}
                  onChange={handleValueChange}
                  disabled={isGenerating}
                  onPaste={handlePaste}
                />
                <div className="flex items-center gap-2 px-2 pb-2">
                  <label
                    htmlFor="image-upload-mobile"
                    className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-full transition-colors active:scale-95 ${images.length >= 1 || isGenerating || listening ? 'bg-surface-800 text-gray-600 border border-gray-800 cursor-not-allowed' : 'bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-600 cursor-pointer'}`}
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
                      disabled={isGenerating || listening || images.length >= 1}
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
                className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${listening ? "bg-red-500/90 hover:bg-red-500 text-white animate-pulse" : "bg-surface-700 hover:bg-surface-600 text-gray-300 border border-gray-600"}`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="submit"
                disabled={isGenerateDisabled}
                aria-label="Generate email"
                className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${isGenerateDisabled ? "bg-brand-800 text-gray-400" : "bg-brand-700 text-white"}`}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          )}
        </form>
      )}

      <IterationLimitModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onCreateNew={handleCreateNewEmail}
        onUpgrade={handleUpgrade}
        maxVersions={maxVersions ?? 2}
      />
    </div>
  )
}