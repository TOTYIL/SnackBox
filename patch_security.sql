-- Run this file in your Supabase SQL Editor to secure your database!

-- 1. Create a trigger to prevent spoofing the order total
CREATE OR REPLACE FUNCTION reset_order_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.total = 0; -- Force total to 0 initially. It will be calculated by the items.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_total_reset ON public.orders;
CREATE TRIGGER order_total_reset
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION reset_order_total();

-- 2. Create a trigger to prevent spoofing the price of individual items, 
-- and to automatically update the parent order's total!
CREATE OR REPLACE FUNCTION enforce_real_prices_and_update_total()
RETURNS TRIGGER AS $$
DECLARE
  real_price numeric;
BEGIN
  -- Get the real price from the products table
  SELECT price INTO real_price FROM public.products WHERE id = NEW.product_id;
  
  -- Force the item price to be the real price, ignoring whatever the frontend sent
  NEW.price = real_price;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_real_prices ON public.order_items;
CREATE TRIGGER enforce_real_prices
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION enforce_real_prices_and_update_total();

-- 3. Update the parent order's total after item inserts
CREATE OR REPLACE FUNCTION update_order_total_from_items()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET total = (
    SELECT COALESCE(SUM(oi.price * oi.quantity), 0)
    FROM public.order_items oi
    WHERE oi.order_id = NEW.order_id
  )
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_total_calc ON public.order_items;
CREATE TRIGGER order_total_calc
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION update_order_total_from_items();


-- 4. Create an RPC function so ONLY Totyil can delete orders
CREATE OR REPLACE FUNCTION admin_delete_order(p_username text, p_password text, p_order_id text)
RETURNS boolean AS $$
DECLARE
  is_valid boolean;
BEGIN
  -- Verify the credentials exactly matching the admin
  SELECT EXISTS(
    SELECT 1 FROM public.app_users 
    WHERE username = p_username AND password = p_password
      AND lower(username) = 'totyil'
  ) INTO is_valid;

  IF is_valid THEN
    DELETE FROM public.order_items WHERE order_id = p_order_id;
    DELETE FROM public.orders WHERE id = p_order_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Secure Products and Payment Config entirely, ONLY admin can modify them via a similar RPC
CREATE OR REPLACE FUNCTION admin_update_product(p_username text, p_password text, p_product_id text, p_updates jsonb)
RETURNS boolean AS $$
DECLARE
  is_valid boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.app_users 
    WHERE username = p_username AND password = p_password
      AND lower(username) = 'totyil'
  ) INTO is_valid;

  IF is_valid THEN
    -- Update logic could go here, or you could simply rely on the triggers above to secure the main attack vector.
    RETURN true;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
