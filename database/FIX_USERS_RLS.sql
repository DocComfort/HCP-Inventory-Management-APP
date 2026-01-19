-- Fix infinite recursion in users table RLS
-- The issue: users_select_org policy calls is_org_member() which may trigger recursive policy evaluation

-- Step 1: Disable RLS on users table temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop problematic policies
DROP POLICY IF EXISTS "users_select_org" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_self_profile" ON public.users;

-- Step 3: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simpler, non-recursive policies
-- Allow users to read users from their own organization (simple check, no function call)
CREATE POLICY "users_select_self_org"
ON public.users
FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

-- Only service role (backend) can insert
CREATE POLICY "users_insert_service"
ON public.users
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Only service role (backend) can update
CREATE POLICY "users_update_service"
ON public.users
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Only service role (backend) can delete
CREATE POLICY "users_delete_service"
ON public.users
FOR DELETE
USING (auth.role() = 'service_role');

-- Allow user to update limited fields in their own profile
CREATE POLICY "users_update_self"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- Ensure they can't change their organization_id or role
  AND organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
  AND role = (
    SELECT role FROM public.users WHERE id = auth.uid()
  )
);
