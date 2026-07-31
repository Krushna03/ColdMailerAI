import { NavLink } from "react-router-dom"
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Github } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-black text-white pt-16 pb-5 sm:pb-8 relative overflow-hidden">

      <div className="absolute top-1/3 -rotate-12 w-full h-20 bg-brand opacity-30 blur-3xl"></div>

      <div className="container mx-auto px-4 md:px-2 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-10 md:mb-0 max-w-md">
            <div className="flex items-center mb-4">
              {/* Logo */}
              <div className="mr-3">
                <img src="white-logo.png" alt="logo" className="h-9 w-9 sm:h-11 sm:w-11 p-1 rounded"/>
              </div>
              <span className="text-2xl font-bold">ColdMailerAI</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted partner in AI solutions, creating smarter systems for smarter businesses.
            </p>

            {/* Social icons */}
            <div className="flex space-x-3 mt-8">
              <a
                href="https://www.linkedin.com/in/krushna-sakhare/" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-zinc-300 rounded-md flex items-center justify-center hover:bg-zinc-400 transition-colors"
              >
                <Linkedin size={18} className="text-brand-600 " />
                <span className="sr-only">LinkedIn</span>
              </a>
              <a
                href="https://github.com/Krushna03/ColdMailer.Ai"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-zinc-300 rounded-md flex items-center justify-center hover:bg-zinc-400 transition-colors"
              >
                <Github size={18} className="text-brand-600" />
                <span className="sr-only">Github</span>
              </a>
              <a
                href="https://x.com/sakhare_kr9294" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-zinc-300 rounded-md flex items-center justify-center hover:bg-zinc-400 transition-colors"
              >
                <Twitter size={18} className="text-brand-600" />
                <span className="sr-only">Twitter</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-8">
            {/* Sections */}
            <div>
              <h3 className="text-lg font-medium mb-6">Sections</h3>
              <ul className="space-y-4">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#faqs" className="text-gray-400 hover:text-white transition-colors">
                    Faqs
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <NavLink to="/sign-up" className="text-gray-400 hover:text-white transition-colors">
                    Register
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/sign-in" className="text-gray-400 hover:text-white transition-colors">
                    Login
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Pages */}
            <div>
              <h3 className="text-lg font-medium mb-6">Pages</h3>
              <ul className="space-y-4">
                <li>
                  <a href="#home" className="text-gray-400 hover:text-white transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <NavLink to="/generate-email" className="text-gray-400 hover:text-white transition-colors">
                    Generate Email
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/community" className="text-gray-400 hover:text-white transition-colors">
                    Community
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink to="/404" className="text-gray-400 hover:text-white transition-colors">
                    404
                  </NavLink>
                </li> */}
              </ul>
            </div>
          </div>
        </div>

      <div className="mt-4 text-gray-400 text-center sm:text-left">
        @Copyright, All rights reserved. ColdMailerAI
      </div>
      </div>

    </footer>
  )
}

