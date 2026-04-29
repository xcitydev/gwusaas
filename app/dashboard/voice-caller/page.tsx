import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { VoiceCallerDashboard } from "@/components/voice-caller/VoiceCallerDashboard";

export default function VoiceCallerPage() {
  return (
    <SideBar>
      <PlanGate requiredPlan="growth">
        <VoiceCallerDashboard />
      </PlanGate>
    </SideBar>
  );
}
