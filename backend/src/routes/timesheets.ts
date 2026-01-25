import express from 'express';
import { supabase } from '../config/supabase.js';
import { QBWCService } from '../services/qbwc.service.js';

const router = express.Router();
const qbwcService = new QBWCService();

// Get timesheets with employee hours
router.get('/timesheets', async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      employee_id,
      org_id = '00000000-0000-0000-0000-000000000001'
    } = req.query;

    console.log('⏰ Timesheets requested:', { start_date, end_date, employee_id });

    // Build query
    let query = supabase
      .from('jobs')
      .select(`
        id,
        hcp_id,
        invoice_number,
        description,
        work_status,
        customer_name,
        on_my_way_at,
        started_at,
        completed_at,
        scheduled_start,
        scheduled_end,
        job_employees (
          employee_id,
          employee_name,
          employee_email,
          role
        )
      `)
      .eq('organization_id', org_id)
      .not('started_at', 'is', null)
      .order('started_at', { ascending: false });

    // Apply date filters
    if (start_date) {
      query = query.gte('started_at', start_date);
    }
    if (end_date) {
      query = query.lte('completed_at', end_date);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('❌ Error fetching timesheets:', error);
      throw error;
    }

    // Process and calculate hours for each job
    const timesheets = jobs.map(job => {
      // Calculate hours worked
      let hoursWorked = 0;
      let travelTime = 0;
      
      if (job.started_at && job.completed_at) {
        const start = new Date(job.started_at);
        const end = new Date(job.completed_at);
        hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
      }

      if (job.on_my_way_at && job.started_at) {
        const onWay = new Date(job.on_my_way_at);
        const start = new Date(job.started_at);
        travelTime = (start.getTime() - onWay.getTime()) / (1000 * 60 * 60);
      }

      return {
        job_id: job.hcp_id,
        invoice_number: job.invoice_number,
        description: job.description,
        customer_name: job.customer_name,
        work_status: job.work_status,
        scheduled_start: job.scheduled_start,
        scheduled_end: job.scheduled_end,
        on_my_way_at: job.on_my_way_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        hours_worked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimals
        travel_hours: Math.round(travelTime * 100) / 100,
        total_hours: Math.round((hoursWorked + travelTime) * 100) / 100,
        employees: job.job_employees || []
      };
    });

    // Filter by employee if specified
    let filteredTimesheets = timesheets;
    if (employee_id) {
      filteredTimesheets = timesheets.filter(ts => 
        ts.employees.some((emp: any) => emp.employee_id === employee_id)
      );
    }

    // Group by employee for summary
    const employeeSummary: Record<string, any> = {};
    
    filteredTimesheets.forEach(ts => {
      ts.employees.forEach((emp: any) => {
        if (!employeeSummary[emp.employee_id]) {
          employeeSummary[emp.employee_id] = {
            employee_id: emp.employee_id,
            employee_name: emp.employee_name,
            employee_email: emp.employee_email,
            role: emp.role,
            total_jobs: 0,
            total_hours: 0,
            total_travel_hours: 0
          };
        }
        
        employeeSummary[emp.employee_id].total_jobs++;
        employeeSummary[emp.employee_id].total_hours += ts.hours_worked;
        employeeSummary[emp.employee_id].total_travel_hours += ts.travel_hours;
      });
    });

    // Round summary totals
    Object.values(employeeSummary).forEach((summary: any) => {
      summary.total_hours = Math.round(summary.total_hours * 100) / 100;
      summary.total_travel_hours = Math.round(summary.total_travel_hours * 100) / 100;
      summary.grand_total_hours = Math.round((summary.total_hours + summary.total_travel_hours) * 100) / 100;
    });

    console.log(`✅ Retrieved ${filteredTimesheets.length} timesheet entries for ${Object.keys(employeeSummary).length} employees`);

    res.json({
      success: true,
      timesheets: filteredTimesheets,
      employee_summary: Object.values(employeeSummary),
      filters: { start_date, end_date, employee_id }
    });

  } catch (error: any) {
    console.error('❌ Error in timesheets endpoint:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Export timesheets to QuickBooks Desktop
router.post('/timesheets/export-to-qb', async (req, res) => {
  try {
    const { job_ids, organization_id } = req.body;

    if (!job_ids || !Array.isArray(job_ids) || job_ids.length === 0) {
      return res.status(400).json({ error: 'job_ids array is required' });
    }

    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id is required' });
    }

    console.log(`📤 Exporting ${job_ids.length} jobs to QuickBooks`);

    // Queue each job's timesheet for QB export
    const results = [];
    for (const jobId of job_ids) {
      try {
        await qbwcService.queueTimesheetExport(jobId, organization_id);
        results.push({ job_id: jobId, status: 'queued' });
      } catch (error: any) {
        console.error(`Failed to queue job ${jobId}:`, error.message);
        results.push({ job_id: jobId, status: 'failed', error: error.message });
      }
    }

    const successCount = results.filter(r => r.status === 'queued').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log(`✅ QB Export queued: ${successCount} succeeded, ${failCount} failed`);

    res.json({
      success: true,
      message: `Queued ${successCount} timesheets for QuickBooks export`,
      results
    });

  } catch (error: any) {
    console.error('❌ Error exporting to QB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export { router as timesheetsRouter };
