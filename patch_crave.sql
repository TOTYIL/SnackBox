ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS crave_points_disabled boolean DEFAULT false;
UPDATE public.orders SET crave_points_disabled = true;
