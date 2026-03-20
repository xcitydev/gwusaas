"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import SideBar from "@/components/SideBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

type GhlContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
};

export default function CRMPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [contacts, setContacts] = useState<GhlContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [limit, setLimit] = useState("100");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  const fetchContacts = async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      const qs = new URLSearchParams();
      if (locationId.trim()) {
        qs.set("locationId", locationId.trim());
      }
      qs.set("limit", limit || "100");

      const response = await fetch(`/api/ghl/contacts?${qs.toString()}`);
      const payload = (await response.json()) as {
        success?: boolean;
        data?: GhlContact[];
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to fetch GHL contacts");
      }

      setContacts(Array.isArray(payload.data) ? payload.data : []);
      toast.success("CRM refreshed from GHL");
    } catch (error) {
      console.error("Failed to fetch CRM contacts", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch contacts";
      setLastError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void fetchContacts();
  }, [isLoaded, isSignedIn]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const contact of contacts) {
      for (const tag of contact.tags || []) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (tagFilter !== "all" && !(contact.tags || []).includes(tagFilter)) {
        return false;
      }
      if (!query) return true;

      const haystack = [
        contact.firstName || "",
        contact.lastName || "",
        contact.email || "",
        contact.phone || "",
        ...(contact.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [contacts, searchQuery, tagFilter]);

  const exportCsv = () => {
    if (filteredContacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }

    const rows = [
      ["id", "firstName", "lastName", "email", "phone", "tags", "dateAdded"],
      ...filteredContacts.map((c) => [
        c.id,
        c.firstName || "",
        c.lastName || "",
        c.email || "",
        c.phone || "",
        (c.tags || []).join("; "),
        c.dateAdded || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ghl-crm-contacts.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
    toast.success("Contacts exported");
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]" />
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">CRM - GHL Contacts</h2>
            <p className="text-muted-foreground">
              Manage leads pulled from your GoHighLevel account.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => void fetchContacts()} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              {isLoading ? "Loading..." : "Refresh from GHL"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredContacts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">With Email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredContacts.filter((c) => Boolean(c.email)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">With Phone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredContacts.filter((c) => Boolean(c.phone)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tagged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {filteredContacts.filter((c) => (c.tags || []).length > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All GHL Contacts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pull live contacts and filter them by tags or search text.
            </p>
            {lastError ? (
              <p className="text-sm text-red-400">Connection error: {lastError}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Input
                placeholder="Optional locationId override"
                className="max-w-[260px]"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
              />
              <Input
                placeholder="Limit"
                className="max-w-[100px]"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredContacts.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Date Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {[contact.firstName, contact.lastName]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </TableCell>
                        <TableCell>{contact.email || "-"}</TableCell>
                        <TableCell>{contact.phone || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex flex-wrap gap-1">
                            {(contact.tags || []).length > 0 ? (
                              (contact.tags || []).slice(0, 3).map((tag) => (
                                <Badge key={`${contact.id}-${tag}`} variant="secondary">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.dateAdded
                            ? new Date(contact.dateAdded).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No contacts found</p>
                <p className="text-sm">
                  Click &quot;Refresh from GHL&quot; to load contacts.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}

