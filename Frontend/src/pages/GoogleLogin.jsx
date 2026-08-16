import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useErrorToast } from "@/hooks/useErrorToast"
import { GoogleLogin } from '@react-oauth/google';
import { useGoogleLogin } from "../hooks/useAuth"

const Googlelogin = () => {

  const { toast } = useToast()
  const showErrorToast = useErrorToast()
  const navigate = useNavigate()
  const { mutate: googleLogin } = useGoogleLogin()

  const handleLoginSuccess = (credentialResponse) => {
    googleLogin(credentialResponse.credential, {
      onSuccess: (data) => {
        if (data?.success) {
          toast({
            title: "Login Successful!",
            description: "You've successfully logged in with Google!",
          });

          setTimeout(() => {
            navigate("/dashboard");
          }, 1300);
        }
      },
      onError: (error) => {
        console.error("Google Login Error:", error);
        showErrorToast(error, { title: "Google Login Failed", fallback: "Failed to login with Google" });
      },
    });
  };

  return (
    <GoogleLogin
      theme="filled_black"
      shape="circle"
      logo_alignment="center"
      onSuccess={handleLoginSuccess}
      onError={() => toast.error("Login Failed")}
    />
  )
}

export default Googlelogin