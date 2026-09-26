import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmailInput } from './EmailInput';
import { EmailOutput } from './EmailOutput';
import { useToast } from "../../hooks/use-toast";
import { useSelector } from 'react-redux';
import { ensureAuthenticated, useLogout } from '../../helpers/tokenValidation';
import { useErrorToast } from '../../hooks/useErrorToast';
import { useGenerateEmail } from '../../hooks/useEmail';
import { getToken } from '../../utils';
import { RootState } from '../../context/store';

export interface EmailGeneratorProps {
  emailGenerated: (generated: boolean) => void;
}

export function EmailGenerator({ emailGenerated }: EmailGeneratorProps) {
    const [prompt, setPrompt] = useState("");
    const [generatedEmail, setGeneratedEmail] = useState("");
    const [bottomPrompt, setBottomPrompt] = useState("");
    const [showOutput, setShowOutput] = useState(false);
    const [error, setError] = useState<any>(null);
    const [images, setImages] = useState<File[]>([]);
    const { toast } = useToast();
    const navigate = useNavigate();
    const token = getToken();
    const logoutUser = useLogout();
    const showErrorToast = useErrorToast();
    const user = useSelector((state: RootState) => state.auth.userData);
    const userId = user?._id;

    const { mutate: generate, isPending: loading } = useGenerateEmail();

    const generateEmail = (e: React.FormEvent, imageFiles?: File[]) => {
      e.preventDefault();
      setShowOutput(true);
      setError(null);
      emailGenerated(true);

      if (!ensureAuthenticated(token, logoutUser)) return;

      generate(
        { prompt, userId, images: imageFiles || images },
        {
          onSuccess: (data: any) => {
            setGeneratedEmail(data.fullEmail);

            toast({
              title: "Success",
              description: "Email generated successfully!",
              variant: "success",
            });

            navigate(`/email/${data.emailId}`, {
              state: {
                email: {
                  _id: data.emailId,
                  prompt: prompt,
                  generatedEmail: data.fullEmail,
                  chatEmails: [],
                  createdAt: new Date().toISOString()
                }
              }
            });
          },
          onError: (err: any) => {
            if (err.response?.status === 401) {
              logoutUser("Session expired. Please log in again.");
              return;
            }
            setError(showErrorToast(err));
          },
        }
      );
    };


  return (
    <div className="w-full">
      <div className="w-full max-w-[1400px] mx-auto relative z-10 flex-1 px-4 py-6 sm:pb-10">
        {!showOutput && (
          <div className="w-full flex items-center justify-center sm:min-h-[calc(100vh-260px)]">
            <EmailInput
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={generateEmail}
              images={images}
              setImages={setImages}
            />
          </div>
        )}

        {showOutput && (
          <div className="w-full h-full pb-8 z-10 overflow-y-auto custom-scroll">
            <EmailOutput
              prompt={prompt}
              generatedEmail={generatedEmail}
              bottomPrompt={bottomPrompt}
              setBottomPrompt={setBottomPrompt}
              onUpdate={() => {}}
              loading={loading}
              updating={false}
              error={error}
              images={images}
              setImages={setImages}
              onBack={() => {
                setShowOutput(false);
                setGeneratedEmail("");
                setError(null);
                emailGenerated(false);
                setPrompt("");
                setImages([]);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
