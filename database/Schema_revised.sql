-- =========================================================
-- HCP / QBD SAFE RLS POLICIES (ROLE-SEPARATED)
-- Re-runnable migration
-- =========================================================

-- -------------------------
-- 1) Helper functions
-- -------------------------
-- Get current user's organization_id (or NULL if not mapped yet)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.organization_id
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

-- Role checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin','manager')
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org IS NOT NULL AND org = public.current_org_id()
$$;


-- -------------------------
-- 2) Drop existing policies (idempotent)
-- -------------------------
-- organizations
DROP POLICY IF EXISTS "org_select_member" ON public.organizations;
DROP POLICY IF EXISTS "org_insert_admin" ON public.organizations;
DROP POLICY IF EXISTS "org_update_admin" ON public.organizations;
DROP POLICY IF EXISTS "org_delete_admin" ON public.organizations;

-- users
DROP POLICY IF EXISTS "users_select_org" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_self_profile" ON public.users;

-- vendors
DROP POLICY IF EXISTS "vendors_select_org" ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert_mgr" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update_mgr" ON public.vendors;
DROP POLICY IF EXISTS "vendors_delete_mgr" ON public.vendors;

-- locations
DROP POLICY IF EXISTS "locations_select_org" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_mgr" ON public.locations;
DROP POLICY IF EXISTS "locations_update_mgr" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_mgr" ON public.locations;

-- inventory_items
DROP POLICY IF EXISTS "items_select_org" ON public.inventory_items;
DROP POLICY IF EXISTS "items_insert_mgr" ON public.inventory_items;
DROP POLICY IF EXISTS "items_update_mgr" ON public.inventory_items;
DROP POLICY IF EXISTS "items_delete_mgr" ON public.inventory_items;

-- location_stock
DROP POLICY IF EXISTS "stock_select_org" ON public.location_stock;
DROP POLICY IF EXISTS "stock_insert_mgr" ON public.location_stock;
DROP POLICY IF EXISTS "stock_update_tech_or_mgr" ON public.location_stock;
DROP POLICY IF EXISTS "stock_delete_mgr" ON public.location_stock;

-- transfer_requests
DROP POLICY IF EXISTS "transfers_select_org" ON public.transfer_requests;
DROP POLICY IF EXISTS "transfers_insert_tech_or_mgr" ON public.transfer_requests;
DROP POLICY IF EXISTS "transfers_update_mgr" ON public.transfer_requests;
DROP POLICY IF EXISTS "transfers_delete_mgr" ON public.transfer_requests;

-- purchase_orders
DROP POLICY IF EXISTS "po_select_org" ON public.purchase_orders;
DROP POLICY IF EXISTS "po_insert_mgr" ON public.purchase_orders;
DROP POLICY IF EXISTS "po_update_mgr" ON public.purchase_orders;
DROP POLICY IF EXISTS "po_delete_mgr" ON public.purchase_orders;

-- po_line_items
DROP POLICY IF EXISTS "po_lines_select_org" ON public.po_line_items;
DROP POLICY IF EXISTS "po_lines_insert_mgr" ON public.po_line_items;
DROP POLICY IF EXISTS "po_lines_update_mgr" ON public.po_line_items;
DROP POLICY IF EXISTS "po_lines_delete_mgr" ON public.po_line_items;

-- oauth_tokens (sensitive)
DROP POLICY IF EXISTS "tokens_select_admin" ON public.oauth_tokens;
DROP POLICY IF EXISTS "tokens_insert_admin" ON public.oauth_tokens;
DROP POLICY IF EXISTS "tokens_update_admin" ON public.oauth_tokens;
DROP POLICY IF EXISTS "tokens_delete_admin" ON public.oauth_tokens;

-- sync_logs (sensitive-ish, but viewable by mgr/admin)
DROP POLICY IF EXISTS "sync_select_mgr" ON public.sync_logs;
DROP POLICY IF EXISTS "sync_insert_admin" ON public.sync_logs;
DROP POLICY IF EXISTS "sync_update_admin" ON public.sync_logs;
DROP POLICY IF EXISTS "sync_delete_admin" ON public.sync_logs;

-- qbwc_queue (QBD sync queue - sensitive)
DROP POLICY IF EXISTS "qbwc_select_admin" ON public.qbwc_queue;
DROP POLICY IF EXISTS "qbwc_insert_admin" ON public.qbwc_queue;
DROP POLICY IF EXISTS "qbwc_update_admin" ON public.qbwc_queue;
DROP POLICY IF EXISTS "qbwc_delete_admin" ON public.qbwc_queue;

-- webhook_events (HCP/QBO webhooks - sensitive)
DROP POLICY IF EXISTS "webhooks_select_admin" ON public.webhook_events;
DROP POLICY IF EXISTS "webhooks_insert_admin" ON public.webhook_events;
DROP POLICY IF EXISTS "webhooks_update_admin" ON public.webhook_events;
DROP POLICY IF EXISTS "webhooks_delete_admin" ON public.webhook_events;


-- -------------------------
-- 3) Organizations
-- -------------------------
-- Members can see their org
CREATE POLICY "org_select_member"
ON public.organizations
FOR SELECT
USING ( public.is_org_member(id) );

-- Only admin can create/update/delete org records (normally done server-side)
CREATE POLICY "org_insert_admin"
ON public.organizations
FOR INSERT
WITH CHECK ( public.is_admin() );

CREATE POLICY "org_update_admin"
ON public.organizations
FOR UPDATE
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

CREATE POLICY "org_delete_admin"
ON public.organizations
FOR DELETE
USING ( public.is_admin() );


-- -------------------------
-- 4) Users
-- -------------------------
-- Org members can view users in same org
CREATE POLICY "users_select_org"
ON public.users
FOR SELECT
USING ( public.is_org_member(organization_id) );

-- Only admin can add/remove users or change roles/org assignments
CREATE POLICY "users_insert_admin"
ON public.users
FOR INSERT
WITH CHECK ( public.is_admin() AND organization_id IS NOT NULL );

CREATE POLICY "users_update_admin"
ON public.users
FOR UPDATE
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

CREATE POLICY "users_delete_admin"
ON public.users
FOR DELETE
USING ( public.is_admin() );

-- Allow user to update their own profile fields ONLY (not role/org)
-- This prevents techs from elevating themselves.
CREATE POLICY "users_update_self_profile"
ON public.users
FOR UPDATE
USING ( id = auth.uid() )
WITH CHECK (
  id = auth.uid()
  AND organization_id = public.current_org_id()
  AND role = public.current_user_role()
);


-- -------------------------
-- 5) Vendors (mgr/admin write)
-- -------------------------
CREATE POLICY "vendors_select_org"
ON public.vendors
FOR SELECT
USING ( public.is_org_member(organization_id) );

CREATE POLICY "vendors_insert_mgr"
ON public.vendors
FOR INSERT
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "vendors_update_mgr"
ON public.vendors
FOR UPDATE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "vendors_delete_mgr"
ON public.vendors
FOR DELETE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 6) Locations (mgr/admin write)
-- -------------------------
CREATE POLICY "locations_select_org"
ON public.locations
FOR SELECT
USING ( public.is_org_member(organization_id) );

CREATE POLICY "locations_insert_mgr"
ON public.locations
FOR INSERT
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "locations_update_mgr"
ON public.locations
FOR UPDATE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "locations_delete_mgr"
ON public.locations
FOR DELETE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 7) Inventory items (mgr/admin write)
-- -------------------------
CREATE POLICY "items_select_org"
ON public.inventory_items
FOR SELECT
USING ( public.is_org_member(organization_id) );

CREATE POLICY "items_insert_mgr"
ON public.inventory_items
FOR INSERT
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "items_update_mgr"
ON public.inventory_items
FOR UPDATE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "items_delete_mgr"
ON public.inventory_items
FOR DELETE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 8) Location stock
--   - Everyone can view within org
--   - Techs can UPDATE quantity (stock count / receive / issue) but not re-home org
--   - mgr/admin can insert/delete/adjust pars
-- -------------------------
CREATE POLICY "stock_select_org"
ON public.location_stock
FOR SELECT
USING (
  location_id IN (
    SELECT l.id
    FROM public.locations l
    WHERE public.is_org_member(l.organization_id)
  )
);

CREATE POLICY "stock_insert_mgr"
ON public.location_stock
FOR INSERT
WITH CHECK (
  public.is_manager_or_admin()
  AND location_id IN (
    SELECT l.id
    FROM public.locations l
    WHERE public.is_org_member(l.organization_id)
  )
);

-- Techs allowed to update stock quantities in their org
-- (If you later want “only their van”, we can tighten this with technician_id logic.)
CREATE POLICY "stock_update_tech_or_mgr"
ON public.location_stock
FOR UPDATE
USING (
  location_id IN (
    SELECT l.id
    FROM public.locations l
    WHERE public.is_org_member(l.organization_id)
  )
)
WITH CHECK (
  location_id IN (
    SELECT l.id
    FROM public.locations l
    WHERE public.is_org_member(l.organization_id)
  )
);

CREATE POLICY "stock_delete_mgr"
ON public.location_stock
FOR DELETE
USING (
  public.is_manager_or_admin()
  AND location_id IN (
    SELECT l.id
    FROM public.locations l
    WHERE public.is_org_member(l.organization_id)
  )
);


-- -------------------------
-- 9) Transfer requests
--   - Techs can create requests
--   - Only mgr/admin can approve/update status
-- -------------------------
CREATE POLICY "transfers_select_org"
ON public.transfer_requests
FOR SELECT
USING ( public.is_org_member(organization_id) );

CREATE POLICY "transfers_insert_tech_or_mgr"
ON public.transfer_requests
FOR INSERT
WITH CHECK (
  public.is_org_member(organization_id)
  AND (
    public.current_user_role() IN ('admin','manager','technician')
  )
);

CREATE POLICY "transfers_update_mgr"
ON public.transfer_requests
FOR UPDATE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "transfers_delete_mgr"
ON public.transfer_requests
FOR DELETE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 10) Purchase orders (mgr/admin only)
-- -------------------------
CREATE POLICY "po_select_org"
ON public.purchase_orders
FOR SELECT
USING ( public.is_org_member(organization_id) );

CREATE POLICY "po_insert_mgr"
ON public.purchase_orders
FOR INSERT
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "po_update_mgr"
ON public.purchase_orders
FOR UPDATE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "po_delete_mgr"
ON public.purchase_orders
FOR DELETE
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 11) PO line items (mgr/admin only, org derived via PO)
-- -------------------------
CREATE POLICY "po_lines_select_org"
ON public.po_line_items
FOR SELECT
USING (
  po_id IN (
    SELECT po.id
    FROM public.purchase_orders po
    WHERE public.is_org_member(po.organization_id)
  )
);

CREATE POLICY "po_lines_insert_mgr"
ON public.po_line_items
FOR INSERT
WITH CHECK (
  public.is_manager_or_admin()
  AND po_id IN (
    SELECT po.id
    FROM public.purchase_orders po
    WHERE public.is_org_member(po.organization_id)
  )
);

CREATE POLICY "po_lines_update_mgr"
ON public.po_line_items
FOR UPDATE
USING (
  public.is_manager_or_admin()
  AND po_id IN (
    SELECT po.id
    FROM public.purchase_orders po
    WHERE public.is_org_member(po.organization_id)
  )
)
WITH CHECK (
  public.is_manager_or_admin()
  AND po_id IN (
    SELECT po.id
    FROM public.purchase_orders po
    WHERE public.is_org_member(po.organization_id)
  )
);

CREATE POLICY "po_lines_delete_mgr"
ON public.po_line_items
FOR DELETE
USING (
  public.is_manager_or_admin()
  AND po_id IN (
    SELECT po.id
    FROM public.purchase_orders po
    WHERE public.is_org_member(po.organization_id)
  )
);


-- -------------------------
-- 12) oauth_tokens (admin only)
-- NOTE: In practice, your Edge Function should use service key and bypass RLS anyway.
-- This is here to prevent accidental client-side token exposure.
-- -------------------------
CREATE POLICY "tokens_select_admin"
ON public.oauth_tokens
FOR SELECT
USING ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "tokens_insert_admin"
ON public.oauth_tokens
FOR INSERT
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "tokens_update_admin"
ON public.oauth_tokens
FOR UPDATE
USING ( public.is_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "tokens_delete_admin"
ON public.oauth_tokens
FOR DELETE
USING ( public.is_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 13) sync_logs (mgr/admin view; admin write)
-- -------------------------
CREATE POLICY "sync_select_mgr"
ON public.sync_logs
FOR SELECT
USING ( public.is_manager_or_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "sync_insert_admin"
ON public.sync_logs
FOR INSERT
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "sync_update_admin"
ON public.sync_logs
FOR UPDATE
USING ( public.is_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "sync_delete_admin"
ON public.sync_logs
FOR DELETE
USING ( public.is_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 14) qbwc_queue (admin only)
-- -------------------------
CREATE POLICY "qbwc_select_admin"
ON public.qbwc_queue
FOR SELECT
USING ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "qbwc_insert_admin"
ON public.qbwc_queue
FOR INSERT
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "qbwc_update_admin"
ON public.qbwc_queue
FOR UPDATE
USING ( public.is_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "qbwc_delete_admin"
ON public.qbwc_queue
FOR DELETE
USING ( public.is_admin() AND public.is_org_member(organization_id) );


-- -------------------------
-- 15) webhook_events (admin only)
-- -------------------------
CREATE POLICY "webhooks_select_admin"
ON public.webhook_events
FOR SELECT
USING ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "webhooks_insert_admin"
ON public.webhook_events
FOR INSERT
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "webhooks_update_admin"
ON public.webhook_events
FOR UPDATE
USING ( public.is_admin() AND public.is_org_member(organization_id) )
WITH CHECK ( public.is_admin() AND public.is_org_member(organization_id) );

CREATE POLICY "webhooks_delete_admin"
ON public.webhook_events
FOR DELETE
USING ( public.is_admin() AND public.is_org_member(organization_id) );

