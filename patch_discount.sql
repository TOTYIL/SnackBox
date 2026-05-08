ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_used numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS prepaid_discount numeric DEFAULT 0;

CREATE OR REPLACE FUNCTION reset_order_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.total = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_order_total_from_items()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET total = GREATEST(0, (
    SELECT COALESCE(SUM(oi.price * oi.quantity), 0)
    FROM public.order_items oi
    WHERE oi.order_id = NEW.order_id
  ) - COALESCE(points_used, 0) - COALESCE(prepaid_discount, 0))
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
