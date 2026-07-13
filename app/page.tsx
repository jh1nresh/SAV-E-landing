import { MemorySequence } from "./memory-sequence";

const testFlightUrl = process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? "https://testflight.apple.com/join/aSVm9hRJ";

export default function Home() {
  return (
    <main>
      <MemorySequence testFlightUrl={testFlightUrl} />
    </main>
  );
}
