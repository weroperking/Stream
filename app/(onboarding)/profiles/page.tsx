'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MAX_PROFILES, 
  type UserProfile 
} from '@/lib/auth-types';
import { 
  createUserProfile, 
  getUserProfiles, 
  updateOnboardingStep, 
  deleteUserProfile,
  updateUserProfile,
  setDefaultProfile 
} from '@/app/actions/auth';
import { 
  Plus, 
  X, 
  Loader2, 
  ChevronRight, 
  Pencil, 
  Trash2,
  User,
  AlertCircle,
  MapPin
} from 'lucide-react';

// Default 3D avatar URLs
const DEFAULT_AVATARS = [
  { id: 'teen_boy', label: 'Teen Boy', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=teenboy&backgroundType=gradientLinear&backgroundColor=ffd5dc,ffdfbf' },
  { id: 'teen_girl', label: 'Teen Girl', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=teengirl&backgroundType=gradientLinear&backgroundColor=ffd5dc,ffdfbf' },
  { id: 'father', label: 'Father', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=father&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede' },
  { id: 'mother', label: 'Mother', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=mother&backgroundType=gradientLinear&backgroundColor=ffd5dc,ffdfbf' },
  { id: 'grandfather', label: 'Grandfather', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=grandpa&backgroundType=gradientLinear&backgroundColor=c0aede,d1d4f9' },
  { id: 'grandmother', label: 'Grandmother', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=grandma&backgroundType=gradientLinear&backgroundColor=ffd5dc,ffdfbf' },
];

export default function ProfilesPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  
  // Check if user is in onboarding mode (hasn't completed preferences yet)
  // Use current_step (not onboarding_step) to match database schema
  const isOnboardingMode = profile?.current_step !== 'completed' && profile?.current_step !== 'pending';
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Add profile form state
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(DEFAULT_AVATARS[0].url);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  
  // Edit profile form state
  const [editProfileName, setEditProfileName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState(DEFAULT_AVATARS[0].url);
  const [editCustomImageUrl, setEditCustomImageUrl] = useState<string | null>(null);
  const [editPinLocation, setEditPinLocation] = useState('');

  // Load existing profiles
  useEffect(() => {
    async function loadProfiles() {
      const userProfiles = await getUserProfiles();
      setProfiles(userProfiles);
      setLoading(false);
    }
    
    if (!loading) return;
    loadProfiles();
  }, [loading]);

  // Get display URL for avatar
  const getDisplayUrl = (profile: UserProfile) => {
    // Custom uploaded image takes priority
    if (profile.custom_avatar_url) return profile.custom_avatar_url;
    // Then avatar_url
    if (profile.avatar_url) return profile.avatar_url;
    // Default to first avatar
    return DEFAULT_AVATARS[0].url;
  };

  // Handle adding a new profile
  const handleAddProfile = async () => {
    if (!newProfileName.trim() || profiles.length >= MAX_PROFILES) return;
    
    setSaving(true);
    setError(null);
    
    // Use selected avatar
    const avatarToUse = selectedAvatarUrl;
    
    try {
      const result = await createUserProfile({
        name: newProfileName.trim(),
        custom_avatar_url: avatarToUse,
        is_main: profiles.length === 0,
      });
      
      if (result.error) {
        setError(result.error.message);
        setSaving(false);
        return;
      }
      
      if (result.profile) {
        setProfiles([...profiles, result.profile]);
        resetAddForm();
        setIsAddModalOpen(false);
      } else {
        setError('Failed to create profile. Please try again.');
        // Reload profiles
        const userProfiles = await getUserProfiles();
        setProfiles(userProfiles);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error creating profile:', err);
    }
    
    setSaving(false);
  };

  const resetAddForm = () => {
    setNewProfileName('');
    setSelectedAvatarUrl(DEFAULT_AVATARS[0].url);
    setError(null);
  };

  // Open edit modal
  const handleEditClick = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setEditProfileName(profile.name);
    // Use the profile's avatar_url or default
    setEditAvatarUrl(profile.avatar_url || DEFAULT_AVATARS[0].url);
    setEditPinLocation((profile as any).pin_location || '');
    setIsEditModalOpen(true);
  };

  // Handle editing a profile
  const handleEditProfile = async () => {
    if (!selectedProfile || !editProfileName.trim()) return;
    
    setSaving(true);
    const avatarToUse = editAvatarUrl;
    
    // Call the server action to update the profile
    const result = await updateUserProfile(selectedProfile.id, {
      name: editProfileName.trim(),
      custom_avatar_url: avatarToUse,
      pin_location: editPinLocation.trim() || null,
    });
    
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    
    // Update local state
    setProfiles(profiles.map(p => 
      p.id === selectedProfile.id 
        ? { 
            ...p, 
            name: editProfileName, 
            avatar_url: avatarToUse,
            pin_location: editPinLocation
          }
        : p
    ));
    
    setIsEditModalOpen(false);
    setSelectedProfile(null);
    setError(null);
    setSaving(false);
  };

  // Open delete modal
  const handleDeleteClick = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setIsDeleteModalOpen(true);
  };

  // Handle deleting a profile
  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    
    setSaving(true);
    await deleteUserProfile(selectedProfile.id);
    setProfiles(profiles.filter(p => p.id !== selectedProfile.id));
    setIsDeleteModalOpen(false);
    setSelectedProfile(null);
    setSaving(false);
  };

  // Handle continue - different behavior for onboarding vs profile switching
  const handleContinue = async () => {
    if (!selectedProfile) return;
    
    setSaving(true);
    
    // Set the selected profile as the default profile for recommendations
    await setDefaultProfile(selectedProfile.id);
    
    if (isOnboardingMode) {
      // For initial onboarding: proceed to taste picker
      await updateOnboardingStep('preferences');
      await refreshProfile();
      router.push('/taste');
    } else {
      // For profile switching: redirect to home
      await refreshProfile();
      router.push('/');
    }
    router.refresh();
  };

  // Handle profile selection - only highlights the profile without redirecting
  // Redirect only happens when clicking Continue button
  const handleProfileSelect = (profile: UserProfile) => {
    // Toggle selection - if already selected, deselect
    if (selectedProfile?.id === profile.id) {
      setSelectedProfile(null);
    } else {
      setSelectedProfile(profile);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-zinc-900/50 via-black to-black pointer-events-none" />
      
      {/* Netflix-style header */}
      <header className="relative z-10 px-6 md:px-12 py-6 md:py-8">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div 
            className="text-3xl md:text-4xl font-bold tracking-tight cursor-pointer"
            style={{ fontFamily: 'DEEPLY ROOTED' }}
            onClick={() => router.push('/')}
          >
            <span className="text-red-600">Invenio</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-6 md:px-12 pb-32">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12 md:mb-16 animate-[fadeIn_0.6s_ease-out]">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Who's watching?
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto">
              Add a profile for each person in your household to personalize your experience.
            </p>
          </div>

          {/* Profile Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-12">
            {/* Existing Profiles */}
            {profiles.map((profile, index) => (
              <div
                key={profile.id}
                className="group relative animate-[fadeInUp_0.5s_ease-out]"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'backwards'
                }}
              >
                <div 
                  onClick={() => handleProfileSelect(profile)}
                  className={`relative cursor-pointer group ${
                    selectedProfile?.id === profile.id 
                      ? 'ring-4 ring-red-600 ring-offset-4 ring-offset-black rounded-xl' 
                      : ''
                  }`}
                >
                  {/* Avatar Container */}
                  <div className="relative aspect-square mb-3 overflow-hidden rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(229,9,20,0.3)]">
                    <img 
                      src={getDisplayUrl(profile)}
                      alt={profile.name}
                      className="w-full h-full object-cover bg-zinc-800"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).src = DEFAULT_AVATARS[0].url;
                      }}
                    />
                    
                    {/* Selection Checkmark */}
                    {selectedProfile?.id === profile.id && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <PlayButton />
                    </div>
                  </div>

                  {/* Profile Name */}
                  <div className="text-center">
                    <h3 className={`font-medium text-sm md:text-base truncate transition-colors ${
                      selectedProfile?.id === profile.id 
                        ? 'text-red-500' 
                        : 'text-white group-hover:text-red-500'
                    }`}>
                      {profile.name}
                    </h3>
                    {profile.is_main && (
                      <span className="text-zinc-500 text-xs">Main Profile</span>
                    )}
                  </div>
                </div>

                {/* Edit/Delete Buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(profile);
                    }}
                    className="p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                    title="Edit profile"
                  >
                    <Pencil className="w-4 h-4 text-white" />
                  </button>
                  {!profile.is_main && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(profile);
                      }}
                      className="p-2 bg-black/60 rounded-full hover:bg-red-600/80 transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Profile Card */}
            {profiles.length < MAX_PROFILES && (
              <div 
                onClick={() => setIsAddModalOpen(true)}
                className="cursor-pointer group animate-[fadeInUp_0.5s_ease-out]"
                style={{ 
                  animationDelay: `${profiles.length * 0.1}s`,
                  animationFillMode: 'backwards'
                }}
              >
                <div className="aspect-square mb-3 rounded-xl border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 transition-all duration-300 flex items-center justify-center bg-zinc-900/30 group-hover:bg-zinc-900/50 group-hover:scale-105">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                    <Plus className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-zinc-500 group-hover:text-white text-sm font-medium transition-colors">
                    Add Profile
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Profile Limit */}
          <div className="text-center animate-[fadeIn_0.8s_ease-out_0.5s]" style={{ animationFillMode: 'backwards' }}>
            <p className="text-zinc-500 text-sm mb-6">
              {profiles.length} of {MAX_PROFILES} profiles used
            </p>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="max-w-5xl mx-auto flex justify-end items-center gap-4">
          {profiles.length > 0 && selectedProfile && (
            <Button
              onClick={handleContinue}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 px-8 py-6 text-lg font-semibold rounded-md transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue as {selectedProfile.name}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Custom Modal - Add Profile */}
      {isAddModalOpen && (
        <Modal onClose={() => { setIsAddModalOpen(false); resetAddForm(); }}>
          <div className="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <User className="w-6 h-6 text-red-500" />
                Add Profile
              </h2>
              <button 
                onClick={() => { setIsAddModalOpen(false); resetAddForm(); }}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-zinc-400 mb-6">
              Create a new profile for someone in your household.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="newProfileName" className="text-zinc-300">Name</Label>
                <Input
                  id="newProfileName"
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Enter name"
                  maxLength={20}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  autoFocus
                />
              </div>

              {/* Avatar Selection */}
              <div className="space-y-3">
                <Label className="text-zinc-300">Choose a 3D avatar</Label>
                <div className="grid grid-cols-3 gap-3">
                  {DEFAULT_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarUrl(avatar.url)}
                      className={`aspect-square rounded-lg flex items-center justify-center overflow-hidden transition-all duration-200 ${
                        selectedAvatarUrl === avatar.url 
                          ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-900 scale-105' 
                          : 'hover:scale-105 bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      <img 
                        src={avatar.url} 
                        alt={avatar.label}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => { setIsAddModalOpen(false); resetAddForm(); }}
                className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProfile}
                disabled={saving || !newProfileName.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Profile'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Custom Modal - Edit Profile */}
      {isEditModalOpen && selectedProfile && (
        <Modal onClose={() => setIsEditModalOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Pencil className="w-6 h-6 text-red-500" />
                Edit Profile
              </h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Preview */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-zinc-700">
                <img 
                  src={editCustomImageUrl || editAvatarUrl} 
                  alt="Preview"
                  className="w-full h-full object-cover bg-zinc-800"
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="editProfileName" className="text-zinc-300">Name</Label>
                <Input
                  id="editProfileName"
                  type="text"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  placeholder="Enter name"
                  maxLength={20}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              {/* Avatar Selection */}
              <div className="space-y-3">
                  <Label className="text-zinc-300">Choose a 3D avatar</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {DEFAULT_AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setEditAvatarUrl(avatar.url)}
                        className={`aspect-square rounded-lg flex items-center justify-center overflow-hidden transition-all duration-200 ${
                          editAvatarUrl === avatar.url 
                            ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-900 scale-105' 
                            : 'hover:scale-105 bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        <img 
                          src={avatar.url} 
                          alt={avatar.label}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

              {/* Pin Location Input */}
              <div className="space-y-2">
                <Label htmlFor="editPinLocation" className="text-zinc-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Pin Location
                </Label>
                <Input
                  id="editPinLocation"
                  type="text"
                  value={editPinLocation}
                  onChange={(e) => setEditPinLocation(e.target.value)}
                  placeholder="e.g., Living Room, Bedroom"
                  maxLength={50}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <p className="text-zinc-500 text-xs">
                  Set a location name to help identify this profile's primary viewing area
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditProfile}
                disabled={saving || !editProfileName.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Custom Modal - Delete Profile */}
      {isDeleteModalOpen && selectedProfile && (
        <Modal onClose={() => setIsDeleteModalOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-red-500" />
                Delete Profile
              </h2>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-zinc-400 mb-6">
              Are you sure you want to delete "{selectedProfile.name}"? This action cannot be undone.
            </p>
            
            <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img 
                  src={getDisplayUrl(selectedProfile)} 
                  alt={selectedProfile.name}
                  className="w-full h-full object-cover bg-zinc-700"
                />
              </div>
              <div>
                <p className="font-medium">{selectedProfile.name}</p>
                <p className="text-sm text-zinc-500">This profile will be permanently deleted</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteProfile}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Profile'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Custom Modal Component
function Modal({ 
  children, 
  onClose 
}: { 
  children: React.ReactNode; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />
      <div className="relative z-10 animate-[scaleIn_0.3s_ease-out]">
        {children}
      </div>
    </div>
  );
}

// Play button component for profile hover
function PlayButton() {
  return (
    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75">
      <svg 
        viewBox="0 0 24 24" 
        fill="white" 
        className="w-6 h-6 ml-1"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}
