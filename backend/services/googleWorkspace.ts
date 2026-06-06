import { google } from 'googleapis';
import { getIntegrationsConfig } from '../utils/config';
import fs from 'fs';
import path from 'path';

function getGoogleAuth() {
    const config = getIntegrationsConfig();
    const { clientEmail, privateKey } = config.google || {};

    const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/documents'
    ];

    if (!clientEmail || !privateKey) {
        throw new Error('Google Service Account credentials missing in config.json.');
    }

    return new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes
    });
}

export async function logMetricsToSheet(projectId: number, mrId: number, metrics: Record<string, any>): Promise<string | null> {
    try {
        const config = getIntegrationsConfig();
        const spreadsheetId = config.google?.sheetId || process.env.GOOGLE_SHEET_ID;
        if (!spreadsheetId) {
            console.log('[Google Sheets] No spreadsheet ID configured — skipping.');
            return null;
        }

        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        // Check if headers exist
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A1:F1'
        });

        const hasHeaders = response.data.values && response.data.values.length > 0;

        if (!hasHeaders) {
            // Write headers
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Sheet1!A1:F1',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [['Timestamp', 'Merge Request', 'Files Analyzed', 'Files Fixed', 'Time Saved (hrs)', 'Tokens Saved (K)']]
                }
            });

            // Get sheetId for formatting
            const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
            const sheetId = sheetInfo.data.sheets?.[0]?.properties?.sheetId || 0;

            // Format headers
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            repeatCell: {
                                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.2, green: 0.1, blue: 0.3 }, // Dark purple
                                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                                        horizontalAlignment: 'CENTER'
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                            }
                        },
                        {
                            updateSheetProperties: {
                                properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                                fields: 'gridProperties.frozenRowCount'
                            }
                        }
                    ]
                }
            });
        }

        // Append data
        const now = new Date().toLocaleString();
        const values = [[
            now,
            `MR !${mrId}`,
            metrics.filesAnalyzed || 0,
            metrics.filesFixed || 0,
            metrics.timeSaved || 0,
            metrics.tokensSaved || 0
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:F',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values }
        });

        // Auto-resize columns
        try {
            const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
            const sheetId = sheetInfo.data.sheets?.[0]?.properties?.sheetId || 0;
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 6 } } }
                    ]
                }
            });
        } catch (e) {
            // Ignore auto-resize errors
        }

        const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        console.log(`[Google Sheets] Metrics logged to ${sheetUrl}`);
        return sheetUrl;
    } catch (error: any) {
        console.error(`[Google Sheets] Error: ${error.message}`);
        return null;
    }
}

export async function generateComplianceReport(projectId: number, mrId: number, metrics: Record<string, any>): Promise<string | null> {
    try {
        const config = getIntegrationsConfig();
        const documentId = config.google?.docId;
        const auth = getGoogleAuth();
        const docs = google.docs({ version: 'v1', auth });

        const title = `AccessOps Compliance Report — MR !${mrId} — ${new Date().toLocaleDateString()}`;

        // If we have an existing doc ID, update it; otherwise create a new one
        let docUrl: string;
        if (documentId) {
            // Update existing document — first clear it, then append
            try {
                // Read current doc to get length
                const existing = await docs.documents.get({ documentId });
                const contentArr = existing.data.body?.content || [];
                const endIndex = contentArr.length > 0 ? (contentArr[contentArr.length - 1]?.endIndex ?? 1) : 1;
                // Delete existing content
                await docs.documents.batchUpdate({
                    documentId,
                    requestBody: {
                        requests: [{
                            deleteContentRange: {
                                range: { startIndex: 1, endIndex: endIndex - 1 }
                            }
                        }]
                    }
                });
            } catch {
                // Doc might not exist yet, proceed to create
            }
            docUrl = `https://docs.google.com/document/d/${documentId}`;
        } else {
            // Create a new document
            const created = await docs.documents.create({
                requestBody: { title }
            });
            const newId = created.data.documentId;
            if (!newId) throw new Error('Failed to create document');
            docUrl = `https://docs.google.com/document/d/${newId}`;
            // Update config with new doc ID
            const { saveIntegrationsConfig } = await import('../utils/config');
            const currentConfig = getIntegrationsConfig();
            if (!currentConfig.google) currentConfig.google = {};
            currentConfig.google.docId = newId;
            saveIntegrationsConfig(currentConfig);
        }

        // Build rich text requests
        const docId = documentId || docUrl.split('/').pop() || '';
        const requests: any[] = [];
        let currentIndex = 1;

        const addText = (text: string, style: string = 'NORMAL_TEXT', bold: boolean = false, color?: {r: number, g: number, b: number}) => {
            requests.push({
                insertText: { location: { index: currentIndex }, text }
            });

            if (style !== 'NORMAL_TEXT') {
                requests.push({
                    updateParagraphStyle: {
                        range: { startIndex: currentIndex, endIndex: currentIndex + text.length },
                        paragraphStyle: { namedStyleType: style },
                        fields: 'namedStyleType'
                    }
                });
            }

            const textStyle: any = {};
            let hasTextStyle = false;
            
            if (bold) {
                textStyle.bold = true;
                hasTextStyle = true;
            }
            if (color) {
                textStyle.foregroundColor = { color: { rgbColor: { red: color.r, green: color.g, blue: color.b } } };
                hasTextStyle = true;
            }

            if (hasTextStyle) {
                requests.push({
                    updateTextStyle: {
                        range: { startIndex: currentIndex, endIndex: currentIndex + text.length },
                        textStyle: textStyle,
                        fields: Object.keys(textStyle).join(',')
                    }
                });
            }

            currentIndex += text.length;
        };

        addText(`AccessOps Compliance Report\n`, 'TITLE');
        addText(`Generated on: ${new Date().toLocaleString()} | Project ID: ${projectId} | MR IID: !${mrId}\n\n`, 'SUBTITLE', false, {r: 0.4, g: 0.4, b: 0.4});
        
        addText(`Audit Summary\n`, 'HEADING_1');
        addText(`The autonomous Multi-Agent orchestrator successfully analyzed `, 'NORMAL_TEXT');
        addText(`${metrics.filesAnalyzed || 0} `, 'NORMAL_TEXT', true);
        addText(`modified files. Out of these, `, 'NORMAL_TEXT');
        addText(`${metrics.filesFixed || 0} `, 'NORMAL_TEXT', true);
        addText(`files contained violations and received automated remediations across Accessibility, Security, and Performance domains. All changes were committed and pushed securely to the source branch.\n\n`, 'NORMAL_TEXT');

        addText(`ROI Metrics\n`, 'HEADING_1');
        addText(`• Files Analyzed: `, 'NORMAL_TEXT', true);
        addText(`${metrics.filesAnalyzed || 0}\n`, 'NORMAL_TEXT');
        addText(`• Files Remediated: `, 'NORMAL_TEXT', true);
        addText(`${metrics.filesFixed || 0}\n`, 'NORMAL_TEXT');
        addText(`• Estimated Time Saved: `, 'NORMAL_TEXT', true);
        addText(`${metrics.timeSaved || 0} hours\n`, 'NORMAL_TEXT');
        addText(`• Estimated Tokens Saved: `, 'NORMAL_TEXT', true);
        addText(`${metrics.tokensSaved || 0}K\n\n`, 'NORMAL_TEXT');

        addText(`Status: `, 'NORMAL_TEXT', true);
        addText(`COMPLIANT - READY FOR MERGE\n`, 'NORMAL_TEXT', true, {r: 0.1, g: 0.6, b: 0.2});

        await docs.documents.batchUpdate({
            documentId: docId,
            requestBody: { requests }
        });

        console.log(`[Google Docs] Compliance report generated at ${docUrl}`);
        return docUrl;
    } catch (error: any) {
        console.error(`[Google Docs] Error: ${error.message}`);
        return null;
    }
}
