import { LoginGate } from "@/components/login-gate";
import { TripApp } from "@/components/trip-app";
import { PartnerSessionProvider } from "@/lib/partner-session";

export default function Home() {
  return (
    <PartnerSessionProvider>
      <LoginGate>
        <TripApp />
      </LoginGate>
    </PartnerSessionProvider>
  );
}
