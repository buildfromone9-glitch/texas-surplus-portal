/**
 * API: Scheduled Cron - Quote Expiration
 * 
 * Marks old quotes as expired and notifies relevant parties.
 * Should be called by Vercel Cron or external scheduler.
 * 
 * Trigger: Daily at midnight
 * 
 * Future Use: Enable when quote management is ready
 */

export default async function handler(req, res) {
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    console.log('[CRON] Starting quote expiration job:', new Date().toISOString());

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find quotes that are:
    // - Status 'new' or 'quoted'
    // - Created more than 14 days ago (configurable)
    // - Not already expired

    const expirationDays = 14; // TODO: Get from settings table

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - expirationDays);

    // TODO: Implement when ready
    /*
    const { data: expiredQuotes, error } = await supabase
      .from('property_quotes')
      .select('*')
      .in('status', ['new', 'quoted'])
      .lt('created_at', cutoffDate.toISOString())
      .neq('expired', true);

    let expired = 0;

    for (const quote of expiredQuotes || []) {
      // Update status to expired
      await supabase
        .from('property_quotes')
        .update({
          status: 'expired',
          expired_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      // Notify client
      await sendEmail({
        to: quote.email,
        subject: 'Your Quote Has Expired',
        html: `
          <p>Hello ${quote.full_name},</p>
          <p>Your quote for ${quote.service_category} services has expired.</p>
          <p>If you'd still like to proceed, please submit a new request at vorvoservices.com</p>
        `
      });

      expired++;
    }
    */

    const result = {
      job: 'quote-expiration',
      timestamp: new Date().toISOString(),
      expired: 0, // expired,
      cutoff_date: cutoffDate.toISOString()
    };

    console.log('[CRON] Quote expiration job complete:', result);

    res.status(200).json(result);

  } catch (error) {
    console.error('[CRON] Quote expiration job failed:', error);
    res.status(500).json({ 
      error: 'Cron job failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
