"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
	User, 
	Mail, 
	Settings, 
	Bell, 
	Globe, 
	CreditCard,
	Shield,
	Loader2,
	Save,
	Check
} from "lucide-react";
import { updateAccountInfo } from "@/app/actions/auth";
import { toast } from "sonner";

// ===========================================
// Language Options
// ===========================================

const languages = [
	{ code: 'en', name: 'English' },
	{ code: 'ar', name: 'العربية' },
	{ code: 'es', name: 'Español' },
	{ code: 'fr', name: 'Français' },
];

// ===========================================
// Loading Skeleton
// ===========================================

function AccountPageSkeleton() {
	return (
		<main className="min-h-screen bg-black text-white">
			<div className="pt-20 pb-8">
				<div className="max-w-4xl mx-auto px-4 md:px-12">
					<div className="h-10 w-48 bg-gray-800 rounded animate-pulse mb-8" />
					
					{/* Profile card skeleton */}
					<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
						<div className="flex items-center gap-6">
							<div className="w-20 h-20 bg-gray-800 rounded-full animate-pulse" />
							<div className="space-y-2">
								<div className="h-6 w-40 bg-gray-800 rounded animate-pulse" />
								<div className="h-4 w-56 bg-gray-800 rounded animate-pulse" />
							</div>
						</div>
					</div>

					{/* Settings skeleton */}
					<div className="space-y-6">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
								<div className="h-6 w-32 bg-gray-800 rounded animate-pulse mb-4" />
								<div className="space-y-4">
									<div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
									<div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</main>
	);
}

// ===========================================
// Main Account Page Component
// ===========================================

export default function AccountPage() {
	const router = useRouter();
	const { user, profile, loading, refreshProfile } = useAuth();

	// Form state
	const [username, setUsername] = useState('');
	const [fullName, setFullName] = useState('');
	const [bio, setBio] = useState('');
	const [language, setLanguage] = useState('en');
	const [isSaving, setIsSaving] = useState(false);
	const [isLanguageSaving, setIsLanguageSaving] = useState(false);

	// Initialize form state from profile
	useEffect(() => {
		if (profile) {
			setUsername(profile.username || '');
			setFullName(profile.full_name || '');
			setBio(profile.bio || '');
			// Get language from profile preferences or default to 'en'
			const savedLanguage = (profile.preferences as Record<string, unknown>)?.language as string || 'en';
			setLanguage(savedLanguage);
		}
	}, [profile]);

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.push("/login");
		}
	}, [loading, user, router]);

	// Show loading state
	if (loading) {
		return (
			<>
				<Navbar />
				<AccountPageSkeleton />
			</>
		);
	}

	// Don't render if not authenticated
	if (!user || !profile) {
		return (
			<>
				<Navbar />
				<AccountPageSkeleton />
			</>
		);
	}

	// Get user initials for avatar fallback
	const userInitials = profile.full_name
		? profile.full_name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: profile.email?.slice(0, 2).toUpperCase() || "U";

	// Handle profile save
	const handleSaveProfile = async () => {
		setIsSaving(true);
		try {
			const result = await updateAccountInfo({
				username: username || undefined,
				fullName: fullName || undefined,
				bio: bio || undefined,
			});

			if (result.success) {
				toast.success('Profile updated successfully');
				// Refresh the profile in auth context
				if (refreshProfile) {
					await refreshProfile();
				}
			} else {
				toast.error(result.error || 'Failed to update profile');
			}
		} catch (error) {
			console.error('Error saving profile:', error);
			toast.error('An unexpected error occurred');
		} finally {
			setIsSaving(false);
		}
	};

	// Handle language change
	const handleLanguageChange = async (langCode: string) => {
		setLanguage(langCode);
		setIsLanguageSaving(true);
		
		try {
			// Store in cookie for immediate effect
			document.cookie = `locale=${langCode};path=/;max-age=31536000`;
			
			// Save to profile
			const result = await updateAccountInfo({
				language: langCode,
			});

			if (result.success) {
				toast.success('Language preference saved');
				// Refresh the profile in auth context
				if (refreshProfile) {
					await refreshProfile();
				}
			} else {
				toast.error(result.error || 'Failed to save language preference');
			}
		} catch (error) {
			console.error('Error saving language:', error);
			toast.error('Failed to save language preference');
		} finally {
			setIsLanguageSaving(false);
		}
	};

	return (
		<>
			<Navbar />
			<main className="min-h-screen bg-black text-white">
				<div className="pt-20 pb-8">
					<div className="max-w-4xl mx-auto px-4 md:px-12">
						<h1 className="text-3xl md:text-4xl font-bold font-display-title mb-8">
							Account Settings
						</h1>

						{/* Profile Information Section */}
						<Card className="bg-zinc-900/50 border-zinc-800 mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-white">
									<User className="w-5 h-5" />
									Profile Information
								</CardTitle>
								<CardDescription className="text-gray-400">
									Your public profile information
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Avatar and basic info */}
								<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
									<Avatar className="w-20 h-20 border-2 border-zinc-700">
										<AvatarImage 
											src={profile.avatar_url || undefined} 
											alt={profile.full_name || "User"} 
										/>
										<AvatarFallback className="bg-zinc-800 text-white text-xl">
											{userInitials}
										</AvatarFallback>
									</Avatar>
									<div className="space-y-1">
										<h3 className="text-xl font-semibold text-white">
											{profile.full_name || "No name set"}
										</h3>
										<p className="text-gray-400 flex items-center gap-2">
											<Mail className="w-4 h-4" />
											{profile.email}
										</p>
										{profile.username && (
											<p className="text-gray-500 text-sm">
												@{profile.username}
											</p>
										)}
									</div>
								</div>

								<Separator className="bg-zinc-800" />

								{/* Editable fields */}
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="fullName" className="text-gray-300">
											Full Name
										</Label>
										<Input
											id="fullName"
											placeholder="Enter your full name"
											value={fullName}
											onChange={(e) => setFullName(e.target.value)}
											className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="username" className="text-gray-300">
											Username
										</Label>
										<Input
											id="username"
											placeholder="Enter a username"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
										/>
										<p className="text-xs text-gray-500">
											3-20 characters, letters, numbers, and underscores only
										</p>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="bio" className="text-gray-300">
										Bio
									</Label>
									<Textarea
										id="bio"
										placeholder="Tell us about yourself"
										value={bio}
										onChange={(e) => setBio(e.target.value)}
										rows={3}
										className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 resize-none"
									/>
								</div>

								<div className="flex justify-end">
									<Button 
										onClick={handleSaveProfile}
										disabled={isSaving}
										className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
									>
										{isSaving ? (
											<>
												<Loader2 className="w-4 h-4 mr-2 animate-spin" />
												Saving...
											</>
										) : (
											<>
												<Save className="w-4 h-4 mr-2" />
												Save Changes
											</>
										)}
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Account Settings Section */}
						<Card className="bg-zinc-900/50 border-zinc-800 mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-white">
									<Settings className="w-5 h-5" />
									Account Settings
								</CardTitle>
								<CardDescription className="text-gray-400">
									Manage your account preferences
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Language Preference */}
								<div className="flex items-center justify-between py-3">
									<div className="flex items-center gap-3">
										<Globe className="w-5 h-5 text-gray-400" />
										<div>
											<p className="text-white font-medium">Language</p>
											<p className="text-gray-500 text-sm">
												Choose your preferred language
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{isLanguageSaving && (
											<Loader2 className="w-4 h-4 animate-spin text-gray-400" />
										)}
										<select 
											value={language}
											onChange={(e) => handleLanguageChange(e.target.value)}
											disabled={isLanguageSaving}
											className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500 disabled:opacity-50"
										>
											{languages.map((lang) => (
												<option key={lang.code} value={lang.code}>
													{lang.name}
												</option>
											))}
										</select>
									</div>
								</div>

								<Separator className="bg-zinc-800" />

								{/* Notifications */}
								<div className="flex items-center justify-between py-3">
									<div className="flex items-center gap-3">
										<Bell className="w-5 h-5 text-gray-400" />
										<div>
											<p className="text-white font-medium">Notifications</p>
											<p className="text-gray-500 text-sm">
												Receive email notifications
											</p>
										</div>
									</div>
									<label className="relative inline-flex items-center cursor-pointer">
										<input type="checkbox" className="sr-only peer" defaultChecked />
										<div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
									</label>
								</div>

								<Separator className="bg-zinc-800" />

								{/* Privacy */}
								<div className="flex items-center justify-between py-3">
									<div className="flex items-center gap-3">
										<Shield className="w-5 h-5 text-gray-400" />
										<div>
											<p className="text-white font-medium">Privacy</p>
											<p className="text-gray-500 text-sm">
												Manage your privacy settings
											</p>
										</div>
									</div>
									<Link href="/privacy">
										<Button variant="outline" className="border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white">
											View Privacy Policy
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>

						{/* Subscription/Plan Section */}
						<Card className="bg-zinc-900/50 border-zinc-800 mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-white">
									<CreditCard className="w-5 h-5" />
									Subscription
								</CardTitle>
								<CardDescription className="text-gray-400">
									Your current plan and billing information
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 px-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
									<div>
										<div className="flex items-center gap-2 mb-1">
											<span className="text-white font-semibold text-lg">Free Plan</span>
											<span className="px-2 py-0.5 text-xs bg-zinc-700 text-gray-300 rounded-full">
												Current
											</span>
										</div>
										<p className="text-gray-400 text-sm">
											Access to basic streaming features with ads
										</p>
									</div>
									<Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white">
										Upgrade Plan
									</Button>
								</div>

								<div className="mt-4 text-sm text-gray-500">
									<p>• Stream in HD quality</p>
									<p>• Limited watchlist storage</p>
									<p>• Ad-supported viewing</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</>
	);
}
