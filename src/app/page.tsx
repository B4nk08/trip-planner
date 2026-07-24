import { PasscodeGate } from "@/components/passcode-gate";
import { TripBoard } from "@/components/trip-board";

export default function Home() {
  return (
    <PasscodeGate>
      <TripBoard />
    </PasscodeGate>
  );
}
