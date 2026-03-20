"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ClientPortalPage() {
  const { user } = useUser();
  const runs = useQuery(
    api.contentPipeline.getRuns,
    user?.id ? { userId: user.id } : "skip",
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Client Portal</h1>
        <p className="text-muted-foreground">
          Review your content calendar and approve prepared content.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Pipeline</CardTitle>
          <CardDescription>Your latest generated weekly calendars.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!runs || runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No content pipeline runs yet.</p>
          ) : (
            runs.slice(0, 6).map((run) => (
              <Link
                key={run._id}
                href={`/dashboard/content-pipeline/${run._id}`}
                className="block rounded-lg border p-3 hover:bg-accent/40"
              >
                <p className="font-medium">Week of {run.weekStartDate}</p>
                <p className="text-xs text-muted-foreground">{run.status}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings">Open settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
