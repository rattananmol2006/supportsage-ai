import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { Capabilities } from "@/components/site/capabilities";
import { Pipeline } from "@/components/site/pipeline";
import { Metrics } from "@/components/site/metrics";
import { Technology } from "@/components/site/technology";
import { FinalCta } from "@/components/site/final-cta";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <Hero />
        <Capabilities />
        <Pipeline />
        <Metrics />
        <Technology />
        <FinalCta />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
