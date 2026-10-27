"use client";

import { useState } from "react";
import { ArrowUpRight, Menu } from "lucide-react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navLinks } from "@/lib/data";
import { handleAction } from "@/lib/mock-api";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-6 lg:h-[72px] lg:px-8">
        <Logo />

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleAction("Book a Demo — navbar")}
            className="hidden h-10 rounded-lg bg-brand px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-brand-deep sm:inline-flex"
          >
            Book a Demo
            <ArrowUpRight className="size-3.5" />
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
                className="size-10 rounded-lg text-ink hover:bg-gray-100 md:hidden"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[88vw] max-w-sm gap-0 border-l border-line bg-canvas p-0"
            >
              <SheetHeader className="border-b border-line p-5 text-left">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Jump to a section or book a SupportSage demo.
                </SheetDescription>
                <Logo />
              </SheetHeader>

              <nav
                aria-label="Mobile navigation"
                className="flex flex-1 flex-col px-5 py-4"
              >
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <a
                      href={link.href}
                      className="border-b border-line/80 py-4 text-base font-medium text-ink transition-colors hover:text-brand"
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
              </nav>

              <SheetFooter className="border-t border-line p-5">
                <SheetClose asChild>
                  <Button
                    onClick={() => handleAction("Book a Demo — mobile menu")}
                    className="h-11 w-full rounded-lg bg-brand text-sm font-medium text-white hover:bg-brand-deep"
                  >
                    Book a Demo
                    <ArrowUpRight className="size-4" />
                  </Button>
                </SheetClose>
                <p className="text-center text-[11px] leading-5 text-subtle">
                  Accountable AI support, built for teams that own the outcome.
                </p>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
