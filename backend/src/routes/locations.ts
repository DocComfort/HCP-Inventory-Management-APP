import express from 'express';
import { supabase } from '../config/supabase.js';
import { sendSuccess, sendError } from '../middleware/requestId.js';
import { validateIntegrationsKey } from '../middleware/integrationsKey.js';

const router = express.Router();

// Get all locations (warehouses and vans)
router.get('/', async (req, res) => {
  try {
    const { org_id, type } = req.query;
    
    let query = supabase
      .from('locations')
      .select(`
        *,
        location_employees (
          id,
          employee_id,
          employee_name,
          employee_email,
          role,
          is_primary
        )
      `)
      .order('name');
    
    if (org_id) {
      query = query.eq('organization_id', org_id);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    sendSuccess(res, { locations: data });
  } catch (error: any) {
    sendError(res, 'FETCH_ERROR', error.message, 500);
  }
});

// Get single location by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select(`
        *,
        location_employees (
          id,
          employee_id,
          employee_name,
          employee_email,
          role,
          is_primary
        ),
        location_stock (
          id,
          quantity,
          par_level,
          inventory_items (
            id,
            name,
            sku,
            unit_cost
          )
        )
      `)
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    sendSuccess(res, { location: data });
  } catch (error: any) {
    sendError(res, 'FETCH_ERROR', error.message, 500);
  }
});

// Create a new location (warehouse or van)
router.post('/', validateIntegrationsKey, async (req, res) => {
  try {
    const { 
      name, 
      type, 
      address, 
      is_active = true,
      organization_id = '00000000-0000-0000-0000-000000000001',
      technician_name,
      technician_id
    } = req.body;
    
    if (!name || !type) {
      return sendError(res, 'VALIDATION_ERROR', 'Name and type are required', 400);
    }
    
    if (!['warehouse', 'van', 'office'].includes(type)) {
      return sendError(res, 'VALIDATION_ERROR', 'Type must be warehouse, van, or office', 400);
    }
    
    const { data, error } = await supabase
      .from('locations')
      .insert({
        name,
        type,
        address,
        is_active,
        organization_id,
        technician_name,
        technician_id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Created ${type}: ${name}`);
    sendSuccess(res, { location: data, message: `${type} created successfully` });
  } catch (error: any) {
    sendError(res, 'CREATE_ERROR', error.message, 500);
  }
});

// Update a location
router.put('/:id', validateIntegrationsKey, async (req, res) => {
  try {
    const { 
      name, 
      type, 
      address, 
      is_active,
      technician_name,
      technician_id
    } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (address !== undefined) updateData.address = address;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (technician_name !== undefined) updateData.technician_name = technician_name;
    if (technician_id !== undefined) updateData.technician_id = technician_id;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Updated location: ${data.name}`);
    sendSuccess(res, { location: data, message: 'Location updated successfully' });
  } catch (error: any) {
    sendError(res, 'UPDATE_ERROR', error.message, 500);
  }
});

// Delete a location
router.delete('/:id', validateIntegrationsKey, async (req, res) => {
  try {
    // First remove any employee associations
    await supabase
      .from('location_employees')
      .delete()
      .eq('location_id', req.params.id);
    
    // Then delete the location
    const { data, error } = await supabase
      .from('locations')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`🗑️ Deleted location: ${data?.name}`);
    sendSuccess(res, { message: 'Location deleted successfully' });
  } catch (error: any) {
    sendError(res, 'DELETE_ERROR', error.message, 500);
  }
});

// Assign employee to a location (van)
router.post('/:id/employees', validateIntegrationsKey, async (req, res) => {
  try {
    const { employee_id, employee_name, employee_email, role, is_primary = false } = req.body;
    
    if (!employee_id || !employee_name) {
      return sendError(res, 'VALIDATION_ERROR', 'Employee ID and name are required', 400);
    }
    
    // If is_primary, unset other primary assignments for this location
    if (is_primary) {
      await supabase
        .from('location_employees')
        .update({ is_primary: false })
        .eq('location_id', req.params.id);
    }
    
    const { data, error } = await supabase
      .from('location_employees')
      .upsert({
        location_id: req.params.id,
        employee_id,
        employee_name,
        employee_email,
        role,
        is_primary
      }, { onConflict: 'location_id,employee_id' })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Assigned ${employee_name} to location ${req.params.id}`);
    sendSuccess(res, { assignment: data, message: 'Employee assigned successfully' });
  } catch (error: any) {
    sendError(res, 'ASSIGN_ERROR', error.message, 500);
  }
});

// Remove employee from a location
router.delete('/:id/employees/:employeeId', validateIntegrationsKey, async (req, res) => {
  try {
    const { error } = await supabase
      .from('location_employees')
      .delete()
      .eq('location_id', req.params.id)
      .eq('employee_id', req.params.employeeId);
    
    if (error) throw error;
    
    console.log(`🗑️ Removed employee ${req.params.employeeId} from location ${req.params.id}`);
    sendSuccess(res, { message: 'Employee removed from location' });
  } catch (error: any) {
    sendError(res, 'REMOVE_ERROR', error.message, 500);
  }
});

// Update par levels for a location
router.put('/:id/par-levels', validateIntegrationsKey, async (req, res) => {
  try {
    const { items } = req.body; // Array of { item_id, par_level }
    
    if (!items || !Array.isArray(items)) {
      return sendError(res, 'VALIDATION_ERROR', 'Items array is required', 400);
    }
    
    const updates = [];
    for (const item of items) {
      const { error } = await supabase
        .from('location_stock')
        .upsert({
          location_id: req.params.id,
          item_id: item.item_id,
          par_level: item.par_level,
          quantity: item.quantity || 0
        }, { onConflict: 'location_id,item_id' });
      
      if (error) throw error;
      updates.push(item.item_id);
    }
    
    console.log(`✅ Updated par levels for ${updates.length} items at location ${req.params.id}`);
    sendSuccess(res, { updated: updates.length, message: 'Par levels updated' });
  } catch (error: any) {
    sendError(res, 'UPDATE_ERROR', error.message, 500);
  }
});

// Get employees from HCP for assignment
router.get('/hcp/employees', async (req, res) => {
  try {
    const { org_id = '00000000-0000-0000-0000-000000000001' } = req.query;
    
    // Get stored HCP credentials
    const { data: creds } = await supabase
      .from('integration_credentials')
      .select('api_key')
      .eq('organization_id', org_id)
      .eq('platform', 'hcp')
      .single();
    
    if (!creds?.api_key) {
      return sendError(res, 'NOT_CONNECTED', 'HCP not connected', 400);
    }
    
    // Fetch employees from HCP
    const response = await fetch('https://api.housecallpro.com/employees', {
      headers: {
        'Authorization': `Bearer ${creds.api_key}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HCP API error: ${response.status}`);
    }
    
    const data = await response.json() as { employees?: any[] };
    
    sendSuccess(res, { employees: data.employees || [] });
  } catch (error: any) {
    sendError(res, 'FETCH_ERROR', error.message, 500);
  }
});

export default router;
