import { ghlFetch } from "./client";

export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  locationId: string;
  dateAdded: string;
  customFields?: Record<string, any>;
}

export interface CreateContactInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  locationId: string;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

type ContactsApiResponse = {
  contacts?: GHLContact[];
  data?: { contacts?: GHLContact[] } | GHLContact[];
};

type ContactApiResponse = {
  contact?: GHLContact;
};

/**
 * Fetches contacts for a GoHighLevel location.
 */
export async function getContacts(
  locationId: string,
  limit = 100,
): Promise<GHLContact[]> {
  const params = new URLSearchParams({
    locationId,
    limit: String(limit),
  });

  const candidates = [
    `/contacts/?${params.toString()}`,
    `/contacts?${params.toString()}`,
  ];

  let lastError: unknown;
  for (const endpoint of candidates) {
    try {
      const result = await ghlFetch<ContactsApiResponse>({
        endpoint,
        method: "GET",
      });

      if (Array.isArray(result.contacts)) {
        return result.contacts;
      }
      if (Array.isArray(result.data)) {
        return result.data;
      }
      if (
        result.data &&
        typeof result.data === "object" &&
        Array.isArray(result.data.contacts)
      ) {
        return result.data.contacts;
      }
      return [];
    } catch (error) {
      lastError = error;
      console.warn("getContacts endpoint failed", {
        endpoint,
        locationId,
        limit,
        error,
      });
    }
  }

  throw new Error(
    lastError instanceof Error ? lastError.message : "Failed to fetch contacts from GHL",
  );
}

/**
 * Fetches one contact by GoHighLevel contact ID.
 */
export async function getContactById(contactId: string): Promise<GHLContact | null> {
  try {
    const result = await ghlFetch<ContactApiResponse>({
      endpoint: `/contacts/${contactId}`,
      method: "GET",
    });
    return result.contact ?? null;
  } catch (error) {
    console.error("getContactById failed", { contactId, error });
    return null;
  }
}

/**
 * Creates a contact in GoHighLevel.
 */
export async function createContact(
  locationId: string,
  data: CreateContactInput,
): Promise<GHLContact | null> {
  try {
    const result = await ghlFetch<ContactApiResponse>({
      endpoint: "/contacts/",
      method: "POST",
      body: {
        ...data,
        locationId,
      },
    });
    return result.contact ?? null;
  } catch (error) {
    console.error("createContact failed", { locationId, data, error });
    return null;
  }
}

/**
 * Updates an existing GoHighLevel contact.
 */
export async function updateContact(
  contactId: string,
  data: UpdateContactInput,
): Promise<GHLContact | null> {
  try {
    const result = await ghlFetch<ContactApiResponse>({
      endpoint: `/contacts/${contactId}`,
      method: "PUT",
      body: data,
    });
    return result.contact ?? null;
  } catch (error) {
    console.error("updateContact failed", { contactId, data, error });
    return null;
  }
}

/**
 * Deletes a GoHighLevel contact.
 */
export async function deleteContact(contactId: string): Promise<boolean> {
  try {
    await ghlFetch<unknown>({
      endpoint: `/contacts/${contactId}`,
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("deleteContact failed", { contactId, error });
    return false;
  }
}

/**
 * Searches contacts by free-text query in a location.
 */
export async function searchContacts(
  locationId: string,
  query: string,
): Promise<GHLContact[]> {
  try {
    const params = new URLSearchParams({
      locationId,
      query,
    });
    const result = await ghlFetch<ContactsApiResponse>({
      endpoint: `/contacts/search?${params.toString()}`,
      method: "GET",
    });
    return result.contacts ?? [];
  } catch (error) {
    console.error("searchContacts failed", { locationId, query, error });
    return [];
  }
}
