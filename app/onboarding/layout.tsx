import { auth } from "@clerk/nextjs/server";
import { ClientProvider } from "@/context/ClientContext";

export default async function OnboardingLayout({
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

  return <ClientProvider>{children}</ClientProvider>;
}
