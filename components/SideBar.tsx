"use client";

import React, { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useWhitelabel } from "@/context/WhitelabelContext";

const SideBar = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { platformName } = useWhitelabel();

  return (
    <div className="min-h-screen w-full bg-background lg:flex">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-14 border-b border-border/80 bg-background/90 backdrop-blur lg:hidden">
          <div className="h-full px-4 flex items-center justify-between">
            <p className="font-semibold">{platformName}</p>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" aria-label="Open menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[300px] sm:max-w-none">
                <AppSidebar className="h-dvh w-full border-r-0" onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SideBar;
