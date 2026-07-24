import { PasscodeGate } from "@/components/passcode-gate";
import { TripApp } from "@/components/trip-app";

export default function Home() {
  return (
    <PasscodeGate>
      <TripApp />
    </PasscodeGate>
  );
}
