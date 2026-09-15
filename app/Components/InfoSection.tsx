"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { num: "5,400+", label: "Legal Requests Submitted" },
  { num: "1,200+", label: "Legal Professionals" },
  { num: "450+", label: "Legal Articles Published" },
  { num: "40+", label: "Practice Areas" },
  { num: "50+", label: "Events & Opportunities" },
];

function StatItem({ num, label, index }: { num: string; label: string; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="text-center px-6 border-r border-[#E5E7EB] last:border-r-0"
    >
      <p className="font-dmSans text-4xl lg:text-[44px] tracking-tight leading-none text-gray-900">
        {num.replace("+", "")}
        <span className="text-[#1A56DB]">+</span>
      </p>
      <p className="text-[13px] text-gray-400 mt-2">{label}</p>
    </motion.div>
  );
}

export default function InfoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="stats" className="py-20 bg-white border-b-0 border-[#E5E7EB] px-4 sm:px-8 lg:px-16">
      <div className="max-w-360 mx-auto">
        {/* Label */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="inline-block border border-[#E5E7EB] rounded-full px-6 py-2 text-sm text-black">
            Our Growing Community
          </span>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-0">
          {stats.map((s, i) => (
            <StatItem key={s.label} {...s} index={i} />
          ))}
        </div>

        {/* Partner logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 pt-6 border-t border-[#E5E7EB]"
        >
          {/* <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-16">
            {["⚡ Logoipsum", "🐻 logo ipsum", "✕ Logoipsum", "🌐 logo–ipsum", "✈ LOGOIPSUM"].map((logo) => (
              <span key={logo} className="text-gray-400 text-base font-bold tracking-tight">
                {logo}
              </span>
            ))}
          </div> */}
          <p className="text-center text-sm text-gray-400 mt-0">
            Building stronger legal connections through meaningful partnerships.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
