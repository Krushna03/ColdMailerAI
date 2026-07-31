import React, { useEffect, useState } from 'react'
import { NavLink, Navigate } from "react-router-dom"
import { Link as ScrollLink, Element } from "react-scroll"
import Faq from './Faq';
import Contact from './Contact';
import Footer from './Footer';
import CallToAction from './CallToAction';
import {MovingDots} from "../components/MovingDots"
import { RiMailSendFill, RiMoneyDollarCircleLine } from "react-icons/ri";
import { User } from 'lucide-react';
import PricingSection from './Pricing';
import MarqueeTestimonials from "./Testimonials"
import { navigationLinks, features } from "../data/landingData"
import { fetchToken, isTokenExpired } from '../helpers/tokenValidation';
import { useUserCount } from '../hooks/useUser';
import Seo from '../components/Seo';

const LandingPage = () => {

  const [showMidHeader, setShowMidHeader] = useState(false)

  const tokenFetched = fetchToken()
  const token = isTokenExpired(tokenFetched);

  const { data: userCount } = useUserCount()

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined") return
      const featureSection = document.getElementById('features')
      if (!featureSection) return
      const triggerPoint = featureSection.offsetTop - 120
      setShowMidHeader(window.scrollY >= triggerPoint)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!token) {
    return <Navigate to="/generate-email" replace />
  }

  return (
    <>
      <Seo
        title="AI Cold Email Generator"
        description="Transform your outreach with AI-powered cold emails. Generate personalized, engaging emails that boost engagement and conversions."
        path="/"
      />
      {/* Navbar & hero  */}
      <Element name='home' id='home' className="min-h-screen bg-black text-white relative overflow-hidden">
        
        <div className='hidden sm:block'>
          <MovingDots />
        </div>

        <div className={`fixed inset-x-0 top-4 z-50 flex justify-center transition-all duration-300 ${showMidHeader ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'}`}>
          <div className="hidden lg:flex items-center gap-6 rounded-2xl bg-gradient-to-r from-surface-700 to-surface-700 px-4 py-2 shadow-2xl border border-white/10 backdrop-blur-2xl">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src="/white-logo.png" alt="logo" className="h-8 w-8 p-1 rounded cursor-pointer" />
            </div>
            
            <div className="flex items-center gap-6">
              <NavLink
                to="/community"
                className="text-sm text-gray-200 transition-colors hover:text-brand-300"
              >
                Community
              </NavLink>
              {
                navigationLinks.map((item) => (
                  <ScrollLink
                    key={`mid-${item.target}`}
                    to={item.target}
                    smooth={true}
                    duration={550}
                    offset={item.offset}
                    spy={true}
                    className="cursor-pointer text-sm text-gray-200 hover:text-brand-300 transition-colors"
                    activeStyle={{ color: "var(--brand-300)", fontWeight: "bold" }}
                  >
                    {item.label}
                  </ScrollLink>
                ))
              }
            </div>
            <NavLink
              to="/generate-email"
              className="bg-brand hover:bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-all cursor-pointer"
            >
              Generate Email
            </NavLink>
          </div>
        </div>

        <div className="absolute top-10 -left-14 w-1/2 h-72 bg-brand opacity-30 blur-3xl"></div>
        <div className="absolute bottom-10 -right-0 w-1/2 h-64 bg-brand opacity-30 blur-3xl"></div>

        {/* Navigation */}
        <header className="relative z-10 flex items-center justify-between px-4 py-6 md:py-5 md:px-16 lg:gap-20">
          <div className="flex items-center cursor-pointer">
            <img src="/white-logo.png" alt="logo" className="h-8 w-8 md:h-10 md:w-10 p-1 rounded" />
              <span className="font-medium text-gray-100 text-xl md:text-2xl">
                𝐂𝐨𝐥𝐝𝐌𝐚𝐢𝐥𝐞𝐫𝐀𝐈
              </span>
          </div>

          <nav className="hidden lg:flex items-center gap-7 bg-[rgba(63,62,62,0.3)] px-5 lg:mt-1 py-3 rounded-2xl lg:ml-14">
            <NavLink
              to="/community"
              className="cursor-pointer transition-colors hover:text-brand-300"
            >
              Community
            </NavLink>
            {
              navigationLinks.map((item) => (
                <ScrollLink
                  key={item.target}
                  to={item.target}
                  smooth={true}
                  duration={600}
                  offset={item.offset}
                  spy={true}
                  className="cursor-pointer hover:text-brand-300 transition-colors"
                  activeClass="text-brand-300 font-semibold"
                >
                  {item.label}
                </ScrollLink>
              ))
            }
          </nav>

          <div className='flex gap-3 items-center'>
            <div className='hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white font-medium text-sm shadow-md'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
              <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500'></span>
              </span>
              {userCount ? userCount : "300+" }
              <User className='h-4 w-4 text-white' />
            </div>
            <NavLink
              to="/generate-email"
              className="bg-brand hover:bg-brand-600 text-white px-2 md:px-4 py-2 md:py-2 rounded-lg transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-base"
            >
            <RiMailSendFill className='h-4 w-4' /> Generate Email
            </NavLink>
          </div>
        </header>

        {/* Hero Section */}
        <main className="relative z-10 flex flex-col items-center justify-center px-6 text-center mt-20 md:mt-28">
          <div className="inline-flex items-center bg-brand-900 shadow-2xl rounded-full px-4 md:px-7 py-2 mb-5 sm:mb-4 gap-2">
            <img src="/white-logo.png" alt="logo" className="h-6 w-6 md:h-7 md:w-7 p-1 rounded" />
            <span className="text-sm md:text-base">ColdMailerAI - AI Powered Email Generator</span>
          </div>

          <h1 className="text-2xl md:text-6xl lg:text-7xl font-bold max-w-6xl leading-tight sm:leading-relaxed mb-6">
            Transforming Outreach with AI Powered Cold Emails
          </h1>

          <p className="text-base md:text-xl text-gray-300 max-w-[580px] mb-12">
            Enhance outreach with AI-driven, scalable cold email generation, designed to boost engagement and conversions.        
          </p>

          <div className="flex gap-4 sm:gap-5 mb-20 md:mb-24">
            <NavLink
              to={!token ? "/generate-email" : "/sign-in"}
              className="bg-brand-700 hover:bg-brand-800 text-white px-8 md:px-10 py-3 rounded-lg transition-colors font-medium"
            >
              {!token ? "Create New Email" : "Get Started"}
            </NavLink>
            <NavLink
              to="/sign-up"
              className="flex items-center gap-1 border border-gray-600 hover:border-gray-400 text-white px-8 md:px-10 py-3 rounded-lg transition-colors"
            >
              It's Free <RiMoneyDollarCircleLine className='h-5 w-5'/>
            </NavLink>
          </div>

          {/* Client Logos */}
          <div className="flex flex-wrap justify-center gap-10 md:gap-24 mb-16">
            <div className="flex items-center text-gray-400">
              <div className="w-3 h-3 md:w-5 md:h-5 mr-2 opacity-50">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <span className="text-sm sm:text-base font-semibold">Sales cold mail</span>
            </div>

            <div className="flex items-center text-gray-400">
              <div className="w-3 h-3 md:w-5 md:h-5 mr-2 opacity-50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                </svg>
              </div>
              <span className="text-sm sm:text-base font-semibold">Job cold mail</span>
            </div>

            <div className="flex items-center text-gray-400">
              <div className="w-3 h-3 md:w-5 md:h-5 mr-2 opacity-50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="12" r="4" />
                  <circle cx="16" cy="12" r="4" />
                </svg>
              </div>
              <span className="text-sm sm:text-base font-semibold">Marketing mail</span>
            </div>
          </div>
        </main>
      </Element>

      {/* Feature */}
      <Element name='features' id='features' className='min-h-screen bg-black relative overflow-hidden'>
        <section className="w-full max-w-7xl mx-auto py-10">
          <div className="max-w-24 flex justify-center bg-surface-800 mx-auto rounded-full px-4 py-2 mb-8">
            <span className="text-sm sm:text-base font-normal text-gray-200">Features</span>
          </div>

          <h2 className="text-2xl md:text-5xl text-center text-white font-bold mb-4">Why ColdMailerAI ?</h2>
          <p className="text-lg text-gray-300 px-2 md:px-0 max-w-2xl text-center mx-auto mb-8 md:mb-12">
            Discover the key benefits of our AI-powered cold email platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-5 md:p-0">
            {
              features.map((feature, index) => (
                <div key={index} className="bg-gradient-to-br from-surface-700 p-6 rounded-[28px]">
                  <div className="w-7 h-7 md:w-10 md:h-10 bg-[#28252ee7] rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.iconPath} />
                    </svg>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 text-gray-200">{feature.title}</h3>
                  <p className="text-sm md:text-base text-gray-300">{feature.description}</p>
                </div>
              ))
            }
          </div>
        </section>
      </Element>

      <Element name='pricing' id='pricing' className='min-h-screen bg-black relative overflow-hidden'>
        <PricingSection />
      </Element>

      <div name='testimonials' id='testimonials' className="py-20 bg-black relative z-10">
        <MarqueeTestimonials />
      </div>

      {/* Faqs */}
      <Element name='faqs' id='faqs' className='z-10 min-h-screen bg-black relative overflow-hidden'>
        <section className="w-full max-w-5xl mx-auto py-10 px-2 md:px-0">
          <div className="max-w-24 flex justify-center bg-surface-800 mx-auto rounded-full px-4 py-2 mb-8">
            <span className="text-sm sm:text-base font-normal text-gray-200">FAQs</span>
          </div>

          <h2 className="text-2xl md:text-5xl text-center text-white font-bold mb-4">We're here to help</h2>
          <p className="text-lg text-gray-300 max-w-2xl text-center mx-auto mb-16">
            FAQs designed to provide the information you need.
          </p>
          <Faq />
        </section>
      </Element>
      
      {/* Contact */}
      <Element name='contact' id='contact' className='z-10 min-h-screen bg-black relative overflow-hidden'>
        <section className="w-full max-w-7xl mx-auto py-10">
          <div className="max-w-24 flex justify-center bg-surface-800 mx-auto rounded-full px-4 py-2 mb-2 md:mb-8">
            <span className="text-sm sm:text-base font-normal text-gray-200">Contacts</span>
          </div>
          <Contact />
        </section>
      </Element>

      <CallToAction />

      <Footer />
    </>
  )
}

export default LandingPage
