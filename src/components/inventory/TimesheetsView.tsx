import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Download, User, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface Employee {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  role: string;
  total_jobs: number;
  total_hours: number;
  total_travel_hours: number;
  grand_total_hours: number;
}

interface TimesheetEntry {
  job_id: string;
  invoice_number: string;
  description: string;
  customer_name: string;
  work_status: string;
  started_at: string;
  completed_at: string;
  on_my_way_at: string;
  hours_worked: number;
  travel_hours: number;
  total_hours: number;
  employees: Array<{
    employee_id: string;
    employee_name: string;
    role: string;
  }>;
}

export default function TimesheetsView() {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [employeeSummary, setEmployeeSummary] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedEmployee !== 'all') params.append('employee_id', selectedEmployee);

      const response = await fetch(`${API_BASE_URL}/api/timesheets?${params}`);
      const data = await response.json();

      if (data.success) {
        setTimesheets(data.timesheets);
        setEmployeeSummary(data.employee_summary);
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Job #', 'Customer', 'Description', 'Start Time', 'End Time', 'Work Hours', 'Travel Hours', 'Total Hours'];
    
    const rows = timesheets.map(ts => [
      format(new Date(ts.started_at), 'yyyy-MM-dd'),
      ts.employees.map(e => e.employee_name).join(', '),
      ts.invoice_number,
      ts.customer_name,
      ts.description,
      format(new Date(ts.started_at), 'HH:mm'),
      ts.completed_at ? format(new Date(ts.completed_at), 'HH:mm') : '',
      ts.hours_worked.toFixed(2),
      ts.travel_hours.toFixed(2),
      ts.total_hours.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets-${startDate || 'all'}-to-${endDate || 'all'}.csv`;
    a.click();
  };

  const exportToQuickBooks = async () => {
    if (timesheets.length === 0) {
      toast.error('No timesheets to export');
      return;
    }

    const orgId = localStorage.getItem('organization_id') || 'default-org-id';
    const jobIds = timesheets.map(ts => ts.job_id);

    toast.info(`Exporting ${jobIds.length} timesheets to QuickBooks...`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/timesheets/export-to-qb`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-integrations-key': import.meta.env.VITE_INTEGRATIONS_KEY || ''
        },
        body: JSON.stringify({ job_ids: jobIds, organization_id: orgId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error('Failed to export timesheets');
      }
    } catch (error) {
      console.error('Error exporting to QB:', error);
      toast.error('Failed to export timesheets to QuickBooks');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employee Timesheets</h1>
          <p className="text-muted-foreground">Track employee hours from completed jobs</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToQuickBooks} disabled={timesheets.length === 0} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Export to QB
          </Button>
          <Button onClick={exportToCSV} disabled={timesheets.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter timesheets by date range and employee</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeeSummary.map(emp => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchTimesheets} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Summary</CardTitle>
          <CardDescription>Total hours per employee for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Work Hours</TableHead>
                <TableHead className="text-right">Travel Hours</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No timesheet data found. Sync jobs from HCP to populate timesheets.
                  </TableCell>
                </TableRow>
              ) : (
                employeeSummary.map(emp => (
                  <TableRow key={emp.employee_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {emp.employee_name}
                      </div>
                    </TableCell>
                    <TableCell>{emp.role}</TableCell>
                    <TableCell className="text-right">{emp.total_jobs}</TableCell>
                    <TableCell className="text-right">{emp.total_hours.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{emp.total_travel_hours.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">{emp.grand_total_hours.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Timesheets</CardTitle>
          <CardDescription>Job-level time tracking details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Job #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Work Hrs</TableHead>
                <TableHead className="text-right">Travel Hrs</TableHead>
                <TableHead className="text-right">Total Hrs</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No jobs found for selected filters
                  </TableCell>
                </TableRow>
              ) : (
                timesheets.map(ts => (
                  <TableRow key={ts.job_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(ts.started_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{ts.invoice_number}</TableCell>
                    <TableCell>{ts.customer_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ts.employees.map(emp => (
                          <Badge key={emp.employee_id} variant="secondary">
                            {emp.employee_name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ts.started_at), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ts.completed_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(ts.completed_at), 'HH:mm')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{ts.hours_worked.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{ts.travel_hours.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{ts.total_hours.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={ts.work_status.includes('complete') ? 'default' : 'secondary'}>
                        {ts.work_status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
