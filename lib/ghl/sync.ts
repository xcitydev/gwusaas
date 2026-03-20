import { ConvexHttpClient } from "convex/browser";
import { getContacts } from "./contacts";

type SyncResult = {
  synced: number;
  errors: number;
};

/**
 * Syncs GHL contacts for a location into the Convex ghlContacts table.
 */
export async function syncContactsToConvex(locationId: string): Promise<SyncResult> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error("syncContactsToConvex failed: missing Convex URL");
    return { synced: 0, errors: 1 };
  }

  const contacts = await getContacts(locationId);
  if (contacts.length === 0) {
    console.log("syncContactsToConvex completed with no contacts", { locationId });
    return { synced: 0, errors: 0 };
  }

  const convexClient = new ConvexHttpClient(convexUrl);
  let synced = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      await convexClient.mutation("ghl:upsertGHLContact" as never, {
        ghlContactId: contact.id,
        locationId: contact.locationId || locationId,
        firstName: contact.firstName,
        lastName: contact.lastName || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        tags: contact.tags ?? [],
        stage: undefined,
        lastSyncedAt: Date.now(),
      } as never);
      synced += 1;
    } catch (error) {
      console.error("syncContactsToConvex upsert failed", {
        locationId,
        contactId: contact.id,
        error,
      });
      errors += 1;
    }
  }

  console.log("syncContactsToConvex finished", { locationId, synced, errors });
  return { synced, errors };
}
