import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDispatch } from "react-redux";
import { login } from "@/context/authSlice";
import { getErrorMessage, api } from "../utils";
import { queryKeys } from "./queryKeys";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

// GET /api/v1/payment/plans
export function usePaymentPlans() {
  return useQuery({
    queryKey: queryKeys.paymentPlans,
    queryFn: async () => {
      const response = await api.get("/api/v1/payment/plans");
      return response.data.data;
    },
  });
}

// GET /api/v1/payment/history
export function usePaymentHistory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.paymentHistory,
    queryFn: async () => {
      const response = await api.get("/api/v1/payment/history");
      return response.data.data;
    },
    enabled,
  });
}

export interface ProcessPaymentUserInfo {
  username?: string;
  email?: string;
  phone?: string;
  userId?: string;
}

export const usePayment = () => {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.getElementById("razorpay-script");
      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(true),
          { once: true }
        );
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Razorpay SDK.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
      document.body.appendChild(script);
    });
  }, []);

  const createOrderMutation = useMutation({
    mutationFn: async (planType: string) => {
      const response = await api.post("/api/v1/payment/create-order", { planType });
      return response.data.data;
    },
    onError: (err) => {
      const errorMessage = getErrorMessage(err, "Failed to create order");
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive", duration: 5000 });
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await api.post("/api/v1/payment/verify-payment", paymentData);
      return response.data.data;
    },
    onSuccess: (data) => {
      setSuccess(true);
      toast({ title: "Payment Successful", description: "Your payment has been verified successfully." });
      if (data?.user) {
        dispatch(login(data.user));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentHistory });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
    },
    onError: (err) => {
      const errorMessage = getErrorMessage(err, "Payment verification failed");
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive", duration: 5000 });
    },
  });

  const failureMutation = useMutation({
    mutationFn: async ({ error: failureError, orderId }: { error: string; orderId?: string }) => {
      await api.post("/api/v1/payment/failure", { error: failureError, orderId });
    },
    onSuccess: (_data, variables) => {
      toast({ title: "Payment Failed", description: variables.error, variant: "destructive", duration: 5000 });
    },
    onError: (err) => {
      console.error("Failed to log payment failure:", err);
    },
  });

  const logPaymentFailure = useCallback(
    (failureError: string, orderId?: string) =>
      failureMutation.mutateAsync({ error: failureError, orderId }).catch(() => {}),
    [failureMutation]
  );

  const processPayment = useCallback(async (planType: string, userInfo: ProcessPaymentUserInfo = {}) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay SDK.");
      }

      const orderData = await createOrderMutation.mutateAsync(planType);

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ColdmailerAi",
        description: `Payment for ${orderData.planName}`,
        image: "/white-logo.png",
        order_id: orderData.orderId,
        prefill: {
          name: userInfo.username || orderData.username || "",
          email: userInfo.email || orderData.userEmail || "",
          contact: userInfo.phone || orderData.contact || "",
        },
        notes: {
          planType: orderData.planType,
          userId: userInfo.userId || "",
        },
        theme: {
          color: "#232326",
        },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled by user");
            toast({ title: "Payment Cancelled", description: "You cancelled the payment.", variant: "destructive", duration: 5000 });
            setLoading(false);
          },
        },
        handler: async (response: any) => {
          try {
            setLoading(true);
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planType: orderData.planType,
            };

            const verificationResult = await verifyPaymentMutation.mutateAsync(verificationData);
            setLoading(false);
            return verificationResult;
          } catch (verificationError: any) {
            console.error("Payment verification failed:", verificationError);
            setLoading(false);
            await logPaymentFailure(verificationError.message, orderData.orderId);
            throw verificationError;
          }
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", async (response: any) => {
        const errorMessage = response.error?.description || "Payment failed";
        setError(errorMessage);
        toast({ title: "Payment Failed", description: errorMessage, variant: "destructive", duration: 5000 });
        setLoading(false);
        await logPaymentFailure(errorMessage, orderData.orderId);
      });

      razorpay.open();
      setLoading(false);

    } catch (err: any) {
      console.error("Payment process error:", err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive", duration: 5000 });
      setLoading(false);
      throw err;
    }
  }, [toast, createOrderMutation, verifyPaymentMutation, logPaymentFailure, loadRazorpayScript]);

  const resetPaymentState = useCallback(() => {
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    success,
    processPayment,
    resetPaymentState,
  };
};
