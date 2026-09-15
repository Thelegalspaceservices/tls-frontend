"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  {
    label: "Resources",
    href: "#resources",
    dropdown: [
      { label: "Articles", href: "#resources" },
      { label: "Events", href: "#resources" },
      { label: "TLS Research", href: "#resources" },
      { label: "Legal News", href: "#resources" },
    ],
  },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ's", href: "#faqs" },
];

type NavbarProps = {
  /**
   * Kept for API compatibility with callers; no longer changes styling
   * since the bar now uses a single flat translucent treatment everywhere.
   */
  strongBlur?: boolean;
};

export default function Navbar({ strongBlur = false }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const router = useRouter();
  const usePathName = usePathname();

  const scrollToSection = (href: string) => {
    const id = href.replace("#", "");
    if (usePathName !== "/") {
      router.push(`/#${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 90;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    if (usePathName === "/" && typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const offset = 90;
          const top = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [usePathName]);

  const loginType = (type: "lawyer" | "user") => {
    localStorage.setItem("loginType", type);
    router.push(`/signin?type=${type}`);
  };

  return (
    <>
      {/* Sticky navbar wrapper */}
      <div className="fixed top-0 left-0 w-full z-50 font-dmSans">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center justify-between px-5 sm:px-8 lg:px-12 py-3 z-5000 bg-[#FFFFFF0D] backdrop-blur-md nav-glass transition-all duration-300"
        >
          {/* Logo */}
          <button
            onClick={() => {
              if (usePathName === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                router.push("/");
              }
            }}
            className="shrink-0"
            aria-label="Go to top"
          >
            <Image
              src="/logoblack8k.png"
              alt="The Legal Space"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </button>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-1 navLink">
            {navLinks.map((link) =>
              link.dropdown ? (
                <li
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setResourcesOpen(true)}
                  onMouseLeave={() => setResourcesOpen(false)}
                >
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors font-dmSans"
                  >
                    {link.label}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {resourcesOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-44 bg-white rounded-xl shadow-lg py-1.5 z-50"
                      >
                        {link.dropdown.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => {
                              scrollToSection(item.href);
                              setResourcesOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              ) : (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors font-dmSans"
                  >
                    {link.label}
                  </button>
                </li>
              ),
            )}
          </ul>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-2 ctaLink">
            <button
              onClick={() => loginType("lawyer")}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-full hover:bg-white/10 transition-colors font-medium"
            >
              Join as a Lawyer
            </button>
            <button
              onClick={() => loginType("user")}
              className="text-sm bg-[#1A56DB] text-white px-4 py-2.5 rounded-full hover:bg-[#1648b8] transition-colors font-medium shadow-sm"
            >
              Find a lawyer
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hamBtn md:hidden p-2 rounded-lg text-gray-600 hover:bg-white/10 transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </motion.nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="bg-white shadow-xl p-3 mx-5 sm:mx-8 lg:mx-12 rounded-2xl"
            >
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    scrollToSection(link.href);
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-white transition-colors font-medium"
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-2 pt-2 space-y-1">
                <button
                  onClick={() => loginType("lawyer")}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-white font-medium"
                >
                  Join as a Lawyer
                </button>
                <button
                  onClick={() => loginType("user")}
                  className="block w-full text-center bg-[#1A56DB] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#1648b8] transition-colors"
                >
                  Find a lawyer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}