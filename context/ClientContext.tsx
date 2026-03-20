"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type OrgClient = {
  _id: string;
  clientName: string;
  clientEmail: string;
  instagramUsername: string;
  niche: string;
  notes?: string;
  status: string;
  addedAt: number;
  avatarUrl?: string;
};

type DirectClient = {
  id: string;
  clientName: string;
  clientEmail: string;
  instagramUsername: string;
  niche: string;
  notes?: string;
  status: string;
  addedAt: number;
  avatarUrl?: string;
  isDirect: true;
};

function isDirectClient(value: OrgClient | DirectClient): value is DirectClient {
  return (value as DirectClient).isDirect === true;
}

type ClientContextType = {
  selectedClient: OrgClient | DirectClient | null;
  setSelectedClientId: (clientId: string) => void;
  isAgency: boolean;
  orgClients: OrgClient[];
  userType: "client" | "agency";
  loading: boolean;
  resolvedClientId: string | null;
};

const ClientContext = createContext<ClientContextType>({
  selectedClient: null,
  setSelectedClientId: () => {},
  isAgency: false,
  orgClients: [],
  userType: "client",
  loading: true,
  resolvedClientId: null,
});

const STORAGE_KEY = "gwu:selected-client-id";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const workspace = useQuery(
    api.clientWorkspace.getWorkspace,
    user?.id ? { clerkUserId: user.id } : "skip",
  ) as
    | {
        userType: "client" | "agency";
        selectedClient: (OrgClient & { isDirect?: false }) | DirectClient | null;
        clients: OrgClient[];
      }
    | null
    | undefined;

  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(null);

  useEffect(() => {
    const cached = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (cached) setSelectedClientIdState(cached);
  }, []);

  useEffect(() => {
    if (selectedClientId && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, selectedClientId);
    }
  }, [selectedClientId]);

  const value = useMemo<ClientContextType>(() => {
    if (!workspace) {
      return {
        selectedClient: null,
        setSelectedClientId: () => {},
        isAgency: false,
        orgClients: [],
        userType: "client",
        loading: true,
        resolvedClientId: null,
      };
    }

    const isAgency = workspace.userType === "agency";
    const orgClients = workspace.clients || [];
    let selected: OrgClient | DirectClient | null = workspace.selectedClient;

    if (isAgency && orgClients.length > 0 && selectedClientId) {
      selected =
        orgClients.find((client) => String(client._id) === selectedClientId) ||
        workspace.selectedClient;
    }

    const resolvedClientId = selected
      ? isDirectClient(selected)
        ? selected.id
        : String(selected._id)
      : null;

    return {
      selectedClient: selected,
      setSelectedClientId: (clientId: string) => setSelectedClientIdState(clientId),
      isAgency,
      orgClients,
      userType: workspace.userType,
      loading: false,
      resolvedClientId,
    };
  }, [workspace, selectedClientId]);

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClientContext() {
  return useContext(ClientContext);
}

export function useSelectedClient() {
  const ctx = useClientContext();
  return {
    selectedClient: ctx.selectedClient,
    selectedClientId: ctx.resolvedClientId,
    isAgency: ctx.isAgency,
    userType: ctx.userType,
    loading: ctx.loading,
  };
}
