"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

export default function HeroCTA() {
  const router = useRouter();

  const loginType = (type: "lawyer" | "user") => {
    localStorage.setItem("loginType", type);
    router.push(`/signin?type=${type}`);
  };

  return (
    <section
      id="cta"
      className="overflow-hidden relative px-4 sm:px-8 lg:px-16"
      style={{
        backgroundImage: "url('/community-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-360 mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-end min-h-120">
        {/* Left text */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="py-20"
        >
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1A56DB] mb-4">
            READY TO GET STARTED?
          </p>
          <h2 className="font-['Instrument_Serif'] text-5xl lg:text-[52px] leading-tight tracking-tight text-gray-900 mb-5">
            Join a Growing Legal <br />
            <em className="text-[#1A56DB]">Community</em>
          </h2>
          <p className="text-gray-600 text-[15px] leading-relaxed m mb-8">
            Whether you&apos;re seeking legal support, looking to grow your
            practice, or exploring valuable legal resources, The Legal Space
            brings everything together in one trusted network.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => loginType("lawyer")}
              className="px-5 py-2.5 border border-gray-300 bg-white text-gray-800 rounded-4xl text-sm font-medium hover:border-[#1A56DB] transition-all"
            >
              Join as a Lawyer
            </button>
            <button
              onClick={() => loginType("user")}
              className="px-5 py-2.5 bg-[#1A56DB] text-white rounded-4xl text-sm font-medium hover:bg-[#1648b8] transition-colors shadow-sm"
            >
              Find a Lawyer
            </button>
          </div>
        </motion.div>

        {/* Right — decorative people */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="hidden md:flex items-end justify-center gap-6 h-full pt-12"
        >
          <Image
            src="/community-img.png"
            alt="Community"
            width={800}
            height={600}
            className="w-full h-auto object-cover block"
          />
        </motion.div>
      </div>
    </section>
  );
}
