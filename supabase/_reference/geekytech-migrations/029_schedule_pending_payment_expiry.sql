-- Run pending-payment expiry inside Supabase so it does not depend on a user
-- opening an order detail page or an external cron-job.org configuration.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE INDEX IF NOT EXISTS idx_payments_pending_expiry_time
  ON payments (expiry_time)
  WHERE status = 'pending' AND expiry_time IS NOT NULL;

CREATE OR REPLACE FUNCTION public.expire_pending_payment_orders()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate record;
  cancelled_count integer := 0;
BEGIN
  FOR candidate IN
    SELECT o.id, o.order_number, o.user_id
    FROM orders AS o
    WHERE o.status = 'pending_payment'
      AND (
        o.created_at < now() - interval '3 hours'
        OR EXISTS (
          SELECT 1
          FROM payments AS p
          WHERE p.order_id = o.id
            AND p.status = 'pending'
            AND p.expiry_time IS NOT NULL
            AND p.expiry_time <= now()
        )
      )
    FOR UPDATE OF o SKIP LOCKED
  LOOP
    UPDATE orders
    SET status = 'cancelled'
    WHERE id = candidate.id
      AND status = 'pending_payment';

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO order_status_history (order_id, status, note, changed_by)
    VALUES (
      candidate.id,
      'cancelled',
      'Pesanan dibatalkan otomatis karena melewati batas waktu pembayaran.',
      NULL
    );

    UPDATE product_variants AS variant
    SET reserved = GREATEST(variant.reserved - released.quantity, 0)
    FROM (
      SELECT variant_id, SUM(quantity)::integer AS quantity
      FROM order_items
      WHERE order_id = candidate.id
        AND variant_id IS NOT NULL
      GROUP BY variant_id
    ) AS released
    WHERE variant.id = released.variant_id;

    UPDATE payments
    SET status = 'expired'
    WHERE order_id = candidate.id
      AND status = 'pending';

    IF candidate.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        candidate.user_id,
        'Pembayaran Kedaluwarsa',
        format('Pesanan %s dibatalkan karena melewati batas waktu pembayaran.', candidate.order_number),
        'payment_expired',
        jsonb_build_object('orderId', candidate.id, 'orderNumber', candidate.order_number)
      );
    END IF;

    INSERT INTO admin_notifications (title, body, type, data)
    VALUES (
      'Pesanan Dibatalkan Otomatis',
      format('Pesanan %s dibatalkan karena batas waktu pembayaran habis.', candidate.order_number),
      'payment_expired',
      jsonb_build_object('orderId', candidate.id, 'orderNumber', candidate.order_number)
    );

    cancelled_count := cancelled_count + 1;
  END LOOP;

  RETURN cancelled_count;
END;
$$;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'expire_pending_payment_orders';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'expire_pending_payment_orders',
    '*/5 * * * *',
    'SELECT public.expire_pending_payment_orders();'
  );
END;
$$;
