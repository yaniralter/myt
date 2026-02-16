"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, Palette, Store, LogOut, User } from "lucide-react";
import type { Profile } from "@/lib/types";

export default function Navbar() {
  const [user, setUser] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      if (!supabase) return;
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (data) setUser(data);
      }
    }
    getUser();
  }, []);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-primary"
          >
            <span className="text-accent">M</span>YT
          </Link>

          {/* Desktop nav center */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/marketplace"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Marketplace
            </Link>
            {user && (
              <Link
                href="/design-studio"
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <Palette className="w-4 h-4" />
                Design Studio
              </Link>
            )}
          </div>

          {/* Desktop nav right */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/seller-dashboard"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5"
                >
                  <Store className="w-4 h-4" />
                  Dashboard
                </Link>
                <div className="flex items-center gap-3 pl-3 border-l border-border">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-accent" />
                    </div>
                  )}
                  <span className="text-sm text-primary truncate max-w-[120px]">
                    {user.full_name || user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Log In
                </Link>
                <Link
                  href="/auth"
                  className="text-sm bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-4 space-y-3">
          <Link
            href="/marketplace"
            className="block text-sm text-muted-foreground hover:text-primary"
            onClick={() => setMenuOpen(false)}
          >
            Marketplace
          </Link>
          {user ? (
            <>
              <Link
                href="/design-studio"
                className="block text-sm text-muted-foreground hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Design Studio
              </Link>
              <Link
                href="/seller-dashboard"
                className="block text-sm text-muted-foreground hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setMenuOpen(false);
                }}
                className="block text-sm text-destructive"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="block text-sm text-muted-foreground hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/auth"
                className="block text-sm bg-accent text-accent-foreground px-4 py-2 rounded-lg text-center"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
