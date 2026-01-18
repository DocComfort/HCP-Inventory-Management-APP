import express from 'express';
import soap from 'soap';
import { QBWCService } from '../services/qbwc.service.js';
import { generateQWCFile } from '../utils/qwc-generator.js';

const router = express.Router();
const qbwcService = new QBWCService();

// WSDL definition
const wsdlXml = `<?xml version="1.0" encoding="utf-8"?>
<definitions xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" 
             xmlns:tns="http://developer.intuit.com/" 
             xmlns:s="http://www.w3.org/2001/XMLSchema" 
             xmlns:http="http://schemas.xmlsoap.org/wsdl/http/" 
             targetNamespace="http://developer.intuit.com/" 
             xmlns="http://schemas.xmlsoap.org/wsdl/">
  <types>
    <s:schema elementFormDefault="qualified" targetNamespace="http://developer.intuit.com/">
      <s:element name="authenticate">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="strUserName" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="strPassword" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="authenticateResponse">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="authenticateResult">
              <s:complexType>
                <s:sequence>
                  <s:element minOccurs="1" maxOccurs="1" name="string" type="s:string" nillable="true"/>
                </s:sequence>
              </s:complexType>
            </s:element>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="sendRequestXML">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="strHCPResponse" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="strCompanyFileName" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="qbXMLCountry" type="s:string"/>
            <s:element minOccurs="1" maxOccurs="1" name="qbXMLMajorVers" type="s:int"/>
            <s:element minOccurs="1" maxOccurs="1" name="qbXMLMinorVers" type="s:int"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="sendRequestXMLResponse">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="sendRequestXMLResult" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="receiveResponseXML">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="response" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="hresult" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="message" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="receiveResponseXMLResponse">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="1" maxOccurs="1" name="receiveResponseXMLResult" type="s:int"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="closeConnection">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="closeConnectionResponse">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="closeConnectionResult" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="getLastError">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="getLastErrorResponse">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="getLastErrorResult" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="connectionError">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="hresult" type="s:string"/>
            <s:element minOccurs="0" maxOccurs="1" name="message" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
      <s:element name="connectionErrorResponse">
        <s:complexType>
          <s:sequence>
            <s:element minOccurs="0" maxOccurs="1" name="connectionErrorResult" type="s:string"/>
          </s:sequence>
        </s:complexType>
      </s:element>
    </s:schema>
  </types>
  <message name="authenticateSoapIn">
    <part name="parameters" element="tns:authenticate"/>
  </message>
  <message name="authenticateSoapOut">
    <part name="parameters" element="tns:authenticateResponse"/>
  </message>
  <message name="sendRequestXMLSoapIn">
    <part name="parameters" element="tns:sendRequestXML"/>
  </message>
  <message name="sendRequestXMLSoapOut">
    <part name="parameters" element="tns:sendRequestXMLResponse"/>
  </message>
  <message name="receiveResponseXMLSoapIn">
    <part name="parameters" element="tns:receiveResponseXML"/>
  </message>
  <message name="receiveResponseXMLSoapOut">
    <part name="parameters" element="tns:receiveResponseXMLResponse"/>
  </message>
  <message name="closeConnectionSoapIn">
    <part name="parameters" element="tns:closeConnection"/>
  </message>
  <message name="closeConnectionSoapOut">
    <part name="parameters" element="tns:closeConnectionResponse"/>
  </message>
  <message name="getLastErrorSoapIn">
    <part name="parameters" element="tns:getLastError"/>
  </message>
  <message name="getLastErrorSoapOut">
    <part name="parameters" element="tns:getLastErrorResponse"/>
  </message>
  <message name="connectionErrorSoapIn">
    <part name="parameters" element="tns:connectionError"/>
  </message>
  <message name="connectionErrorSoapOut">
    <part name="parameters" element="tns:connectionErrorResponse"/>
  </message>
  <portType name="QBWebConnectorSvc">
    <operation name="authenticate">
      <input message="tns:authenticateSoapIn"/>
      <output message="tns:authenticateSoapOut"/>
    </operation>
    <operation name="sendRequestXML">
      <input message="tns:sendRequestXMLSoapIn"/>
      <output message="tns:sendRequestXMLSoapOut"/>
    </operation>
    <operation name="receiveResponseXML">
      <input message="tns:receiveResponseXMLSoapIn"/>
      <output message="tns:receiveResponseXMLSoapOut"/>
    </operation>
    <operation name="closeConnection">
      <input message="tns:closeConnectionSoapIn"/>
      <output message="tns:closeConnectionSoapOut"/>
    </operation>
    <operation name="getLastError">
      <input message="tns:getLastErrorSoapIn"/>
      <output message="tns:getLastErrorSoapOut"/>
    </operation>
    <operation name="connectionError">
      <input message="tns:connectionErrorSoapIn"/>
      <output message="tns:connectionErrorSoapOut"/>
    </operation>
  </portType>
  <binding name="QBWebConnectorSvcSoap" type="tns:QBWebConnectorSvc">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="authenticate">
      <soap:operation soapAction="http://developer.intuit.com/authenticate" style="document"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="sendRequestXML">
      <soap:operation soapAction="http://developer.intuit.com/sendRequestXML" style="document"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="receiveResponseXML">
      <soap:operation soapAction="http://developer.intuit.com/receiveResponseXML" style="document"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="closeConnection">
      <soap:operation soapAction="http://developer.intuit.com/closeConnection" style="document"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="getLastError">
      <soap:operation soapAction="http://developer.intuit.com/getLastError" style="document"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="connectionError">
      <soap:operation soapAction="http://developer.intuit.com/connectionError" style="document"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>
  <service name="QBWebConnectorSvc">
    <port name="QBWebConnectorSvcSoap" binding="tns:QBWebConnectorSvcSoap">
      <soap:address location="http://localhost:3001/qbwc/service"/>
    </port>
  </service>
</definitions>`;

// SOAP Service Implementation
const service = {
  QBWebConnectorSvc: {
    QBWebConnectorSvcSoap: {
      authenticate: async (args: any) => {
        console.log('QBWC authenticate called:', args);
        const result = await qbwcService.authenticate(args.strUserName, args.strPassword);
        
        // If result is an array [ticket, companyFile], return it properly
        if (Array.isArray(result)) {
          return { 
            authenticateResult: { 
              string: result 
            } 
          };
        }
        
        // If result is a string (like "none", "nvu"), return it as array with one element
        return { 
          authenticateResult: { 
            string: [result, ''] 
          } 
        };
      },
      
      sendRequestXML: async (args: any) => {
        console.log('QBWC sendRequestXML called');
        const result = await qbwcService.sendRequestXML(
          args.ticket,
          args.strCompanyFileName,
          args.qbXMLCountry,
          args.qbXMLMajorVers,
          args.qbXMLMinorVers
        );
        return { sendRequestXMLResult: result };
      },
      
      receiveResponseXML: async (args: any) => {
        console.log('QBWC receiveResponseXML called');
        const result = await qbwcService.receiveResponseXML(
          args.ticket,
          args.response,
          args.hresult,
          args.message
        );
        return { receiveResponseXMLResult: result };
      },
      
      closeConnection: async (args: any) => {
        console.log('QBWC closeConnection called');
        const result = await qbwcService.closeConnection(args.ticket);
        return { closeConnectionResult: result };
      },
      
      getLastError: async (args: any) => {
        console.log('QBWC getLastError called');
        const result = await qbwcService.getLastError(args.ticket);
        return { getLastErrorResult: result };
      },
      
      connectionError: async (args: any) => {
        console.log('QBWC connectionError called');
        const result = await qbwcService.connectionError(args.ticket, args.hresult, args.message);
        return { connectionErrorResult: result };
      }
    }
  }
};

// Serve WSDL
router.get('/wsdl', (req, res) => {
  res.set('Content-Type', 'text/xml');
  res.send(wsdlXml);
});

// Initialize SOAP service - will be set up by the main app
export const initializeSoapService = (app: express.Application) => {
  soap.listen(app, '/qbwc', service, wsdlXml);
  console.log('QBWC SOAP service initialized at /qbwc');
};

// Download .qwc file
router.get('/download-qwc', (req, res) => {
  const qwcContent = generateQWCFile({
    appName: 'HCP Inventory Manager',
    appURL: `http://localhost:${process.env.PORT || 3001}/qbwc/service`,
    appDescription: 'Sync inventory adjustments with QuickBooks Desktop',
    appSupport: 'http://localhost:5173/support',
    userName: process.env.QBWC_USERNAME || 'admin',
    ownerID: '{YOUR-GUID-HERE}',
    fileID: '{YOUR-FILE-GUID-HERE}',
    qbType: 'QBFS'
  });
  
  res.set({
    'Content-Type': 'application/xml',
    'Content-Disposition': 'attachment; filename="HCPInventory.qwc"'
  });
  res.send(qwcContent);
});

// Manual trigger to queue inventory adjustment
router.post('/queue-adjustment', async (req, res) => {
  try {
    const { itemId, locationId, adjustment, reason } = req.body;
    await qbwcService.queueInventoryAdjustment(itemId, locationId, adjustment, reason);
    res.json({ success: true, message: 'Adjustment queued for sync' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as qbwcRouter };
