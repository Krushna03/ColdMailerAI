import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "../components/ui/input";
import { MovingDots } from "@/components/common/MovingDots";
import { useForm, SubmitHandler } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { NavLink, useNavigate } from "react-router-dom";
import { Toaster } from "../components/ui/toaster";
import Googlelogin from "./GoogleLogin";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useRegister } from "../hooks/useAuth";
import Seo from "../components/common/Seo";

interface RegisterFormInputs {
  username: string;
  email: string;
  password?: string;
}

export default function RegisterPage() {
  const { toast } = useToast();
  const showErrorToast = useErrorToast();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormInputs>();
  const navigate = useNavigate();
  const { mutate: registerUser, isPending: loading } = useRegister();

  const onSubmit: SubmitHandler<RegisterFormInputs> = (data) => {
    registerUser(
      {
        ...data,
        email: data.email.trim().toLowerCase(),
      },
      {
        onSuccess: () => {
          toast({
            title: "Registration Successful!",
            description: "User Registered successfully!",
          });

          setTimeout(() => {
            navigate("/dashboard");
          }, 1300);

          reset();
        },
        onError: (error) => {
          console.error("Error in signup", error);
          showErrorToast(error, {
            fallback: "An unexpected error occurred. Please try again later.",
          });
          reset();
        },
      }
    );
  };

  return (
    <div className="h-screen overflow-y-hidden flex flex-col bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(121,120,240,0.2),rgba(255,255,255,0))]">
      <Seo
        title="Sign Up"
        description="Create a free ColdMailerAI account and start generating AI-powered cold emails."
        path="/sign-up"
      />
      <div className="relative flex min-h-screen flex-col items-center sm:justify-center overflow-hidden mt-10 sm:mt-0 px-3">
        <MovingDots />

        <div className="relative z-10 w-full max-w-md rounded-3xl bg-zinc-900/80 px-8 py-8 backdrop-blur-sm">
          <NavLink to="/">
            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full">
                <img src="/white-logo.png" alt="login-logo" height={40} width={40} />
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white">ColdMailerAI</h1>
            </div>
          </NavLink>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Username
              </label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Jane Smith"
                className="h-12 bg-zinc-800/70 border-zinc-700 text-white placeholder:text-zinc-500"
                {...register("username", {
                  minLength: {
                    value: 2,
                    message: "Username must be at least 2 characters",
                  },
                  required: "Username is required",
                })}
              />
              {errors.username && (
                <p role="alert" className="text-red-500 text-sm mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 bg-zinc-800/70 border-zinc-700 text-white placeholder:text-zinc-500"
                {...register("email", {
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Enter a valid email address",
                  },
                  required: "Email is required",
                })}
              />
              {errors.email && (
                <p role="alert" className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className="h-12 bg-zinc-800/70 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
                  {...register("password", {
                    pattern: {
                      value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{5,}$/,
                      message: "Weak password, make it strong",
                    },
                    required: "Password is required",
                  })}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-zinc-800 text-white hover:bg-zinc-700"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign up"}
            </Button>
          </form>

          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <h1 className="text-gray-300">Or continue with Google</h1>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <div className="w-full flex flex-col items-center mt-6">
            <Googlelogin />
            <h1 className="text-center text-gray-300 mt-5">
              Already have an account?
              <NavLink to="/sign-in">
                <span className="text-blue-500 ml-2">Signin</span>
              </NavLink>
            </h1>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
