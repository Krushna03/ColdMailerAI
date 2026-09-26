import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { ensureAuthenticated, useLogout } from "../helpers/tokenValidation";
import { useNavigate } from "react-router-dom";
import { usePayment } from "../hooks/usePayment";
import { useSelector } from "react-redux";
import { plans } from "../data/pricingData";
import { getToken } from "../utils";
import EnterpriseContactDialog from "../components/payment/EnterpriseContactDialog";

export default function PricingSection() {
  const userData = useSelector((state: any) => state.auth.userData);
  const navigate = useNavigate();
  const logoutUser = useLogout();
  const {
    processPayment,
    resetPaymentState,
  } = usePayment();
  const [showEnterpriseContact, setShowEnterpriseContact] = useState(false);

  const token = getToken();

  const handleNavigation = async (planId: string) => {
    const selectedPlan = plans.find((plan) => plan.id === planId);

    if (selectedPlan?.isCustom) {
      setShowEnterpriseContact(true);
      return;
    }

    if (!ensureAuthenticated(token, logoutUser, {
      missingMessage: "Please Login First",
      expiredMessage: "Session expired. Please Login Again.",
    })) return;

    if (token) {
      if (planId === "GETSTARTED") {
        navigate("/dashboard");
      } else {
        try {
          resetPaymentState();
          await processPayment(planId, {
            username: userData?.username,
            email: userData?.email,
            userId: userData?._id,
          });
        } catch (error) {
          console.error("Payment failed:", error);
        }
      }
    } else {
      navigate("/");
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto py-12 md:py-16 px-4 md:px-0 font-sans">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <div className="max-w-24 flex justify-center bg-surface-800 mx-auto rounded-full px-4 py-2 mb-8">
          <span className="text-sm sm:text-base font-normal text-gray-200">Pricing</span>
        </div>

        <h2 className="text-2xl md:text-5xl text-center text-white font-bold mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-gray-300 px-2 md:px-0 max-w-2xl text-center mx-auto mb-8 md:mb-12">
          Start free and scale as you grow. All plans include core AI-powered email generation features.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-3 max-w-6xl mx-auto p-5 md:p-0">
        {plans.map((plan, index) => (
          <Card
            key={index}
            className={`relative bg-surface-900 border-white/10 rounded-2xl p-2 md:p-4 shadow-none ${
              plan.popular ? "ring-1 ring-brand border-brand" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
                <span className="bg-brand text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-md">
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader className="text-center pb-5 pt-6">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#28252ee7] rounded-lg flex items-center justify-center">
                  <plan.icon className="h-6 w-6 text-brand" />
                </div>
              </div>
              <CardTitle className="text-lg md:text-xl font-bold text-white mb-2">{plan.name}</CardTitle>
              <div className="mb-2 flex items-baseline justify-center">
                <span className="text-2xl md:text-3xl font-bold text-white font-mono">{plan.price}</span>
                {plan.price !== "Free" && plan.price !== "Custom" && (
                  <span className="text-sm md:text-sm text-gray-300 ml-1 font-sans">/{plan.period}</span>
                )}
                {(plan.price === "Free" || plan.price === "Custom") && (
                  <span className="text-sm md:text-sm text-gray-300 ml-1 font-sans">{plan.period}</span>
                )}
              </div>
              <CardDescription className="text-sm md:text-sm text-gray-300">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-gray-300">
                    <Check className="h-4 w-4 text-brand mr-2.5 flex-shrink-0" />
                    <span className="text-sm md:text-base">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full py-2.5 md:py-3 h-auto text-sm md:text-base font-semibold rounded-lg shadow-none ${
                  plan.buttonVariant === "default"
                    ? "bg-brand hover:bg-brand-600 text-white"
                    : "bg-surface-950 border border-white/10 text-gray-200 hover:bg-white/10 hover:text-white"
                }`}
                variant={plan.buttonVariant as any}
                onClick={() => handleNavigation(plan.id)}
              >
                {plan.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <EnterpriseContactDialog
        open={showEnterpriseContact}
        onOpenChange={setShowEnterpriseContact}
        defaultName={userData?.username || ""}
        defaultEmail={userData?.email || ""}
      />
    </section>
  );
}
