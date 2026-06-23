/**
 * API: Export Data (CSV/Excel)
 * 
 * Exports data in various formats for:
 * - Financial reports
 * - Lead lists
 * - Agreement records
 * - Tax documents
 * 
 * Future Use: Enable when reporting is ready
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get query parameters
    const { 
      type = 'agreements',    // agreements, quotes, wholesale, payments
      format = 'csv',         // csv, json
      startDate,
      endDate 
    } = req.query;

    // Fetch the appropriate data
    const data = await fetchExportData(supabase, type, startDate, endDate);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.json"`);
      return res.status(200).json(data);
    }

    // Convert to CSV
    const csv = convertToCSV(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('[EXPORT] Error:', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Fetch data for export
 */
async function fetchExportData(supabase, type, startDate, endDate) {
  let query;
  const dateFilter = startDate ? `created_at.gte.${startDate}` : null;
  const dateFilterEnd = endDate ? `created_at.lte.${endDate}` : null;

  switch (type) {
    case 'agreements':
      query = supabase
        .from('agreements')
        .select('*');
      break;

    case 'quotes':
      query = supabase
        .from('property_quotes')
        .select('*');
      break;

    case 'wholesale':
      query = supabase
        .from('wholesale_leads')
        .select('*');
      break;

    case 'payments':
      query = supabase
        .from('payments')
        .select('*');
      break;

    default:
      throw new Error(`Unknown export type: ${type}`);
  }

  // Apply date filters
  if (dateFilter) {
    query = query.gte('created_at', startDate);
  }
  if (dateFilterEnd) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Convert data array to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  let csv = headers.map(h => `"${h}"`).join(',') + '\n';

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '""';
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    
    csv += values.join(',') + '\n';
  });

  return csv;
}
