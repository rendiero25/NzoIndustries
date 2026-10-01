-- ============================================================
-- NZO Industries — 01 extensions & enums
-- ============================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

create type public.app_role as enum ('owner', 'admin', 'warehouse', 'cs', 'customer');

create type public.product_status as enum ('draft', 'published', 'archived');

create type public.vehicle_type as enum ('motorcycle', 'car');

create type public.order_status as enum (
  'pending_payment',
  'awaiting_verification',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'expired',
  'refunded'
);

create type public.payment_provider as enum ('mayar', 'manual_transfer');

create type public.payment_status as enum (
  'pending',
  'awaiting_verification',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refunded'
);

create type public.shipment_status as enum (
  'pending',
  'confirmed',
  'allocated',
  'picking_up',
  'picked',
  'dropping_off',
  'delivered',
  'rejected',
  'cancelled',
  'returned'
);

create type public.inventory_movement_type as enum (
  'initial',
  'adjustment',
  'import',
  'sale',
  'return',
  'correction'
);

create type public.reservation_status as enum ('active', 'released', 'consumed');

create type public.proof_status as enum ('pending', 'approved', 'rejected');

create type public.review_status as enum ('pending', 'published', 'hidden');

create type public.return_status as enum (
  'requested',
  'approved',
  'rejected',
  'item_shipped',
  'item_received',
  'refunded',
  'completed'
);

create type public.claim_status as enum (
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'resolved'
);

create type public.discount_type as enum ('percent', 'fixed');

create type public.import_source as enum ('jubelio', 'csv');

create type public.import_status as enum ('pending', 'running', 'completed', 'failed');

create type public.import_row_status as enum ('pending', 'valid', 'invalid', 'committed', 'skipped');
