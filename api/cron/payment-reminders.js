/**
 * API: Scheduled Cron - Payment Reminders
 * 
 * Automatically sends payment reminders for overdue invoices.
 * Should be called by Vercel Cron or external scheduler.
 * 
 * Trigger: Daily at 9 AM
 * 
 * Future Use: Enable when payment tracking is ready
 */

export default async function handler(req, res) {
  // Verify cron secret for security
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    // For Vercel Cron, verify the authorization header
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    console.log('[CRON] Starting payment reminder job:', new Date().toISOString());

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find overdue payments (invoices sent but not paid, past due date)
    // TODO: Implement when payments table is ready
    /*
    const { data: overduePayments, error } = await supabase
      .from('payments')
      .select(`
        *,
        property_quotes!inner(
          tracking_id,
          full_name,
          email,
          phone,
          service_category
        )
      `)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString())
      .is('reminder_sent_at', null);

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const payment of overduePayments || []) {
      try {
        // Send reminder email
        await sendEmail({
          to: payment.property_quotes.email,
          ...emailTemplates.paymentReminder({
            name: payment.property_quotes.full_name,
            amount: payment.amount_cents,
            tracking_id: payment.property_quotes.tracking_id,
            due_date: payment.due_date
          })
        });

        // Mark reminder sent
        await supabase
          .from('payments')
          .update({ 
            reminder_sent_at: new Date().toISOString(),
            reminder_count: (payment.reminder_count || 0) + 1
          })
          .eq('id', payment.id);

        sent++;

      } catch (err) {
        console.error('[CRON] Failed to send reminder:', payment.id, err);
        failed++;
      }
    }
    */

    const result = {
      job: 'payment-reminders',
      timestamp: new Date().toISOString(),
      sent: 0, // sent,
      failed: 0, // failed,
      total: 0 // overduePayments?.length || 0
    };

    console.log('[CRON] Payment reminder job complete:', result);

    res.status(200).json(result);

  } catch (error) {
    console.error('[CRON] Payment reminder job failed:', error);
    res.status(500).json({ 
      error: 'Cron job failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
