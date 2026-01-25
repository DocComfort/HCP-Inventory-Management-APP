import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { buildInventoryAdjustmentXML } from '../utils/qbxml-builder.js';

export class QBWCService {
  private sessions: Map<string, any> = new Map();

  /**
   * Authenticate QBWC connection
   * Returns: sessionTicket or error codes
   */
  async authenticate(username: string, password: string): Promise<string | string[]> {
    console.log(`Authentication attempt for user: ${username}`);
    
    // Validate credentials
    const validUsername = process.env.QBWC_USERNAME || 'admin';
    const validPassword = process.env.QBWC_PASSWORD || 'password';
    
    if (username !== validUsername || password !== validPassword) {
      console.error('Invalid credentials');
      return 'nvu'; // Invalid user
    }
    
    // Check if there are pending requests
    const { data: pendingRequests, error } = await supabase
      .from('qbwc_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (error) {
      console.error('Error checking queue:', error);
      return 'nvu';
    }
    
    if (!pendingRequests || pendingRequests.length === 0) {
      console.log('No pending requests, returning none');
      return 'none'; // No work to do
    }
    
    // Create session
    const ticket = uuidv4();
    this.sessions.set(ticket, {
      username,
      companyFile: '',
      queueItem: pendingRequests[0],
      authenticated: true,
      startTime: new Date()
    });
    
    console.log(`Session created with ticket: ${ticket}`);
    
    // Return: [ticket, companyFile] or just ticket
    return [ticket, process.env.QBWC_COMPANY_FILE || ''];
  }

  /**
   * Send qbXML request to QuickBooks
   */
  async sendRequestXML(
    ticket: string,
    companyFileName: string,
    country: string,
    qbXMLMajorVers: number,
    qbXMLMinorVers: number
  ): Promise<string> {
    console.log(`sendRequestXML called for ticket: ${ticket}`);
    
    const session = this.sessions.get(ticket);
    if (!session) {
      console.error('Invalid ticket');
      return '';
    }
    
    session.companyFile = companyFileName;
    
    const queueItem = session.queueItem;
    if (!queueItem) {
      console.log('No queue item, returning empty');
      return '';
    }
    
    // Update status to processing
    await supabase
      .from('qbwc_queue')
      .update({ status: 'processing' })
      .eq('id', queueItem.id);
    
    console.log(`Sending qbXML request for type: ${queueItem.request_type}`);
    return queueItem.qbxml_request;
  }

  /**
   * Receive response from QuickBooks
   */
  async receiveResponseXML(
    ticket: string,
    response: string,
    hresult: string,
    message: string
  ): Promise<number> {
    console.log(`receiveResponseXML called for ticket: ${ticket}`);
    console.log(`hresult: ${hresult}, message: ${message}`);
    
    const session = this.sessions.get(ticket);
    if (!session) {
      console.error('Invalid ticket');
      return -1;
    }
    
    const queueItem = session.queueItem;
    
    if (hresult && hresult !== '0') {
      // Error occurred
      console.error('QB returned error:', message);
      
      await supabase
        .from('qbwc_queue')
        .update({
          status: 'failed',
          error_message: message,
          attempts: queueItem.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItem.id);
      
      // Create sync log
      await this.createSyncLog(
        queueItem.organization_id,
        queueItem.request_type,
        'failed',
        queueItem.qbxml_request,
        response,
        message
      );
      
      return -1;
    }
    
    // Success - parse response and update
    console.log('QB request successful');
    
    await supabase
      .from('qbwc_queue')
      .update({
        status: 'completed',
        response_data: response,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueItem.id);
    
    // Create sync log
    await this.createSyncLog(
      queueItem.organization_id,
      queueItem.request_type,
      'completed',
      queueItem.qbxml_request,
      response
    );
    
    // Return percentage complete (100 = done with this ticket)
    return 100;
  }

  /**
   * Close connection
   */
  async closeConnection(ticket: string): Promise<string> {
    console.log(`closeConnection called for ticket: ${ticket}`);
    
    this.sessions.delete(ticket);
    return 'OK';
  }

  /**
   * Get last error
   */
  async getLastError(ticket: string): Promise<string> {
    console.log(`getLastError called for ticket: ${ticket}`);
    return 'No error';
  }

  /**
   * Connection error handler
   */
  async connectionError(ticket: string, hresult: string, message: string): Promise<string> {
    console.error(`Connection error for ticket ${ticket}: ${message}`);
    
    const session = this.sessions.get(ticket);
    if (session && session.queueItem) {
      await supabase
        .from('qbwc_queue')
        .update({
          status: 'failed',
          error_message: message,
          attempts: session.queueItem.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.queueItem.id);
    }
    
    this.sessions.delete(ticket);
    return 'done';
  }

  /**
   * Queue an inventory adjustment for QB Desktop sync
   */
  async queueInventoryAdjustment(
    itemId: string,
    locationId: string,
    quantityAdjustment: number,
    reason: string,
    organizationId?: string
  ): Promise<void> {
    console.log(`Queueing inventory adjustment for item: ${itemId}`);
    
    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('*, locations(*)')
      .eq('id', itemId)
      .single();
    
    if (itemError || !item) {
      throw new Error('Item not found');
    }
    
    // Build qbXML
    const qbxml = buildInventoryAdjustmentXML({
      itemRef: item.qbd_item_id || item.sku,
      quantityAdjustment,
      accountRef: 'Inventory Asset', // Configure based on your QB setup
      memo: reason,
      txnDate: new Date().toISOString().split('T')[0]
    });
    
    // Insert into queue
    const { error: queueError } = await supabase
      .from('qbwc_queue')
      .insert({
        organization_id: organizationId || item.organization_id,
        request_type: 'InventoryAdjustment',
        qbxml_request: qbxml,
        status: 'pending',
        priority: 5,
        attempts: 0,
        max_attempts: 3
      });
    
    if (queueError) {
      throw new Error(`Failed to queue adjustment: ${queueError.message}`);
    }
    
    console.log('Inventory adjustment queued successfully');
  }

  /**
   * Queue timesheet entries for QB Desktop sync
   */
  async queueTimesheetExport(
    jobId: string,
    organizationId: string
  ): Promise<void> {
    console.log(`Queueing timesheet export for job: ${jobId}`);
    
    // Get job details with employee assignments
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        job_employees (
          employee_id,
          employee_name,
          role,
          employee_email
        )
      `)
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      throw new Error('Job not found');
    }
    
    if (!job.started_at || !job.completed_at) {
      throw new Error('Job must have start and completion times for timesheet export');
    }
    
    // Calculate hours
    const startTime = new Date(job.started_at);
    const endTime = new Date(job.completed_at);
    const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Format date for QB (YYYY-MM-DD)
    const txnDate = startTime.toISOString().split('T')[0];
    
    // Create timesheet entry for each employee
    for (const employee of job.job_employees || []) {
      const qbxml = this.buildTimeTrackingXML({
        txnDate,
        employeeRef: employee.employee_id,
        customerRef: job.customer_id || job.customer_name,
        serviceItemRef: job.work_type || 'Labor',
        duration: `PT${Math.floor(hoursWorked)}H${Math.round((hoursWorked % 1) * 60)}M`,
        notes: `Job #${job.invoice_number}: ${job.description || ''}`
      });
      
      // Insert into queue
      const { error: queueError } = await supabase
        .from('qbwc_queue')
        .insert({
          organization_id: organizationId,
          request_type: 'TimeTracking',
          qbxml_request: qbxml,
          status: 'pending',
          priority: 3,
          attempts: 0,
          max_attempts: 3
        });
      
      if (queueError) {
        console.error(`Failed to queue timesheet for employee ${employee.employee_name}:`, queueError);
      }
    }
    
    console.log(`Timesheet export queued for ${job.job_employees?.length || 0} employees`);
  }

  /**
   * Build TimeTracking IAdd qbXML
   */
  private buildTimeTrackingXML(params: {
    txnDate: string;
    employeeRef: string;
    customerRef: string;
    serviceItemRef: string;
    duration: string;
    notes?: string;
  }): string {
    const { txnDate, employeeRef, customerRef, serviceItemRef, duration, notes } = params;
    
    return `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="continueOnError">
    <TimeTrackingAddRq>
      <TimeTrackingAdd>
        <TxnDate>${txnDate}</TxnDate>
        <EntityRef>
          <FullName>${employeeRef}</FullName>
        </EntityRef>
        <CustomerRef>
          <FullName>${customerRef}</FullName>
        </CustomerRef>
        <ItemServiceRef>
          <FullName>${serviceItemRef}</FullName>
        </ItemServiceRef>
        <Duration>${duration}</Duration>
        <IsBillable>true</IsBillable>
        ${notes ? `<Notes>${notes}</Notes>` : ''}
      </TimeTrackingAdd>
    </TimeTrackingAddRq>
  </QBXMLMsgsRq>
</QBXML>`;
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(
    organizationId: string,
    requestType: string,
    status: 'completed' | 'failed',
    requestData: string,
    responseData?: string,
    errorMessage?: string
  ): Promise<void> {
    await supabase.from('sync_logs').insert({
      organization_id: organizationId,
      sync_type: 'inventory_adjustment',
      provider: 'qbd',
      status,
      request_data: requestData,
      response_data: responseData,
      error_message: errorMessage
    });
  }
}
