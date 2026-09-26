import { useCallback, useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useToast } from "./use-toast";

function isSecureMicContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export interface UseVoiceInputOptions {
  language?: string;
  continuous?: boolean;
}

export function useVoiceInput(
  value: string,
  setValue: (val: string) => void,
  options: UseVoiceInputOptions = {}
) {
  const { language = "en-US", continuous } = options;
  const baseValueRef = useRef("");
  const valueRef = useRef(value);
  const wantListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobileRef = useRef<boolean | null>(null);
  if (isMobileRef.current === null) isMobileRef.current = isMobileBrowser();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const { toast } = useToast();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // Mobile: never use continuous / restarts (each restart = OS mic chime).
  const useContinuous =
    continuous ??
    (isMobileRef.current ? false : Boolean(browserSupportsContinuousListening));

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!isSessionActive && !listening) return;

    const base = baseValueRef.current;
    const spoken = transcript.trim();

    if (!spoken) {
      setValue(base.trimEnd());
      return;
    }

    const separator = base && !/\s$/.test(base) ? " " : "";
    setValue(`${base}${separator}${spoken}`.replace(/\s+/g, " ").trim());
  }, [isSessionActive, listening, transcript, setValue]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(async () => {
    await SpeechRecognition.startListening({
      continuous: useContinuous,
      language,
    });
  }, [language, useContinuous]);

  const endSession = useCallback(() => {
    wantListeningRef.current = false;
    setIsSessionActive(false);
    clearRestartTimer();
    SpeechRecognition.stopListening();
  }, [clearRestartTimer]);

  // Mobile: browser ends after ~1–2s silence — leave it; no restart (avoids chimes).
  useEffect(() => {
    if (!isMobileRef.current) return;
    if (!isSessionActive || listening) return;
    wantListeningRef.current = false;
    setIsSessionActive(false);
  }, [listening, isSessionActive]);

  // Desktop only: auto-restart when continuous isn't supported.
  useEffect(() => {
    if (isMobileRef.current) return;
    if (listening || !wantListeningRef.current) return;

    clearRestartTimer();
    restartTimerRef.current = setTimeout(async () => {
      if (!wantListeningRef.current || isMobileRef.current) return;

      const current = valueRef.current.trim();
      baseValueRef.current = current ? `${current} ` : "";
      resetTranscript();

      try {
        await startRecognition();
      } catch {
        endSession();
      }
    }, 180);

    return clearRestartTimer;
  }, [listening, clearRestartTimer, resetTranscript, startRecognition, endSession]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearRestartTimer();
      SpeechRecognition.stopListening();
    };
  }, [clearRestartTimer]);

  const handleMicClick = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault?.();

      if (!browserSupportsSpeechRecognition) {
        toast({
          title: "Microphone",
          description: isMobileRef.current
            ? "Speech recognition isn't supported in this mobile browser. Try Chrome on Android, or Safari on iOS."
            : "Speech recognition isn't supported in this browser. Try Chrome or Edge.",
          variant: "destructive",
        });
        return;
      }

      if (!isSecureMicContext()) {
        toast({
          title: "Microphone",
          description:
            "Voice input needs HTTPS. Open the site over https:// (or use a tunnel like ngrok for local testing).",
          variant: "destructive",
        });
        return;
      }

      if (isMicrophoneAvailable === false) {
        toast({
          title: "Microphone",
          description:
            "Microphone access is blocked. Allow mic permission for this site in your browser settings, then try again.",
          variant: "destructive",
        });
        return;
      }

      if (listening || isSessionActive) {
        endSession();
        return;
      }

      baseValueRef.current = value.trim() ? `${value.trim()} ` : "";
      resetTranscript();
      wantListeningRef.current = true;
      setIsSessionActive(true);

      try {
        await startRecognition();
      } catch {
        endSession();
        toast({
          title: "Microphone",
          description:
            "Could not start the microphone. Check permissions and try Chrome or Safari.",
          variant: "destructive",
        });
      }
    },
    [
      browserSupportsSpeechRecognition,
      endSession,
      isMicrophoneAvailable,
      isSessionActive,
      listening,
      resetTranscript,
      startRecognition,
      toast,
      value,
    ]
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (listening || isSessionActive) endSession();
      setValue(e.target.value);
    },
    [endSession, isSessionActive, listening, setValue]
  );

  return {
    listening: isSessionActive || listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    handleMicClick,
    stopListening: endSession,
    handleValueChange,
  };
}
