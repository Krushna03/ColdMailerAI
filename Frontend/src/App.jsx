import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Protected from './components/Protected'
import PageLoader from './loaders/PageLoader'

const LandingPage = lazy(() => import('./landing/Landing'))
const LoginPage = lazy(() => import('./pages/Login'))
const RegisterPage = lazy(() => import('./pages/Register'))
const NotFound = lazy(() => import('./components/NotFound'))
const GenerateEmail = lazy(() => import('./pages/GenerateEmail'))
const EmailOutputPage = lazy(() => import('./pages/EmailOutputPage'))
const EmailHistory = lazy(() => import('./pages/EmailHistory'))
const PaymentComponent = lazy(() => import('./components/Payment'))
const Community = lazy(() => import('./pages/Community'))

const withSuspense = (element) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
)

function App() {

  const router = createBrowserRouter([
    {
      path: "/",
      element: withSuspense(<LandingPage />)
    },
    {
      path: "/sign-in",
      element: withSuspense(<LoginPage />)
    },
    {
      path: "/sign-up",
      element: withSuspense(<RegisterPage />)
    },
    {
      path: "/community",
      element: withSuspense(<Community />)
    },
    {
      path: "*",
      element: withSuspense(<NotFound />)
    },
    {
      path: "/generate-email",
      element: (
        <Protected>
            {withSuspense(<GenerateEmail />)}
        </Protected>
      ) 
    },
    {
      path: "/email/:id",
      element: (
        <Protected>
            {withSuspense(<EmailOutputPage />)}
        </Protected>
      ) 
    },
    {
      path: "/email/history/:id",
      element: (
        <Protected>
            {withSuspense(<EmailHistory />)}
        </Protected>
      ) 
    },
    {
      path: "/payment",
      element: (
        <Protected>
          {withSuspense(<PaymentComponent />)}
        </Protected>
      ) 
    },
  ]) 

  return <RouterProvider router={router} />
}

export default App
