import EventsPanel from '@/app/Components/EventPanel';
import WebsiteForm from '@/app/Components/TLSServices/WebsiteForm';
import { BackArrow } from '@/app/Components/TLSServices/FormKit';

export const metadata = {
  title: "Build Your Legal Website | The Legal Space",
  description:
    "Request a proposal for a modern, fast, and professionally designed website for your law firm.",
};

export default function Page() {
  return (
    <div className="min-h-screen">
      {/* Fixed heading */}
      <div className="fixed top-0 left-[220px] right-0 bg-white z-10 border-b border-[#E6EAED]">
        <div className="px-6 pt-5 pb-1 flex items-center gap-2">
          <BackArrow href="/dashboard/TLS-Services" />
          <p className="text-[22px] font-regular text-gray-900" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Build Your Legal Website
          </p>
        </div>
        <span className="block mb-[17px]" />
      </div>

      {/* Spacer for fixed header */}
      <div className="h-[75px]" />

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] items-start">
        <WebsiteForm />
        <div className="min-w-0 border-l border-[#ECECEC] min-h-screen xl:invisible">
          <EventsPanel />
        </div>
      </div>

      {/* Fixed EventsPanel on desktop */}
      <div
        className="hidden xl:block fixed top-[75px] border-l border-[#ECECEC] bg-white"
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