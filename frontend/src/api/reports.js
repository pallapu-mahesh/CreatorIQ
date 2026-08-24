import api from './axios';

/**
 * Deliver a generated report through the backend workflow:
 *
 *   download -> "Report Downloaded Successfully" notification -> email.
 *
 * The file is uploaded to the backend (multipart). The backend resolves the
 * authenticated user from the JWT (never trusts the frontend), persists the
 * report + notification, and emails the file to that user's email via SMTP.
 *
 * Returns the backend response (which includes the honest email_status:
 * "sent" | "failed" | "unavailable").
 */
export async function deliverReport({
  file,
  fileName,
  format,
  platform,
  platformName,
  reportType,
  reportPeriod,
  reportName,
  accountName,
}) {
  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('format', format);
  formData.append('platform', platform || '');
  formData.append('platform_name', platformName || '');
  formData.append('report_type', reportType || '');
  formData.append('report_period', reportPeriod || '');
  formData.append('report_name', reportName || '');
  formData.append('account_name', accountName || '');

  const { data } = await api.post('/api/reports/deliver', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}
