import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * API endpoint to check onboarding status
 * Returns whether the user has completed onboarding
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get profile to check onboarding status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
    
    const onboardingCompleted = profile?.onboarding_completed ?? false;
    
    return NextResponse.json({
      onboardingCompleted,
      onboardingStep: profile?.onboarding_step ?? 'pending',
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
