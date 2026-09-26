import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useContactMutation } from "../hooks/useAuth";

export default function Contact() {
  const { toast } = useToast();
  const showErrorToast = useErrorToast();
  const { mutate: sendContact, isPending: loading } = useContactMutation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const email = formData.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    sendContact(
      {
        name: formData.name.trim(),
        email,
        message: formData.message.trim(),
        source: "contact",
      },
      {
        onSuccess: (res: any) => {
          if (res.status === 200) {
            toast({
              title: "Message submitted",
              description:
                "Thanks for reaching out — we received your message and will reply soon.",
            });
            setFormData({ email: "", name: "", message: "" });
            return;
          }

          toast({
            title: "Could not submit message",
            description: res.data?.message || "Please try again.",
            variant: "destructive",
          });
        },
        onError: (error: any) => {
          showErrorToast(error, {
            title: "Could not submit message",
            fallback: "An unexpected error occurred. Please try again later.",
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 p-8 relative">
      <div className="absolute top-1/3 -rotate-12 w-full h-24 bg-brand opacity-30 blur-3xl"></div>

      {/* Left side - Text content */}
      <div className="lg:w-1/2 space-y-6 sm:space-y-8">
        <h1 className="text-2xl md:text-5xl font-bold leading-tight text-white">
          Ask whatever you have in your mind
        </h1>
        <p className="text-gray-400 text-base md:text-lg">
          Whether you have questions or want to boost your outreach, we&apos;re here to help. Let&apos;s connect today.
        </p>

        <div className="space-y-2 md:pt-8">
          <p className="text-gray-400">krushnasakhare965@gmail.com</p>
          <p className="text-gray-400">7385664978</p>
          <p className="text-gray-400">Nagpur India, Maharashtra</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="lg:w-1/2 z-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-gray-200 block text-sm font-medium">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Jane Smith"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-gray-200 block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="jane@smith@gmail.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-gray-200 block text-sm font-medium">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Hi, I am reaching out for..."
              value={formData.message}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-700 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !formData.name.trim() ||
              !formData.email.trim() ||
              !formData.message.trim()
            }
            className="w-full py-2 md:py-3 md:px-4 bg-brand-700 hover:bg-brand-800 text-white font-medium rounded-md transition-colors"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
