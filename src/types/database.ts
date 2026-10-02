export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          biteship_area_id: string | null;
          city: string;
          created_at: string;
          district: string;
          full_address: string;
          id: string;
          is_default: boolean;
          label: string | null;
          latitude: number | null;
          longitude: number | null;
          phone: string;
          postal_code: string;
          province: string;
          recipient: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          biteship_area_id?: string | null;
          city: string;
          created_at?: string;
          district: string;
          full_address: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone: string;
          postal_code: string;
          province: string;
          recipient: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          biteship_area_id?: string | null;
          city?: string;
          created_at?: string;
          district?: string;
          full_address?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string;
          postal_code?: string;
          province?: string;
          recipient?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["app_role"] | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          created_at: string;
          ends_at: string | null;
          id: string;
          image_public_id: string;
          is_active: boolean;
          link_url: string | null;
          mobile_image_public_id: string | null;
          placement: string;
          sort_order: number;
          starts_at: string | null;
          subtitle: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          image_public_id: string;
          is_active?: boolean;
          link_url?: string | null;
          mobile_image_public_id?: string | null;
          placement?: string;
          sort_order?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          image_public_id?: string;
          is_active?: boolean;
          link_url?: string | null;
          mobile_image_public_id?: string | null;
          placement?: string;
          sort_order?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          logo_public_id: string | null;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          logo_public_id?: string | null;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          logo_public_id?: string | null;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          cart_id: string;
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          updated_at: string;
          variant_id: string | null;
        };
        Insert: {
          cart_id: string;
          created_at?: string;
          id?: string;
          product_id: string;
          quantity: number;
          updated_at?: string;
          variant_id?: string | null;
        };
        Update: {
          cart_id?: string;
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_public_id: string | null;
          is_active: boolean;
          is_automotive: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_public_id?: string | null;
          is_active?: boolean;
          is_automotive?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_public_id?: string | null;
          is_active?: boolean;
          is_automotive?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      flash_sale_items: {
        Row: {
          flash_sale_id: string;
          id: string;
          product_id: string;
          quota: number | null;
          sale_price: number;
          sold: number;
          sort_order: number;
          variant_id: string | null;
        };
        Insert: {
          flash_sale_id: string;
          id?: string;
          product_id: string;
          quota?: number | null;
          sale_price: number;
          sold?: number;
          sort_order?: number;
          variant_id?: string | null;
        };
        Update: {
          flash_sale_id?: string;
          id?: string;
          product_id?: string;
          quota?: number | null;
          sale_price?: number;
          sold?: number;
          sort_order?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "flash_sale_items_flash_sale_id_fkey";
            columns: ["flash_sale_id"];
            isOneToOne: false;
            referencedRelation: "flash_sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flash_sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flash_sale_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      flash_sales: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          is_active: boolean;
          name: string;
          starts_at: string;
          subtitle: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          is_active?: boolean;
          name: string;
          starts_at: string;
          subtitle?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          starts_at?: string;
          subtitle?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          created_at: string;
          created_by: string | null;
          failed_rows: number;
          file_name: string | null;
          finished_at: string | null;
          id: string;
          is_dry_run: boolean;
          skipped_rows: number;
          source: Database["public"]["Enums"]["import_source"];
          started_at: string | null;
          status: Database["public"]["Enums"]["import_status"];
          success_rows: number;
          total_rows: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          failed_rows?: number;
          file_name?: string | null;
          finished_at?: string | null;
          id?: string;
          is_dry_run?: boolean;
          skipped_rows?: number;
          source: Database["public"]["Enums"]["import_source"];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["import_status"];
          success_rows?: number;
          total_rows?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          failed_rows?: number;
          file_name?: string | null;
          finished_at?: string | null;
          id?: string;
          is_dry_run?: boolean;
          skipped_rows?: number;
          source?: Database["public"]["Enums"]["import_source"];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["import_status"];
          success_rows?: number;
          total_rows?: number;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      import_logs: {
        Row: {
          batch_id: string;
          created_at: string;
          id: number;
          level: string;
          message: string;
          sku: string | null;
        };
        Insert: {
          batch_id: string;
          created_at?: string;
          id?: never;
          level?: string;
          message: string;
          sku?: string | null;
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          id?: never;
          level?: string;
          message?: string;
          sku?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "import_logs_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      import_products: {
        Row: {
          batch_id: string;
          created_at: string;
          error: string | null;
          id: string;
          jubelio_item_id: string | null;
          mapped: Json | null;
          product_id: string | null;
          raw: Json;
          sku: string | null;
          status: Database["public"]["Enums"]["import_row_status"];
          updated_at: string;
        };
        Insert: {
          batch_id: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          jubelio_item_id?: string | null;
          mapped?: Json | null;
          product_id?: string | null;
          raw: Json;
          sku?: string | null;
          status?: Database["public"]["Enums"]["import_row_status"];
          updated_at?: string;
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          jubelio_item_id?: string | null;
          mapped?: Json | null;
          product_id?: string | null;
          raw?: Json;
          sku?: string | null;
          status?: Database["public"]["Enums"]["import_row_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_products_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: number;
          product_id: string;
          quantity: number;
          reason: string | null;
          reference_id: string | null;
          reference_type: string | null;
          type: Database["public"]["Enums"]["inventory_movement_type"];
          variant_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          product_id: string;
          quantity: number;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          type: Database["public"]["Enums"]["inventory_movement_type"];
          variant_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          product_id?: string;
          quantity?: number;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          type?: Database["public"]["Enums"]["inventory_movement_type"];
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          sku: string;
          unit_price: number;
          variant_id: string | null;
          variant_name: string | null;
          weight_grams: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          sku: string;
          unit_price: number;
          variant_id?: string | null;
          variant_name?: string | null;
          weight_grams?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          sku?: string;
          unit_price?: number;
          variant_id?: string | null;
          variant_name?: string | null;
          weight_grams?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          id: number;
          note: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: never;
          note?: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: never;
          note?: string | null;
          order_id?: string;
          to_status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          customer_note: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_number: string;
          paid_at: string | null;
          payment_due_at: string | null;
          payment_provider: Database["public"]["Enums"]["payment_provider"] | null;
          shipping_address: Json;
          shipping_cost: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          unique_code: number;
          updated_at: string;
          user_id: string;
          voucher_id: string | null;
        };
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          customer_note?: string | null;
          discount_total?: number;
          grand_total: number;
          id?: string;
          order_number: string;
          paid_at?: string | null;
          payment_due_at?: string | null;
          payment_provider?: Database["public"]["Enums"]["payment_provider"] | null;
          shipping_address: Json;
          shipping_cost?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          unique_code?: number;
          updated_at?: string;
          user_id: string;
          voucher_id?: string | null;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          customer_note?: string | null;
          discount_total?: number;
          grand_total?: number;
          id?: string;
          order_number?: string;
          paid_at?: string | null;
          payment_due_at?: string | null;
          payment_provider?: Database["public"]["Enums"]["payment_provider"] | null;
          shipping_address?: Json;
          shipping_cost?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          unique_code?: number;
          updated_at?: string;
          user_id?: string;
          voucher_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_voucher_id_fkey";
            columns: ["voucher_id"];
            isOneToOne: false;
            referencedRelation: "vouchers";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_proofs: {
        Row: {
          created_at: string;
          id: string;
          mime_type: string;
          order_id: string;
          payment_id: string | null;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          size_bytes: number;
          status: Database["public"]["Enums"]["proof_status"];
          storage_path: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mime_type: string;
          order_id: string;
          payment_id?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          size_bytes: number;
          status?: Database["public"]["Enums"]["proof_status"];
          storage_path: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mime_type?: string;
          order_id?: string;
          payment_id?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          size_bytes?: number;
          status?: Database["public"]["Enums"]["proof_status"];
          storage_path?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_proofs_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_proofs_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_proofs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          checkout_url: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          order_id: string;
          paid_at: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_ref: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount: number;
          checkout_url?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          order_id: string;
          paid_at?: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_ref?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          checkout_url?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          order_id?: string;
          paid_at?: string | null;
          provider?: Database["public"]["Enums"]["payment_provider"];
          provider_ref?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          category_id: string;
          product_id: string;
        };
        Insert: {
          category_id: string;
          product_id: string;
        };
        Update: {
          category_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_fitments: {
        Row: {
          created_at: string;
          id: string;
          model_id: string;
          notes: string | null;
          product_id: string;
          year_end: number | null;
          year_start: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          model_id: string;
          notes?: string | null;
          product_id: string;
          year_end?: number | null;
          year_start?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          model_id?: string;
          notes?: string | null;
          product_id?: string;
          year_end?: number | null;
          year_start?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_fitments_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_fitments_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          height: number | null;
          id: string;
          product_id: string;
          public_id: string;
          sort_order: number;
          variant_id: string | null;
          width: number | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          product_id: string;
          public_id: string;
          sort_order?: number;
          variant_id?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          product_id?: string;
          public_id?: string;
          sort_order?: number;
          variant_id?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_specs: {
        Row: {
          id: string;
          label: string;
          product_id: string;
          sort_order: number;
          value: string;
        };
        Insert: {
          id?: string;
          label: string;
          product_id: string;
          sort_order?: number;
          value: string;
        };
        Update: {
          id?: string;
          label?: string;
          product_id?: string;
          sort_order?: number;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          compare_at_price: number | null;
          created_at: string;
          id: string;
          image_public_id: string | null;
          is_active: boolean;
          jubelio_item_id: string | null;
          name: string;
          options: Json;
          price: number | null;
          product_id: string;
          sku: string;
          sort_order: number;
          stock: number;
          updated_at: string;
          weight_grams: number | null;
        };
        Insert: {
          compare_at_price?: number | null;
          created_at?: string;
          id?: string;
          image_public_id?: string | null;
          is_active?: boolean;
          jubelio_item_id?: string | null;
          name: string;
          options?: Json;
          price?: number | null;
          product_id: string;
          sku: string;
          sort_order?: number;
          stock?: number;
          updated_at?: string;
          weight_grams?: number | null;
        };
        Update: {
          compare_at_price?: number | null;
          created_at?: string;
          id?: string;
          image_public_id?: string | null;
          is_active?: boolean;
          jubelio_item_id?: string | null;
          name?: string;
          options?: Json;
          price?: number | null;
          product_id?: string;
          sku?: string;
          sort_order?: number;
          stock?: number;
          updated_at?: string;
          weight_grams?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          average_rating: number;
          brand_id: string | null;
          compare_at_price: number | null;
          created_at: string;
          description: string | null;
          height_mm: number | null;
          id: string;
          installation_guide: string | null;
          jubelio_item_id: string | null;
          length_mm: number | null;
          meta_description: string | null;
          meta_title: string | null;
          name: string;
          price: number;
          published_at: string | null;
          review_count: number;
          search_vector: unknown;
          short_description: string | null;
          sku: string;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          stock: number;
          total_sold: number;
          updated_at: string;
          warranty_info: string | null;
          weight_grams: number | null;
          width_mm: number | null;
        };
        Insert: {
          average_rating?: number;
          brand_id?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          height_mm?: number | null;
          id?: string;
          installation_guide?: string | null;
          jubelio_item_id?: string | null;
          length_mm?: number | null;
          meta_description?: string | null;
          meta_title?: string | null;
          name: string;
          price: number;
          published_at?: string | null;
          review_count?: number;
          search_vector?: unknown;
          short_description?: string | null;
          sku: string;
          slug: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock?: number;
          total_sold?: number;
          updated_at?: string;
          warranty_info?: string | null;
          weight_grams?: number | null;
          width_mm?: number | null;
        };
        Update: {
          average_rating?: number;
          brand_id?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          height_mm?: number | null;
          id?: string;
          installation_guide?: string | null;
          jubelio_item_id?: string | null;
          length_mm?: number | null;
          meta_description?: string | null;
          meta_title?: string | null;
          name?: string;
          price?: number;
          published_at?: string | null;
          review_count?: number;
          search_vector?: unknown;
          short_description?: string | null;
          sku?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock?: number;
          total_sold?: number;
          updated_at?: string;
          warranty_info?: string | null;
          weight_grams?: number | null;
          width_mm?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          full_name: string | null;
          id: string;
          is_blocked: boolean;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string | null;
          id: string;
          is_blocked?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string | null;
          id?: string;
          is_blocked?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      returns: {
        Row: {
          admin_note: string | null;
          created_at: string;
          description: string | null;
          id: string;
          media_paths: string[];
          order_id: string;
          order_item_id: string | null;
          reason: string;
          resolution: string | null;
          return_awb: string | null;
          status: Database["public"]["Enums"]["return_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          media_paths?: string[];
          order_id: string;
          order_item_id?: string | null;
          reason: string;
          resolution?: string | null;
          return_awb?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          media_paths?: string[];
          order_id?: string;
          order_item_id?: string | null;
          reason?: string;
          resolution?: string | null;
          return_awb?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          image_paths: string[];
          order_item_id: string;
          product_id: string;
          rating: number;
          replied_at: string | null;
          replied_by: string | null;
          reply: string | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          image_paths?: string[];
          order_item_id: string;
          product_id: string;
          rating: number;
          replied_at?: string | null;
          replied_by?: string | null;
          reply?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          image_paths?: string[];
          order_item_id?: string;
          product_id?: string;
          rating?: number;
          replied_at?: string | null;
          replied_by?: string | null;
          reply?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: true;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_replied_by_fkey";
            columns: ["replied_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          biteship_order_id: string | null;
          cost: number;
          courier_code: string;
          courier_service: string;
          created_at: string;
          delivered_at: string | null;
          id: string;
          order_id: string;
          shipped_at: string | null;
          status: Database["public"]["Enums"]["shipment_status"];
          updated_at: string;
          waybill_number: string | null;
        };
        Insert: {
          biteship_order_id?: string | null;
          cost?: number;
          courier_code: string;
          courier_service: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          order_id: string;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          updated_at?: string;
          waybill_number?: string | null;
        };
        Update: {
          biteship_order_id?: string | null;
          cost?: number;
          courier_code?: string;
          courier_service?: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          order_id?: string;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          updated_at?: string;
          waybill_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_reservations: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status: Database["public"]["Enums"]["reservation_status"];
          updated_at: string;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status?: Database["public"]["Enums"]["reservation_status"];
          updated_at?: string;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          status?: Database["public"]["Enums"]["reservation_status"];
          updated_at?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_fk";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      store_settings: {
        Row: {
          bank_accounts: Json;
          id: boolean;
          low_stock_threshold: number;
          manual_transfer_enabled: boolean;
          mayar_enabled: boolean;
          payment_timeout_minutes: number;
          require_staff_mfa: boolean;
          shipper: Json;
          store_name: string;
          support_email: string | null;
          support_whatsapp: string | null;
          updated_at: string;
        };
        Insert: {
          bank_accounts?: Json;
          id?: boolean;
          low_stock_threshold?: number;
          manual_transfer_enabled?: boolean;
          mayar_enabled?: boolean;
          payment_timeout_minutes?: number;
          require_staff_mfa?: boolean;
          shipper?: Json;
          store_name?: string;
          support_email?: string | null;
          support_whatsapp?: string | null;
          updated_at?: string;
        };
        Update: {
          bank_accounts?: Json;
          id?: boolean;
          low_stock_threshold?: number;
          manual_transfer_enabled?: boolean;
          mayar_enabled?: boolean;
          payment_timeout_minutes?: number;
          require_staff_mfa?: boolean;
          shipper?: Json;
          store_name?: string;
          support_email?: string | null;
          support_whatsapp?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_vehicles: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          model_id: string;
          nickname: string | null;
          updated_at: string;
          user_id: string;
          year: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          model_id: string;
          nickname?: string | null;
          updated_at?: string;
          user_id: string;
          year: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          model_id?: string;
          nickname?: string | null;
          updated_at?: string;
          user_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_vehicles_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_vehicles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_makes: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          logo_public_id: string | null;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          logo_public_id?: string | null;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          logo_public_id?: string | null;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"];
        };
        Relationships: [];
      };
      vehicle_models: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          make_id: string;
          name: string;
          slug: string;
          updated_at: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
          year_end: number | null;
          year_start: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          make_id: string;
          name: string;
          slug: string;
          updated_at?: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
          year_end?: number | null;
          year_start: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          make_id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"];
          year_end?: number | null;
          year_start?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey";
            columns: ["make_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_makes";
            referencedColumns: ["id"];
          },
        ];
      };
      voucher_redemptions: {
        Row: {
          created_at: string;
          discount_amount: number;
          id: string;
          order_id: string;
          user_id: string;
          voucher_id: string;
        };
        Insert: {
          created_at?: string;
          discount_amount: number;
          id?: string;
          order_id: string;
          user_id: string;
          voucher_id: string;
        };
        Update: {
          created_at?: string;
          discount_amount?: number;
          id?: string;
          order_id?: string;
          user_id?: string;
          voucher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_order_fk";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "voucher_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey";
            columns: ["voucher_id"];
            isOneToOne: false;
            referencedRelation: "vouchers";
            referencedColumns: ["id"];
          },
        ];
      };
      vouchers: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          max_discount: number | null;
          min_subtotal: number;
          per_user_limit: number;
          starts_at: string | null;
          updated_at: string;
          usage_limit: number | null;
          used_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_subtotal?: number;
          per_user_limit?: number;
          starts_at?: string | null;
          updated_at?: string;
          usage_limit?: number | null;
          used_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_subtotal?: number;
          per_user_limit?: number;
          starts_at?: string | null;
          updated_at?: string;
          usage_limit?: number | null;
          used_count?: number;
        };
        Relationships: [];
      };
      warranty_claims: {
        Row: {
          admin_note: string | null;
          created_at: string;
          description: string;
          id: string;
          media_paths: string[];
          order_item_id: string;
          resolution: string | null;
          status: Database["public"]["Enums"]["claim_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          media_paths?: string[];
          order_item_id: string;
          resolution?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          media_paths?: string[];
          order_item_id?: string;
          resolution?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warranty_claims_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warranty_claims_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          error: string | null;
          event_id: string;
          event_type: string | null;
          id: number;
          payload_hash: string | null;
          processed_at: string | null;
          provider: string;
          received_at: string;
        };
        Insert: {
          error?: string | null;
          event_id: string;
          event_type?: string | null;
          id?: never;
          payload_hash?: string | null;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
        };
        Update: {
          error?: string | null;
          event_id?: string;
          event_type?: string | null;
          id?: never;
          payload_hash?: string | null;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      set_user_blocked: {
        Args: { blocked: boolean; target_user: string };
        Returns: undefined;
      };
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"];
          target_user: string;
        };
        Returns: undefined;
      };
      staff_mfa_required: { Args: never; Returns: boolean };
    };
    Enums: {
      app_role: "owner" | "admin" | "warehouse" | "cs" | "customer";
      claim_status: "submitted" | "in_review" | "approved" | "rejected" | "resolved";
      discount_type: "percent" | "fixed";
      import_row_status: "pending" | "valid" | "invalid" | "committed" | "skipped";
      import_source: "jubelio" | "csv";
      import_status: "pending" | "running" | "completed" | "failed";
      inventory_movement_type:
        "initial" | "adjustment" | "import" | "sale" | "return" | "correction";
      order_status:
        | "pending_payment"
        | "awaiting_verification"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
        | "expired"
        | "refunded";
      payment_provider: "mayar" | "manual_transfer";
      payment_status:
        | "pending"
        | "awaiting_verification"
        | "paid"
        | "failed"
        | "expired"
        | "cancelled"
        | "refunded";
      product_status: "draft" | "published" | "archived";
      proof_status: "pending" | "approved" | "rejected";
      reservation_status: "active" | "released" | "consumed";
      return_status:
        | "requested"
        | "approved"
        | "rejected"
        | "item_shipped"
        | "item_received"
        | "refunded"
        | "completed";
      review_status: "pending" | "published" | "hidden";
      shipment_status:
        | "pending"
        | "confirmed"
        | "allocated"
        | "picking_up"
        | "picked"
        | "dropping_off"
        | "delivered"
        | "rejected"
        | "cancelled"
        | "returned";
      vehicle_type: "motorcycle" | "car";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "warehouse", "cs", "customer"],
      claim_status: ["submitted", "in_review", "approved", "rejected", "resolved"],
      discount_type: ["percent", "fixed"],
      import_row_status: ["pending", "valid", "invalid", "committed", "skipped"],
      import_source: ["jubelio", "csv"],
      import_status: ["pending", "running", "completed", "failed"],
      inventory_movement_type: ["initial", "adjustment", "import", "sale", "return", "correction"],
      order_status: [
        "pending_payment",
        "awaiting_verification",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "expired",
        "refunded",
      ],
      payment_provider: ["mayar", "manual_transfer"],
      payment_status: [
        "pending",
        "awaiting_verification",
        "paid",
        "failed",
        "expired",
        "cancelled",
        "refunded",
      ],
      product_status: ["draft", "published", "archived"],
      proof_status: ["pending", "approved", "rejected"],
      reservation_status: ["active", "released", "consumed"],
      return_status: [
        "requested",
        "approved",
        "rejected",
        "item_shipped",
        "item_received",
        "refunded",
        "completed",
      ],
      review_status: ["pending", "published", "hidden"],
      shipment_status: [
        "pending",
        "confirmed",
        "allocated",
        "picking_up",
        "picked",
        "dropping_off",
        "delivered",
        "rejected",
        "cancelled",
        "returned",
      ],
      vehicle_type: ["motorcycle", "car"],
    },
  },
} as const;
