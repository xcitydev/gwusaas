import { auth } from "@clerk/nextjs/server";

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

  return <>{children}</>;
}
