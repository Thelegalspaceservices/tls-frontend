import Navbar from "./Components/Navbar";
import Hero from "./Components/Hero";
// import InfoSection from "./Components/InfoSection";
import Features from "./Components/Features";
import HowItWorks from "./Components/HowItWorks";
import LegalInsights from "./Components/LegalInsights";
import UseCaseSection from "./Components/UseCaseSection";
import HeroCTA from "./Components/HeroCTA";
import Footer from "./Components/Footer";

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      {/* <InfoSection /> */}
      <div className="w-full  bg-[#F7F8FA]">
        <Features />
      </div>
      <HowItWorks />
      <LegalInsights />
      <UseCaseSection />
      <HeroCTA />
      <Footer />
    </div>
  );
}
