"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Users,
  LogOut,
  ChevronDown,
} from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const { user, profile, activeUserProfile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render if not logged in
  if (!user || !profile) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  // Get display name from active user profile (Netflix-style) or fall back to account profile
  const displayName = activeUserProfile?.name || profile.full_name || profile.username || user.email?.split("@")[0] || "User";
  // Use profile avatar (custom_avatar_url takes priority over avatar_url)
  const avatarUrl = activeUserProfile?.custom_avatar_url || activeUserProfile?.avatar_url || profile.avatar_url;

  // Generate initials for avatar fallback
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-3 py-2 h-auto rounded-full hover:bg-white/10 transition-colors"
          >
            <Avatar className="w-8 h-8 border-2 border-transparent">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-red-600 text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-white hidden sm:inline-block max-w-[100px] truncate">
              {displayName}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56 bg-zinc-900 border-zinc-800 text-white"
          sideOffset={8}
        >
          {/* Account email header */}
          <div className="px-3 py-2 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 leading-none truncate">
              {user.email}
            </p>
          </div>

          <DropdownMenuItem
            className="cursor-pointer focus:bg-zinc-800 focus:text-white"
            onClick={() => router.push("/account")}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Account</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer focus:bg-zinc-800 focus:text-white"
            onClick={() => router.push("/profiles")}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Profile Switch</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-zinc-800" />

          <DropdownMenuItem
            className="cursor-pointer focus:bg-zinc-800 focus:text-red-400 text-red-400"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
