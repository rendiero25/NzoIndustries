-- Tambah kolom first_login_done ke profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_login_done boolean NOT NULL DEFAULT false;

-- Update handle_new_user: insert welcome notification setelah buat profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'customer'
  );

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    NEW.id,
    'Selamat datang di GeekyTech!',
    'Akun kamu berhasil dibuat. Temukan produk tech & gadget terbaik di sini.',
    'welcome'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
