"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.55,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    delay,
  },
});

export default function Hero() {
  const router = useRouter();

  const loginType = (type: "lawyer" | "user") => {
    localStorage.setItem("loginType", type);
    router.push(`/signin?type=${type}`);
  };

  return (
    <section
      id="hero"
      className="relative bg-[#F7F8FA] pt-32 pb-0 px-4 sm:px-8 lg:px-16 overflow-hidden"
    >
      {/* ── Main content row ── */}
      <div className="max-w-[1440px] mx-auto relative">
        {/* LEFT — text, sits in its own column, ~45% wide */}
        <div className="w-full md:w-[45%] pt-4 pb-16 relative z-10">
          <motion.p
            {...fadeUp(0)}
            className="text-[#1A56DB] text-xs font-semibold uppercase tracking-widest mb-5"
          >
            THE LEGAL SPACE
          </motion.p>

          <motion.h1
            {...fadeUp(0.1)}
            className="text-5xl lg:text-[60px] leading-[1.08] tracking-tight font-['Instrument_Serif'] text-gray-900 mb-6"
          >
            Where Legal <em className="text-[#1A56DB] italic">Connections</em>
            <br />
            Begin...
          </motion.h1>

          <motion.p
            {...fadeUp(0.18)}
            className="text-gray-500 text-base leading-[1.85] max-w-[440px] mb-10"
          >
            The Legal Space brings together lawyers, legal knowledge,
            professional opportunities, and the people who need them through one
            trusted platform.
          </motion.p>

          <motion.div {...fadeUp(0.26)} className="flex flex-wrap gap-3">
            <button
              onClick={() => loginType("lawyer")}
              className="px-6 py-3 border border-gray-200 bg-white text-gray-800 rounded-full text-sm font-medium hover:border-[#1A56DB] hover:shadow-sm transition-all duration-200"
            >
              Join as a Lawyer
            </button>
            <button
              onClick={() => loginType("user")}
              className="px-6 py-3 bg-[#1A56DB] text-white rounded-full text-sm font-medium hover:bg-[#1648b8] transition-colors"
            >
              Find a Lawyer
            </button>
          </motion.div>
        </div>

        {/* RIGHT — mockup: absolutely positioned, breaks out of the column,
            starts from roughly the vertical center of the text block,
            extends to the right viewport edge */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:block absolute top-0 right-[-6vw] w-[62%] z-20"
        >
          <Image
            src="/firstInterfaceimage.png"
            alt="TLS platform interface"
            width={900}
            height={620}
            className="w-full h-auto object-contain drop-shadow-2xl"
            priority
          />
        </motion.div>
      </div>

      {/* ── Bottom: full-bleed network/avatars visualization ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="relative z-10"
        style={{
          marginLeft: "calc(-50vw + 50%)",
          width: "100vw",
          marginTop: "-60px",
        }}
      >
        <Image
          src="/Avatars.png"
          alt="Legal network visualization"
          width={1440}
          height={480}
          className="w-full h-auto object-cover object-top"
          priority
        />
      </motion.div>
    </section>
  );
}
