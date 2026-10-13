import Image from "next/image";
import WaitlistForm from "./WaitlistForm";
import appIcon from "./icon.png";
import { PRO_PRICE } from "./lib/atlas";

const testFlightUrl = process.env.NEXT_PUBLIC_TESTFLIGHT_URL?.trim() ?? "";

const ladder = [
  {
    label: "Source Clue",
    title: "Instagram or a link",
    copy: "Paste a Reel, Maps link, or note. Memo keeps the source without pretending it is a place yet.",
    tone: "bg-coral/20",
  },
  {
    label: "Review Candidate",
    title: "Memo finds the likely place",
    copy: "Savvy shows what is known and what is missing. You confirm before anything becomes memory.",
    tone: "bg-sky/50",
  },
  {
    label: "Map Stamp",
    title: "Confirmed on your map",
    copy: "A Map Stamp is a saved place with a reliable map identity — honey seal, not a generic pin dump.",
    tone: "bg-mint/60",
    stamp: true,
  },
] as const;

const freeItems = ["Your own Map Stamps", "Basic map of confirmed places"];

const proItems = [
  "Unlimited Map Stamps",
  "Instagram parse quota",
  "Friends and Passport, full",
  "Export",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col gap-10 px-5 py-8 sm:gap-12 sm:py-12">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src={appIcon}
            alt=""
            priority
            sizes="52px"
            className="size-[52px] rounded-[14px] border-[1.4px] border-line bg-paper p-1 shadow-atlas"
          />
          <div>
            <p className="atlas-strong text-xl text-forest">Savvy</p>
            <p className="text-sm font-medium text-muted">Memo’s place-memory notebook</p>
          </div>
        </div>
        <span className="kraft-chip">Place memory</span>
      </header>

      <section className="atlas-paper rounded-panel p-6 sm:p-8" aria-labelledby="hero-title">
        <p className="atlas-eyebrow mb-3">Instagram / link → Map Stamp → map</p>
        <h1 id="hero-title" className="atlas-display mb-4 text-[2.1rem] leading-[1.08] sm:text-5xl">
          Keep the place.
          <span className="block italic font-normal text-forest/80">Remember why.</span>
        </h1>
        <p className="mb-6 max-w-[42rem] text-base font-medium leading-relaxed text-ink sm:text-lg">
          Savvy turns an Instagram Reel or any place link into a Map Stamp on your map.
          Memo keeps the Source Clue, asks you to confirm a Review Candidate, then stamps
          the memory. This is place-memory — not a marketplace, not a bot seat.
        </p>

        <div className="mb-4">
          <WaitlistForm />
        </div>

        {testFlightUrl ? (
          <a
            href={testFlightUrl}
            target="_blank"
            rel="noreferrer"
            className="atlas-strong inline-flex min-h-12 items-center justify-center rounded-[14px] border border-line bg-paper px-5 text-ink"
          >
            Open TestFlight
          </a>
        ) : (
          <p className="atlas-paper inline-flex min-h-12 items-center rounded-[14px] px-4 text-sm font-medium text-muted">
            TestFlight invite is not open yet. Use the waitlist —{" "}
            <code className="mx-1 text-ink">NEXT_PUBLIC_TESTFLIGHT_URL</code> is unset.
          </p>
        )}
      </section>

      <section aria-labelledby="ladder-title" className="flex flex-col gap-4">
        <div>
          <p className="atlas-eyebrow mb-2">How a memory is made</p>
          <h2 id="ladder-title" className="atlas-display text-2xl sm:text-3xl">
            Source Clue → Review Candidate → Map Stamp
          </h2>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {ladder.map((step, index) => (
            <li key={step.label} className={`atlas-paper rounded-card p-4 ${step.tone}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="kraft-chip">
                  {index + 1}. {step.label}
                </span>
                {"stamp" in step ? <span className="honey-stamp">Stamp</span> : null}
              </div>
              <h3 className="atlas-strong mb-2 text-lg text-forest">{step.title}</h3>
              <p className="text-sm font-medium leading-relaxed text-ink">{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pricing-title" className="flex flex-col gap-4">
        <div>
          <p className="atlas-eyebrow mb-2">Passport plans</p>
          <h2 id="pricing-title" className="atlas-display text-2xl sm:text-3xl">
            Free, or Pro {PRO_PRICE}/mo
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="atlas-paper rounded-card p-5">
            <span className="kraft-chip">Free</span>
            <h3 className="atlas-display mt-3 text-3xl">Free</h3>
            <p className="mb-4 text-sm font-medium text-muted">Own stamps and a basic map.</p>
            <ul className="space-y-2 text-sm font-medium text-ink">
              {freeItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </article>

          <article className="atlas-paper rounded-card bg-lavender/55 p-5">
            <span className="kraft-chip">Pro</span>
            <h3 className="atlas-display mt-3 text-3xl">
              {PRO_PRICE}
              <span className="ml-1 text-lg font-medium text-muted">/mo</span>
            </h3>
            <p className="mb-4 text-sm font-medium text-muted">
              Lavender marks the premium Passport lane. Coral stays the only primary action.
            </p>
            <ul className="space-y-2 text-sm font-medium text-ink">
              {proItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <footer className="atlas-paper rounded-card px-5 py-4 text-sm font-medium text-muted">
        <p>
          Savvy · Memo · Map Stamp · Source Clue · Review Candidate · Passport. Field
          notebook for place memory. Founder sets waitlist and TestFlight in env — no
          secrets in this page.
        </p>
      </footer>
    </main>
  );
}
