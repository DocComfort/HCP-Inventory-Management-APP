/**
 * Generate .qwc file for QuickBooks Web Connector installation
 */
export interface QWCConfig {
  appName: string;
  appURL: string;
  appDescription: string;
  appSupport: string;
  userName: string;
  ownerID: string;
  fileID: string;
  qbType: 'QBFS' | 'QBPOS';
  scheduler?: {
    runEvery?: number; // minutes
    enabled?: boolean;
  };
}

export function generateQWCFile(config: QWCConfig): string {
  const {
    appName,
    appURL,
    appDescription,
    appSupport,
    userName,
    ownerID,
    fileID,
    qbType = 'QBFS',
    scheduler = { runEvery: 30, enabled: true }
  } = config;

  return `<?xml version="1.0" encoding="utf-8"?>
<QBWCXML>
  <AppName>${appName}</AppName>
  <AppID></AppID>
  <AppURL>${appURL}</AppURL>
  <AppDescription>${appDescription}</AppDescription>
  <AppSupport>${appSupport}</AppSupport>
  <UserName>${userName}</UserName>
  <OwnerID>${ownerID}</OwnerID>
  <FileID>${fileID}</FileID>
  <QBType>${qbType}</QBType>
  <Scheduler>
    <RunEveryNMinutes>${scheduler.runEvery}</RunEveryNMinutes>
  </Scheduler>
  <IsReadOnly>false</IsReadOnly>
  <PersonalDataPref>
    <PersonalDataPrefType>pdpOptional</PersonalDataPrefType>
  </PersonalDataPref>
  <UnattendedModePref>
    <UnattendedModePrefType>umpOptional</UnattendedModePrefType>
  </UnattendedModePref>
  <AuthFlags>
    <AuthFlag>
      <Name>PersonalDataPref</Name>
      <Value>0</Value>
    </AuthFlag>
  </AuthFlags>
</QBWCXML>`;
}

/**
 * Generate unique GUIDs for OwnerID and FileID
 * In production, generate these once and store them
 */
export function generateGUIDs() {
  return {
    ownerID: `{${generateGUID()}}`,
    fileID: `{${generateGUID()}}`
  };
}

function generateGUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
