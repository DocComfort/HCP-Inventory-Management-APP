/**
 * Build qbXML requests for QuickBooks Desktop
 */

export interface InventoryAdjustmentParams {
  itemRef: string; // Item ListID or FullName
  quantityAdjustment: number;
  accountRef: string; // Account ListID or FullName
  memo?: string;
  txnDate?: string; // YYYY-MM-DD
}

/**
 * Build InventoryAdjustment qbXML request
 */
export function buildInventoryAdjustmentXML(params: InventoryAdjustmentParams): string {
  const {
    itemRef,
    quantityAdjustment,
    accountRef,
    memo = '',
    txnDate = new Date().toISOString().split('T')[0]
  } = params;

  const adjustmentType = quantityAdjustment > 0 ? 'QuantityAdjustment' : 'QuantityAdjustment';
  const newQuantity = Math.abs(quantityAdjustment);

  return `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    <ItemInventoryAdjustmentAddRq>
      <ItemInventoryAdjustmentAdd>
        <AccountRef>
          <FullName>${accountRef}</FullName>
        </AccountRef>
        <TxnDate>${txnDate}</TxnDate>
        <Memo>${memo}</Memo>
        <ItemInventoryAdjustmentLine>
          <ItemRef>
            <FullName>${itemRef}</FullName>
          </ItemRef>
          <QuantityAdjustment>
            <${adjustmentType}>${quantityAdjustment}</${adjustmentType}>
          </QuantityAdjustment>
        </ItemInventoryAdjustmentLine>
      </ItemInventoryAdjustmentAdd>
    </ItemInventoryAdjustmentAddRq>
  </QBXMLMsgsRq>
</QBXML>`;
}

/**
 * Build Item Query qbXML request
 */
export function buildItemQueryXML(itemRef?: string): string {
  const itemFilter = itemRef 
    ? `<FullName>${itemRef}</FullName>` 
    : '<ActiveStatus>ActiveOnly</ActiveStatus>';

  return `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="continueOnError">
    <ItemInventoryQueryRq>
      ${itemFilter}
    </ItemInventoryQueryRq>
  </QBXMLMsgsRq>
</QBXML>`;
}

/**
 * Build Invoice Add qbXML request
 */
export function buildInvoiceAddXML(invoiceData: any): string {
  const {
    customerRef,
    txnDate,
    refNumber,
    poNumber,
    memo,
    lineItems = []
  } = invoiceData;

  const linesXML = lineItems.map((item: any) => `
    <InvoiceLineAdd>
      <ItemRef>
        <FullName>${item.itemRef}</FullName>
      </ItemRef>
      <Desc>${item.description || ''}</Desc>
      <Quantity>${item.quantity}</Quantity>
      <Rate>${item.rate}</Rate>
    </InvoiceLineAdd>
  `).join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    <InvoiceAddRq>
      <InvoiceAdd>
        <CustomerRef>
          <FullName>${customerRef}</FullName>
        </CustomerRef>
        <TxnDate>${txnDate}</TxnDate>
        ${refNumber ? `<RefNumber>${refNumber}</RefNumber>` : ''}
        ${poNumber ? `<PONumber>${poNumber}</PONumber>` : ''}
        ${memo ? `<Memo>${memo}</Memo>` : ''}
        ${linesXML}
      </InvoiceAdd>
    </InvoiceAddRq>
  </QBXMLMsgsRq>
</QBXML>`;
}

/**
 * Parse qbXML response
 */
export function parseQBXMLResponse(xmlResponse: string): any {
  // In production, use xml2js or similar to parse
  // This is a placeholder for response parsing logic
  return {
    success: xmlResponse.includes('statusCode="0"'),
    raw: xmlResponse
  };
}
