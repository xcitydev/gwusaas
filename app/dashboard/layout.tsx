import { auth } from "@clerk/nextjs/server";
import { ClientProvider } from "@/context/ClientContext";
import { TrialBanner } from "@/components/TrialBanner";
import { ReferralAttribute } from "@/components/auth/ReferralAttribute";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, redirectToSignIn } = await auth({
    treatPendingAsSignedOut: false,
  });

  if (!userId) {
    return redirectToSignIn();
  }

  return (
    <ClientProvider>
      {/* One-shot: flushes any ?ref code captured at sign-up to the
          attribute API on the user's first authed visit. */}
      <ReferralAttribute />
      <TrialBanner />
      {children}
    </ClientProvider>
  );
}
