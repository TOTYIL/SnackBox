-- Run this on Supabase query editor to allow updating order items
CREATE POLICY "Allow public update on order_items" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on order_items" ON public.order_items FOR DELETE USING (true);

-- Fix trigger for DELETE operations
CREATE OR REPLACE FUNCTION update_order_total_from_items()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET total = (
    SELECT COALESCE(SUM(oi.price * oi.quantity), 0)
    FROM public.order_items oi
    WHERE oi.order_id = COALESCE(NEW.order_id, OLD.order_id)
  )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

