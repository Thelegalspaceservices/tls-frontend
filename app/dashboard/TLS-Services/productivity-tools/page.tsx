import EventsPanel from '@/app/Components/EventPanel';
import ProductivityForm from '@/app/Components/TLSServices/ProductivityForm';
import { BackArrow } from '@/app/Components/TLSServices/FormKit';

export const metadata = {
  title: "Build Custom Productivity Tools | The Legal Space",
  description:
    "Request a proposal for custom internal tools to manage workflows, track time, and monitor staff activity.",
};

export default function Page() {
  return (
    <div className="min-h-screen">
      {/* Fixed heading */}
      <div className="fixed top-0 left-55 right-0 bg-white z-10 border-b border-[#E6EAED]">
        <div className="px-6 pt-5 pb-5.25 flex items-center gap-2">
          <BackArrow href="/dashboard/TLS-Services" />
          <p className="text-[22px] font-regular text-gray-900" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Build Custom Productivity Tools
          </p>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-18.75" />

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] items-start">
        <ProductivityForm />
        <div className="min-w-0 border-l border-[#ECECEC] min-h-screen xl:invisible">
          <EventsPanel />
        </div>
      </div>

      {/* Fixed EventsPanel on desktop */}
      <div
        className="hidden xl:block fixed top-18.75 border-l border-[#ECECEC] bg-white"
        style={{
          right: 0,
          width: "calc((100vw - 220px) * 0.4)",
          height: "calc(100vh - 75px)",
          overflowY: "auto",
        }}
      >
        <EventsPanel />
      </div>
    </div>
  )
}