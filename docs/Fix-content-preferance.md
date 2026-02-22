# Fix: `content_preferences` Save Failing on `/taste` Page

## Context
This is a Next.js 16 (Turbopack) app. The onboarding page at `app/(onboarding)/taste/page.tsx` lets users select 6 movies/TV shows, then saves them to a Supabase table called `content_preferences` via a server action `addContentPreferences()` in `app/actions/auth.ts`.

The save silently fails — the error caught is an empty object `{}`.

---

## What You Need to Do

### Step 1 — Find the server action
Open the file: `app/actions/auth.ts`

Find the function: `addContentPreferences`

It likely looks something like this:
```typescript
export async function addContentPreferences(preferences: {...}[]) {
  try {
    const { error } = await supabase.from('content_preferences').insert(preferences);
    if (error) return { success: false, error };
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}
```

---

### Step 2 — Add better error logging
In `app/(onboarding)/taste/page.tsx`, find the `handleDone` function and update the catch block so you can see the real error:

**Find this:**
```typescript
} catch (err) {
  console.error('Error saving preferences:', err);
  setError('Failed to save preferences. Please try again.');
}
```

**Replace with:**
```typescript
} catch (err: any) {
  console.error('Error saving preferences - message:', err?.message);
  console.error('Error saving preferences - status:', err?.status);
  console.error('Error saving preferences - code:', err?.code);
  console.error('Error saving preferences - full:', JSON.stringify(err));
  setError('Failed to save preferences. Please try again.');
}
```

Also add this right after the `addContentPreferences` call:
```typescript
const result = await addContentPreferences(preferences);
console.log('addContentPreferences result:', JSON.stringify(result)); // ADD THIS
```

---

### Step 3 — Most likely causes and fixes

#### Cause A: Supabase Row Level Security (RLS) is blocking the insert
This is the **most common cause** of a silent `{}` error from Supabase.

**Check:** Go to your Supabase dashboard → Table Editor → `content_preferences` → RLS Policies.

**Fix:** Make sure there is an INSERT policy that allows authenticated users to insert their own rows. Example policy:
```sql
CREATE POLICY "Users can insert their own preferences"
ON content_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

Also make sure RLS is enabled AND that the policy exists. If there's no policy but RLS is on, all inserts will be blocked silently.

---

#### Cause B: `profile_id` is null and the column doesn't allow null
The page sends:
```typescript
profile_id: selectedProfileId || undefined,
```

If `selectedProfileId` is `null` (profiles failed to load) and `profile_id` is a required foreign key in the DB, the insert will fail.

**Fix Option 1:** Make `profile_id` nullable in the DB if it's optional.

**Fix Option 2:** Guard the save — don't allow saving if `selectedProfileId` is null:
```typescript
if (!selectedProfileId) {
  setError('Could not load your profile. Please refresh and try again.');
  return;
}
```

---

#### Cause C: User is not authenticated when the action runs
The server action may be trying to get the user session, and it's expired or missing.

**Fix:** In `addContentPreferences`, log the session:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
console.log('User in action:', user?.id, 'Auth error:', authError);
```

If user is null, the session has expired. Add session refresh logic or redirect to login.

---

#### Cause D: Table schema mismatch
The code sends these fields:
```typescript
{
  tmdb_id: number,
  content_type: 'movie' | 'tv',
  liked: true,
  profile_id: string | undefined,
}
```

**Check:** Make sure the `content_preferences` table in Supabase has exactly these column names. A mismatch (e.g., column is named `media_type` instead of `content_type`) causes a silent failure.

**Fix:** Run this in Supabase SQL editor to check columns:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'content_preferences';
```

Make sure every field being inserted matches a column name exactly.

---

### Step 4 — After finding the real error
Once Step 2 logging reveals the actual error message/code, apply the matching fix from Step 3.

Then remove the debug `console.log` lines you added in Step 2.

---

## Files Involved
| File | Purpose |
|------|---------|
| `app/(onboarding)/taste/page.tsx` | UI — calls `addContentPreferences` in `handleDone()` around line 140 |
| `app/actions/auth.ts` | Server action — `addContentPreferences`, `completeOnboarding`, `getUserProfiles` |
| Supabase Dashboard | Check RLS policies and table schema for `content_preferences` |

---

## Summary of Most Likely Fix
> Go to Supabase → Authentication → Policies → `content_preferences` table → Add an INSERT policy for authenticated users. This is the #1 cause of silent `{}` errors from Supabase.