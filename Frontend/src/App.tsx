import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import Protected from "./components/auth/Protected";
import PageLoader from "./loaders/PageLoader";
import { Toaster } from "./components/ui/toaster";

const LandingPage = lazy(() => import("./landing/Landing"));
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./components/common/NotFound"));
const GenerateEmail = lazy(() => import("./pages/GenerateEmail"));
const EmailOutputPage = lazy(() => import("./pages/EmailOutputPage"));
const EmailHistory = lazy(() => import("./pages/EmailHistory"));
const PaymentComponent = lazy(() => import("./components/payment/Payment"));
const Community = lazy(() => import("./pages/Community"));
const Leads = lazy(() => import("./pages/Leads"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const BatchHistory = lazy(() => import("./pages/BatchHistory"));
const Mailboxes = lazy(() => import("./pages/Mailboxes"));
const Sequences = lazy(() => import("./pages/Sequences"));
const SequenceDetail = lazy(() => import("./pages/SequenceDetail"));
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

export default function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: withSuspense(<LandingPage />),
    },
    {
      path: "/sign-in",
      element: withSuspense(<LoginPage />),
    },
    {
      path: "/sign-up",
      element: withSuspense(<RegisterPage />),
    },
    {
      path: "/community",
      element: withSuspense(<Community />),
    },
    {
      path: "*",
      element: withSuspense(<NotFound />),
    },
    {
      path: "/generate-email",
      element: (
        <Protected>
          {withSuspense(<GenerateEmail />)}
        </Protected>
      ),
    },
    {
      path: "/dashboard",
      element: (
        <Protected>
          {withSuspense(<DashboardLayout />)}
        </Protected>
      ),
      children: [
        {
          index: true,
          element: withSuspense(<Dashboard />),
        },
        {
          path: "leads",
          element: withSuspense(<Leads />),
        },
        {
          path: "leads/:leadId",
          element: withSuspense(<LeadDetail />),
        },
        {
          path: "pricing",
          element: withSuspense(<PaymentComponent />),
        },
        {
          path: "profile",
          element: withSuspense(<Profile />),
        },
        {
          path: "batches",
          element: withSuspense(<BatchHistory />),
        },
        {
          path: "mailboxes",
          element: withSuspense(<Mailboxes />),
        },
        {
          path: "sequences",
          element: withSuspense(<Sequences />),
        },
        {
          path: "sequences/:sequenceId",
          element: withSuspense(<SequenceDetail />),
        },
      ],
    },
    {
      path: "/leads",
      element: <Navigate to="/dashboard/leads" replace />,
    },
    {
      path: "/payment",
      element: <Navigate to="/dashboard/pricing" replace />,
    },
    {
      path: "/email/:id",
      element: (
        <Protected>
          {withSuspense(<EmailOutputPage />)}
        </Protected>
      ),
    },
    {
      path: "/email/history/:id",
      element: (
        <Protected>
          {withSuspense(<EmailHistory />)}
        </Protected>
      ),
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
