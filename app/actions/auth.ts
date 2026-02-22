"use server";

/**
 * Authentication Actions
 * Server-side functions for sign-up, sign-in, sign-out, and profile management
 * These functions are called from client components via Server Actions
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import type {
  SignUpCredentials,
  SignInCredentials,
  UpdateProfileData,
  CreateUserProfileData,
  ContentPreferenceInput,
  AddProfileFavoriteInput,
  AuthResult,
  OnboardingStatus,
  Profile,
  UserProfile,
  ContentPreference,
  ProfileFavorite,
} from '@/lib/auth-types';
import { AUTH_ERRORS } from '@/lib/auth-types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the redirect URL for email confirmation
 */
function getEmailRedirectUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    'http://localhost:3000';
  return `${baseUrl}/auth/callback`;
}

/**
 * Map Supabase auth errors to user-friendly messages
 */
function mapAuthError(error: Error | null): string {
  if (!error) return 'Unknown error';
  
  const message = error.message.toLowerCase();
  
  if (message.includes('invalid login credentials')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  if (message.includes('user already registered')) {
    return AUTH_ERRORS.USER_EXISTS;
  }
  if (message.includes('password')) {
    return AUTH_ERRORS.WEAK_PASSWORD;
  }
  if (message.includes('email not confirmed')) {
    return AUTH_ERRORS.EMAIL_NOT_CONFIRMED;
  }
  
  return AUTH_ERRORS.UNKNOWN_ERROR;
}

// ============================================================================
// Authentication Actions
// ============================================================================

/**
 * Sign up with email OTP (One-Time Password)
 * Creates user with password and sends an 8-digit verification code to their email
 */
export async function signUpWithOTP(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();
  
  // Validate password strength
  if (password.length < 8 || password.length > 60) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.WEAK_PASSWORD),
    };
  }
  // Password must contain at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.WEAK_PASSWORD),
    };
  }

  // First, check if user with this email already exists in auth system
  // Note: This uses admin API which may not be available in all Supabase setups
  // Fall back to relying on Supabase's built-in duplicate email protection
  let existingUsers = null;
  try {
    const { data, error: fetchError } = await supabase.auth.admin.listUsers({
      email,
      limit: 1,
    });

    if (!fetchError) {
      existingUsers = data;
    }
  } catch (adminError) {
    console.log('Admin API not available, relying on Supabase built-in checks');
  }

  if (existingUsers?.users.length > 0) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.USER_EXISTS),
    };
  }

  // Also check if profile with this email exists in our database
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (existingProfile) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.USER_EXISTS),
    };
  }
  
  // First, create the user with password
  // Use emailConfirmTo false so we can send OTP instead
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
      // Set data to track this is OTP signup
      data: {
        signup_method: 'email_otp',
      },
    },
  });
  
  if (error) {
    // Check if user already exists
    if (error.message.includes('User already registered')) {
      return {
        user: null,
        session: null,
        profile: null,
        error: new Error(AUTH_ERRORS.USER_EXISTS),
      };
    }
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(mapAuthError(error)),
    };
  }
  
  // User created - now send OTP for verification
  // Even if email confirmation was sent, we'll also send OTP
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Don't create new user - user already exists
      shouldCreateUser: false,
    },
  });
  
  if (otpError) {
    console.error('Error sending OTP:', otpError);
    // Continue anyway - user was created successfully
  }
  
  // Return success - user needs to verify with OTP
  return {
    user: null,
    session: null,
    profile: null,
    error: null,
  };
}

/**
 * Verify email with OTP code
 * After user enters the 8-digit code, this creates their account
 */
export async function verifyEmailOTP(email: string, token: string): Promise<AuthResult> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  
  if (error) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(mapAuthError(error)),
    };
  }
  
  // Check if we got a valid session
  if (!data.session) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error('Invalid verification code'),
    };
  }
  
  // Create the user profile
  let profile: Profile | null = null;
  if (data.user) {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (existingProfile) {
      profile = existingProfile;
    } else {
      // Create profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || null,
          avatar_url: data.user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        profile = newProfile;
      }
    }
  }
  
  return {
    user: data.user,
    session: data.session,
    profile,
    error: null,
  };
}

/**
 * Resend OTP to user's email
 */
export async function resendOTP(email: string): Promise<{ error: Error | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  
  if (error) {
    return { error: new Error(mapAuthError(error)) };
  }
  
  return { error: null };
}

/**
 * Send password reset email
 * User receives an email with a link to reset their password
 */
export async function forgotPassword(email: string): Promise<{ error: Error | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || 'http://localhost:3000'}/reset-password`,
  });
  
  if (error) {
    return { error: new Error(mapAuthError(error)) };
  }
  
  return { error: null };
}

/**
 * Reset password using the token from email
 * This is called after user clicks the reset password link
 */
export async function resetPassword(newPassword: string): Promise<{ error: Error | null }> {
  const supabase = await createClient();
  
  // Validate password strength
  if (newPassword.length < 8 || newPassword.length > 60) {
    return { error: new Error(AUTH_ERRORS.WEAK_PASSWORD) };
  }
  // Password must contain at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  if (!hasLetter || !hasNumber) {
    return { error: new Error(AUTH_ERRORS.WEAK_PASSWORD) };
  }
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) {
    return { error: new Error(mapAuthError(error)) };
  }
  
  return { error: null };
}

/**
 * Sign up a new user (legacy - uses email confirmation link)
 * Creates a Supabase auth user and manually creates profile in public.profiles
 * (Note: Cannot use trigger on auth.users due to ownership requirements)
 */
export async function signUp(credentials: SignUpCredentials): Promise<AuthResult> {
  const supabase = await createClient();
  
  const { email, password, options } = credentials;
  
  // Validate password strength
  if (password.length < 8 || password.length > 60) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.WEAK_PASSWORD),
    };
  }
  // Password must contain at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.WEAK_PASSWORD),
    };
  }

  // Check if user with this email already exists in auth system
  // Note: This uses admin API which may not be available in all Supabase setups
  // Fall back to relying on Supabase's built-in duplicate email protection
  let existingUsers = null;
  try {
    const { data, error: fetchError } = await supabase.auth.admin.listUsers({
      email,
      limit: 1,
    });

    if (!fetchError) {
      existingUsers = data;
    }
  } catch (adminError) {
    console.log('Admin API not available, relying on Supabase built-in checks');
  }

  if (existingUsers?.users.length > 0) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.USER_EXISTS),
    };
  }

  // Also check if profile with this email exists in our database
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (existingProfile) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.USER_EXISTS),
    };
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
      data: {
        full_name: options?.data?.full_name || '',
        ...options?.data,
      },
    },
  });
  
  if (error) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(mapAuthError(error)),
    };
  }
  
  // Manually create the profile since trigger on auth.users requires owner privileges
  // Profile creation via trigger is not possible in Supabase for non-owner users
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
      });
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Return error to user - they won't be able to use the app without a profile
      return {
        user: data.user,
        session: null,
        profile: null,
        error: new Error('Failed to create user profile. Please contact support or try signing in.'),
      };
    }
  }
  
  // Fetch the created profile
  let profile: Profile | null = null;
  if (data.user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    profile = profileData;
  }
  
  return {
    user: data.user,
    session: data.session,
    profile,
    error: null,
  };
}

/**
 * Sign in an existing user
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResult> {
  const supabase = await createClient();
  
  const { email, password } = credentials;

  // Basic validation
  if (!email || !password) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.INVALID_CREDENTIALS),
    };
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(mapAuthError(error)),
    };
  }

  // Check if email is verified
  if (data.user && !data.user.email_confirmed_at) {
    // Sign out the user immediately if email not confirmed
    await supabase.auth.signOut();
    return {
      user: null,
      session: null,
      profile: null,
      error: new Error(AUTH_ERRORS.EMAIL_NOT_CONFIRMED),
    };
  }
  
  // Fetch the user's profile
  let profile: Profile | null = null;
  if (data.user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    profile = profileData;
  }
  
  return {
    user: data.user,
    session: data.session,
    profile,
    error: null,
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error };
  }
  
  // Redirect to home after sign out
  redirect('/');
}

/**
 * Get the current authenticated user
 */
export async function getAuthenticatedUser(): Promise<{ 
  user: Profile | null; 
  session: import('@supabase/supabase-js').Session | null;
}> {
  const supabase = await createClient();
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { user: null, session: null };
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  return { 
    user: profile, 
    session 
  };
}

/**
 * Get onboarding status for the current user
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus | null> {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser();
  
  if (!user) {
    return null;
  }
  
  // Get profile count
  const { count: profileCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  
  // Get preferences count
  const { count: preferencesCount } = await supabase
    .from('content_preferences')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('liked', 'is', null);
  
  return {
    step: user.onboarding_step,
    completed: user.onboarding_completed,
    profileCount: profileCount || 0,
    preferencesCount: preferencesCount || 0,
  };
}

// ============================================================================
// Profile Actions
// ============================================================================

/**
 * Update the user's profile
 */
export async function updateProfile(data: UpdateProfileData): Promise<{ 
  profile: Profile | null; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      profile: null, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) {
    return { profile: null, error };
  }
  
  revalidatePath('/onboarding');
  revalidatePath('/profile');
  
  return { profile, error: null };
}

/**
 * Update account information (username, full name, bio, language)
 * Used in the account settings page
 */
export async function updateAccountInfo(data: {
  username?: string;
  fullName?: string;
  bio?: string;
  language?: string;
}): Promise<{ success: boolean; error: string | null; profile?: Profile }> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: AUTH_ERRORS.SESSION_EXPIRED };
  }
  
  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (data.username !== undefined) {
    // Validate username format
    const username = data.username.trim().toLowerCase();
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      return { 
        success: false, 
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
      };
    }
    updateData.username = username || null;
  }
  
  if (data.fullName !== undefined) {
    updateData.full_name = data.fullName.trim() || null;
  }
  
  if (data.bio !== undefined) {
    updateData.bio = data.bio.trim() || null;
  }
  
  if (data.language !== undefined) {
    updateData.language = data.language;
  }
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) {
    console.error('[updateAccountInfo] Error updating profile:', error);
    
    // Handle unique constraint violation for username
    if (error.code === '23505' && error.message.includes('username')) {
      return { success: false, error: 'This username is already taken' };
    }
    
    return { success: false, error: error.message };
  }
  
  revalidatePath('/account');
  revalidatePath('/profile');
  
  return { success: true, error: null, profile };
}

/**
 * Update onboarding step
 */
export async function updateOnboardingStep(step: UpdateProfileData['onboarding_step']): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const result = await updateProfile({ onboarding_step: step });
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  return { success: true, error: null };
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log('[completeOnboarding] User check:', { userId: user?.id });
  
  if (!user) {
    console.error('[completeOnboarding] No user found');
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  // Only update fields that exist in the database schema
  const { error } = await supabase
    .from('profiles')
    .update({
      current_step: 'completed',
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  
  if (error) {
    // Ensure we always return a proper Error object
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(error.message || 'Database error') 
    };
  }
  
  revalidatePath('/onboarding');
  revalidatePath('/browse');
  
  return { success: true, error: null };
  
  revalidatePath('/onboarding');
  revalidatePath('/browse');
  
  return { success: true, error: null };
}

/**
 * Set the default profile for the user (used during onboarding)
 * This marks the selected profile as the one to receive content recommendations
 */
export async function setDefaultProfile(profileId: string): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  // Update the profiles table with the default profile ID
  const { error } = await supabase
    .from('profiles')
    .update({
      default_profile_id: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  
  if (error) {
    return { success: false, error };
  }
  
  revalidatePath('/onboarding');
  revalidatePath('/profiles');
  
  return { success: true, error: null };
}

// ============================================================================
// User Profiles Actions (Household Profiles)
// ============================================================================

/**
 * Create a new user profile
 */
// Default avatar URLs
const FAMILY_AVATARS = [
  { id: 'teen_boy', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=teenboy&backgroundType=gradient&backgroundColor=ffd5dc' },
  { id: 'teen_girl', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=teengirl&backgroundType=gradient&backgroundColor=ffd5dc' },
  { id: 'father', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=father&backgroundType=gradient&backgroundColor=b6e3f4' },
  { id: 'mother', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=mother&backgroundType=gradient&backgroundColor=ffd5dc' },
  { id: 'grandfather', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=grandpa&backgroundType=gradient&backgroundColor=c0aede' },
  { id: 'grandmother', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=grandma&backgroundType=gradient&backgroundColor=ffd5dc' },
];

export async function createUserProfile(data: CreateUserProfileData): Promise<{ 
  profile: UserProfile | null; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      profile: null, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }

  // Check if user has a profile record - if not, create one
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingProfile) {
    // Create the user's profile first
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return { 
        profile: null, 
        error: new Error('Failed to create user profile. Please sign out and sign in again.') 
      };
    }
  }
  
  // Check if user has reached max profiles
  const { count } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  
  if (count !== null && count >= 5) {
    return { 
      profile: null, 
      error: new Error('Maximum of 5 profiles allowed') 
    };
  }
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: user.id,
      name: data.name,
      avatar_url: data.custom_avatar_url || FAMILY_AVATARS[0]?.url || null,
      is_main: data.is_main || count === 0,
    })
    .select()
    .single();
  
  if (error) {
    return { profile: null, error };
  }
  
  revalidatePath('/onboarding');
  
  return { profile, error: null };
}

/**
 * Get all user profiles for the current user
 */
export async function getUserProfiles(): Promise<UserProfile[]> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  console.log('[getUserProfiles] Auth check:', { 
    userId: user?.id, 
    authError: authError?.message 
  });
  
  if (!user) {
    console.log('[getUserProfiles] No user found, returning empty array');
    return [];
  }

  // Get profiles with all fields including is_active
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, user_id, name, avatar_url, custom_avatar_url, is_main, is_active, pin_location, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  
  console.log('[getUserProfiles] Query result:', { 
    profileCount: profiles?.length || 0, 
    error: error?.message,
    profiles: profiles?.map(p => ({ id: p.id, name: p.name }))
  });
  
  if (error) {
    console.error('[getUserProfiles] Error fetching profiles:', error);
    return [];
  }
  
  return (profiles || []).map(p => ({
    ...p,
    avatar_style: 'default' as const,
    avatar_color: '',
    pin_hash: null,
    is_locked: false,
    preferences: {},
    onboarding_step: 'pending' as const,
    pin_location: p.pin_location || null
  }));
}

/**
 * Update a user profile
 */
export async function updateUserProfile(
  profileId: string, 
  data: Partial<CreateUserProfileData>
): Promise<{ 
  profile: UserProfile | null; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Build update object - filter out undefined values and handle pin
  const updateData: Record<string, unknown> = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.custom_avatar_url !== undefined) updateData.custom_avatar_url = data.custom_avatar_url;
  if (data.avatar_style !== undefined) updateData.avatar_style = data.avatar_style;
  if (data.is_main !== undefined) updateData.is_main = data.is_main;
  if (data.is_locked !== undefined) updateData.is_locked = data.is_locked;
  if (data.pin_location !== undefined) updateData.pin_location = data.pin_location;
  
  // Handle PIN - hash it if provided
  if (data.pin !== undefined && data.pin !== null && data.pin !== '') {
    // Simple hash for PIN (in production use proper hashing)
    const encoder = new TextEncoder();
    const data_ = encoder.encode(data.pin);
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data_.length; i++) {
      hash = ((hash << 5) - hash) + data_[i];
      hash = hash & hash;
    }
    updateData.pin_hash = hash.toString(16);
    updateData.is_locked = true;
  }
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select()
    .single();
  
  if (error) {
    return { profile: null, error };
  }
  
  revalidatePath('/onboarding');
  revalidatePath('/profiles');
  
  return { profile, error: null };
}

/**
 * Delete a user profile
 */
export async function deleteUserProfile(profileId: string): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', profileId);
  
  if (error) {
    return { success: false, error };
  }
  
  revalidatePath('/onboarding');
  
  return { success: true, error: null };
}

/**
 * Set the active profile for the current user
 * This updates the is_active field on user_profiles to track which profile is currently in use
 */
export async function setActiveProfile(profileId: string): Promise<{ 
  success: boolean; 
  profile: UserProfile | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      success: false, 
      profile: null,
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  // First, verify the profile belongs to this user
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id, user_id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single();
  
  if (!existingProfile) {
    return { 
      success: false, 
      profile: null,
      error: new Error('Profile not found or does not belong to user') 
    };
  }
  
  // Set all profiles to inactive for this user
  const { error: updateAllError } = await supabase
    .from('user_profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  
  if (updateAllError) {
    console.error('Error deactivating profiles:', updateAllError);
    return { 
      success: false, 
      profile: null,
      error: updateAllError 
    };
  }
  
  // Set selected profile to active
  const { data: updatedProfile, error: updateError } = await supabase
    .from('user_profiles')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error activating profile:', updateError);
    return { 
      success: false, 
      profile: null,
      error: updateError 
    };
  }
  
  revalidatePath('/onboarding');
  revalidatePath('/profiles');
  revalidatePath('/');
  
  return { 
    success: true, 
    profile: updatedProfile,
    error: null 
  };
}

/**
 * Get the active profile for the current user
 * Falls back to main profile or first profile if no active profile is set
 */
export async function getActiveProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  // First try to get the active profile
  const { data: activeProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();
  
  if (activeProfile) {
    return activeProfile;
  }
  
  // Fall back to main profile
  const { data: mainProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_main', true)
    .single();
  
  if (mainProfile) {
    // Set this profile as active for future requests
    await supabase
      .from('user_profiles')
      .update({ is_active: true })
      .eq('id', mainProfile.id);
    return mainProfile;
  }
  
  // Fall back to first profile
  const { data: firstProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  
  if (firstProfile) {
    // Set this profile as active for future requests
    await supabase
      .from('user_profiles')
      .update({ is_active: true })
      .eq('id', firstProfile.id);
    return firstProfile;
  }
  
  return null;
}

// ============================================================================
// Content Preferences Actions
// ============================================================================

/**
 * Add content preferences (multiple at once)
 */
export async function addContentPreferences(
  preferences: ContentPreferenceInput[]
): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Get current user with logging for debugging
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  console.log('[addContentPreferences] User auth check:', { userId: user?.id, authError });
  
  if (!user) {
    console.error('[addContentPreferences] No user found, authError:', authError);
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  console.log('[addContentPreferences] Inserting preferences:', JSON.stringify(preferences));
  
  const { error } = await supabase
    .from('content_preferences')
    .upsert(
      preferences.map(p => ({
        user_id: user.id,
        profile_id: p.profile_id || null,
        tmdb_id: p.tmdb_id,
        content_type: p.content_type,
        liked: p.liked,
        source: 'onboarding',
      })),
      { onConflict: 'user_id,tmdb_id' }
    );
  
  if (error) {
    console.error('[addContentPreferences] Database error:', error);
    // Ensure we always return a proper Error object
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(error.message || 'Database error') 
    };
  }
  
  return { success: true, error: null };
}

/**
 * Get content preferences for the current user
 */
export async function getContentPreferences(): Promise<ContentPreference[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  const { data: preferences } = await supabase
    .from('content_preferences')
    .select('*')
    .eq('user_id', user.id)
    .not('liked', 'is', null)
    .order('created_at', { ascending: false });
  
  return preferences || [];
}

// ============================================================================
// Watchlist Actions
// ============================================================================

/**
 * Add to watchlist
 */
export async function addToWatchlist(
  tmdbId: number, 
  contentType: 'movie' | 'tv'
): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  const { error } = await supabase
    .from('watchlist')
    .insert({
      user_id: user.id,
      tmdb_id: tmdbId,
      content_type: contentType,
    });
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true, error: null };
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(
  tmdbId: number
): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdbId);
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true, error: null };
}

/**
 * Get user's watchlist
 */
export async function getWatchlist(): Promise<import('@/lib/auth-types').WatchlistItem[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  return watchlist || [];
}

// ============================================================================
// Password Reset Actions
// ============================================================================

/**
 * Request a password reset email
 */
export async function requestPasswordReset(email: string): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL}/auth/reset-password`,
  });
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true, error: null };
}

/**
 * Update password (when user has a valid session)
 */
export async function updatePassword(newPassword: string): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) {
    return { success: false, error: new Error(mapAuthError(error)) };
  }
  
  return { success: true, error: null };
}

// ============================================================================
// Profile Favorites Actions
// ============================================================================

/**
 * Add multiple favorites for a profile during onboarding
 * This is used when users select their favorite movies/TV shows
 */
export async function addProfileFavorites(
  favorites: AddProfileFavoriteInput[]
): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  try {
    // Prepare favorites data
    const favoritesData = favorites.map(f => ({
      user_id: user.id,
      profile_id: f.profile_id,
      tmdb_id: f.tmdb_id,
      content_type: f.content_type,
      title: f.title,
      poster_path: f.poster_path || null,
      release_year: f.release_year || null,
    }));
    
    // Insert favorites (using upsert to handle duplicates)
    const { error } = await supabase
      .from('profile_favorites')
      .upsert(
        favoritesData,
        { onConflict: 'profile_id,tmdb_id' }
      );
    
    if (error) {
      console.error('Error adding profile favorites:', error);
      return { success: false, error };
    }
    
    // Also sync to content_preferences for recommendations
    const preferencesData = favorites.map(f => ({
      user_id: user.id,
      profile_id: f.profile_id,
      tmdb_id: f.tmdb_id,
      content_type: f.content_type,
      liked: true,
      source: 'onboarding',
    }));
    
    await supabase
      .from('content_preferences')
      .upsert(
        preferencesData,
        { onConflict: 'user_id,tmdb_id' }
      );
    
    return { success: true, error: null };
  } catch (err) {
    console.error('Error in addProfileFavorites:', err);
    return { success: false, error: err as Error };
  }
}

/**
 * Get favorites for a specific profile
 */
export async function getProfileFavorites(
  profileId: string
): Promise<ProfileFavorite[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  // First verify the profile belongs to this user
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('id', profileId)
    .single();
  
  if (!profile || profile.user_id !== user.id) {
    return [];
  }
  
  const { data: favorites } = await supabase
    .from('profile_favorites')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  
  return favorites || [];
}

/**
 * Add a single favorite to a profile
 */
export async function addFavorite(
  profileId: string,
  tmdbId: number,
  contentType: 'movie' | 'tv',
  title: string,
  posterPath?: string,
  releaseYear?: string
): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  // Verify profile belongs to user
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('id', profileId)
    .single();
  
  if (!profile || profile.user_id !== user.id) {
    return { 
      success: false, 
      error: new Error('Invalid profile') 
    };
  }
  
  const { error } = await supabase
    .from('profile_favorites')
    .upsert({
      user_id: user.id,
      profile_id: profileId,
      tmdb_id: tmdbId,
      content_type: contentType,
      title,
      poster_path: posterPath || null,
      release_year: releaseYear || null,
    }, { onConflict: 'profile_id,tmdb_id' });
  
  if (error) {
    return { success: false, error };
  }
  
  // Also update content_preferences
  await supabase
    .from('content_preferences')
    .upsert({
      user_id: user.id,
      profile_id: profileId,
      tmdb_id: tmdbId,
      content_type: contentType,
      liked: true,
      source: 'favorite',
    }, { onConflict: 'user_id,tmdb_id' });
  
  return { success: true, error: null };
}

/**
 * Remove a favorite from a profile
 */
export async function removeFavorite(
  profileId: string,
  tmdbId: number
): Promise<{ 
  success: boolean; 
  error: Error | null;
}> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      success: false, 
      error: new Error(AUTH_ERRORS.SESSION_EXPIRED) 
    };
  }
  
  // Verify profile belongs to user
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('id', profileId)
    .single();
  
  if (!profile || profile.user_id !== user.id) {
    return { 
      success: false, 
      error: new Error('Invalid profile') 
    };
  }
  
  const { error } = await supabase
    .from('profile_favorites')
    .delete()
    .eq('profile_id', profileId)
    .eq('tmdb_id', tmdbId);
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true, error: null };
}
