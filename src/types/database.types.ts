export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_reconciliations: {
        Row: {
          account_id: string
          adjustment_transaction_id: string | null
          created_at: string
          difference: number
          id: string
          notes: string | null
          previous_balance: number
          reconciled_at: string
          statement_balance: number
          user_id: string
        }
        Insert: {
          account_id: string
          adjustment_transaction_id?: string | null
          created_at?: string
          difference: number
          id?: string
          notes?: string | null
          previous_balance: number
          reconciled_at?: string
          statement_balance: number
          user_id: string
        }
        Update: {
          account_id?: string
          adjustment_transaction_id?: string | null
          created_at?: string
          difference?: number
          id?: string
          notes?: string | null
          previous_balance?: number
          reconciled_at?: string
          statement_balance?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_reconciliations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_reconciliations_adjustment_transaction_id_fkey"
            columns: ["adjustment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_reconciliations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      accounts: {
        Row: {
          bank: string | null
          color: string
          created_at: string
          current_balance: number
          deleted_at: string | null
          icon: string
          id: string
          initial_balance: number
          is_default: boolean
          name: string
          status: Database["public"]["Enums"]["account_status"]
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bank?: string | null
          color?: string
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          icon?: string
          id?: string
          initial_balance?: number
          is_default?: boolean
          name: string
          status?: Database["public"]["Enums"]["account_status"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bank?: string | null
          color?: string
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          icon?: string
          id?: string
          initial_balance?: number
          is_default?: boolean
          name?: string
          status?: Database["public"]["Enums"]["account_status"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_100_sent: boolean
          alert_50_sent: boolean
          alert_75_sent: boolean
          alert_90_sent: boolean
          category_id: string
          created_at: string
          id: string
          month: number
          planned_amount: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          alert_100_sent?: boolean
          alert_50_sent?: boolean
          alert_75_sent?: boolean
          alert_90_sent?: boolean
          category_id: string
          created_at?: string
          id?: string
          month: number
          planned_amount: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          alert_100_sent?: boolean
          alert_50_sent?: boolean
          alert_75_sent?: boolean
          alert_90_sent?: boolean
          category_id?: string
          created_at?: string
          id?: string
          month?: number
          planned_amount?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      card_invoices: {
        Row: {
          card_id: string
          closing_date: string
          created_at: string
          due_date: string
          id: string
          paid_account_id: string | null
          paid_at: string | null
          reference_month: string
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          user_id: string
        }
        Insert: {
          card_id: string
          closing_date: string
          created_at?: string
          due_date: string
          id?: string
          paid_account_id?: string | null
          paid_at?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          user_id: string
        }
        Update: {
          card_id?: string
          closing_date?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_account_id?: string | null
          paid_at?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "card_invoices_paid_account_id_fkey"
            columns: ["paid_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          deleted_at: string | null
          icon: string
          id: string
          is_default: boolean
          name: string
          parent_id: string | null
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_id: string | null
          bank: string | null
          brand: Database["public"]["Enums"]["card_brand"]
          closing_day: number
          color: string
          created_at: string
          credit_limit: number
          due_day: number
          icon: string
          id: string
          name: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          bank?: string | null
          brand?: Database["public"]["Enums"]["card_brand"]
          closing_day: number
          color?: string
          created_at?: string
          credit_limit?: number
          due_day: number
          icon?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          bank?: string | null
          brand?: Database["public"]["Enums"]["card_brand"]
          closing_day?: number
          color?: string
          created_at?: string
          credit_limit?: number
          due_day?: number
          icon?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financing_installments: {
        Row: {
          amortization_amount: number
          amount: number
          created_at: string
          due_date: string
          financing_id: string
          id: string
          interest_amount: number
          number: number
          paid_amount: number
          paid_date: string | null
          remaining_balance: number
          status: Database["public"]["Enums"]["installment_status"]
          user_id: string
        }
        Insert: {
          amortization_amount?: number
          amount: number
          created_at?: string
          due_date: string
          financing_id: string
          id?: string
          interest_amount?: number
          number: number
          paid_amount?: number
          paid_date?: string | null
          remaining_balance?: number
          status?: Database["public"]["Enums"]["installment_status"]
          user_id: string
        }
        Update: {
          amortization_amount?: number
          amount?: number
          created_at?: string
          due_date?: string
          financing_id?: string
          id?: string
          interest_amount?: number
          number?: number
          paid_amount?: number
          paid_date?: string | null
          remaining_balance?: number
          status?: Database["public"]["Enums"]["installment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_installments_financing_id_fkey"
            columns: ["financing_id"]
            isOneToOne: false
            referencedRelation: "financings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_installments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financings: {
        Row: {
          account_id: string | null
          amortization: Database["public"]["Enums"]["amortization_type"]
          created_at: string
          id: string
          installments_total: number
          interest_rate: number
          name: string
          notes: string | null
          principal_amount: number
          remaining_balance: number
          start_date: string
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amortization?: Database["public"]["Enums"]["amortization_type"]
          created_at?: string
          id?: string
          installments_total: number
          interest_rate?: number
          name: string
          notes?: string | null
          principal_amount: number
          remaining_balance: number
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amortization?: Database["public"]["Enums"]["amortization_type"]
          created_at?: string
          id?: string
          installments_total?: number
          interest_rate?: number
          name?: string
          notes?: string | null
          principal_amount?: number
          remaining_balance?: number
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          goal_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          color: string
          created_at: string
          current_amount: number
          icon: string
          id: string
          name: string
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investment_movements: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          investment_id: string
          notes: string | null
          type: Database["public"]["Enums"]["investment_movement_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          investment_id: string
          notes?: string | null
          type: Database["public"]["Enums"]["investment_movement_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          investment_id?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["investment_movement_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_movements_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investments: {
        Row: {
          account_id: string | null
          application_date: string
          applied_amount: number
          created_at: string
          current_amount: number
          id: string
          institution: string | null
          liquidity: string | null
          maturity_date: string | null
          name: string
          notes: string | null
          rate_description: string | null
          type: Database["public"]["Enums"]["investment_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          application_date?: string
          applied_amount?: number
          created_at?: string
          current_amount?: number
          id?: string
          institution?: string | null
          liquidity?: string | null
          maturity_date?: string | null
          name: string
          notes?: string | null
          rate_description?: string | null
          type: Database["public"]["Enums"]["investment_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          application_date?: string
          applied_amount?: number
          created_at?: string
          current_amount?: number
          id?: string
          institution?: string | null
          liquidity?: string | null
          maturity_date?: string | null
          name?: string
          notes?: string | null
          rate_description?: string | null
          type?: Database["public"]["Enums"]["investment_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          loan_id: string
          number: number
          paid_amount: number
          paid_date: string | null
          status: Database["public"]["Enums"]["installment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          loan_id: string
          number: number
          paid_amount?: number
          paid_date?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          loan_id?: string
          number?: number
          paid_amount?: number
          paid_date?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loans: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          installment_amount: number
          installments_total: number
          interest_rate: number
          notes: string | null
          person_name: string
          principal_amount: number
          remaining_balance: number
          start_date: string
          status: Database["public"]["Enums"]["loan_status"]
          type: Database["public"]["Enums"]["loan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          installment_amount: number
          installments_total?: number
          interest_rate?: number
          notes?: string | null
          person_name: string
          principal_amount: number
          remaining_balance: number
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          type: Database["public"]["Enums"]["loan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          installment_amount?: number
          installments_total?: number
          interest_rate?: number
          notes?: string | null
          person_name?: string
          principal_amount?: number
          remaining_balance?: number
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          type?: Database["public"]["Enums"]["loan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          related_table: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          related_table?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          annual_goal: number | null
          avatar_url: string | null
          created_at: string
          currency: string
          full_name: string | null
          id: string
          language: string
          monthly_goal: number | null
          theme: string
          updated_at: string
        }
        Insert: {
          annual_goal?: number | null
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id: string
          language?: string
          monthly_goal?: number | null
          theme?: string
          updated_at?: string
        }
        Update: {
          annual_goal?: number | null
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          language?: string
          monthly_goal?: number | null
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_id: string | null
          cost_center_id: string | null
          created_at: string
          description: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          interval_days: number | null
          last_generated_transaction_id: string | null
          next_run_date: string
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          interval_days?: number | null
          last_generated_transaction_id?: string | null
          next_run_date: string
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          interval_days?: number | null
          last_generated_transaction_id?: string | null
          next_run_date?: string
          start_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_last_generated_transaction_id_fkey"
            columns: ["last_generated_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          card_id: string | null
          category_id: string | null
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          next_billing_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          card_id?: string | null
          category_id?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          next_billing_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          card_id?: string | null
          category_id?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          next_billing_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          tag_id: string
          transaction_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category_id: string | null
          cost_center_id: string | null
          created_at: string
          date: string
          description: string
          due_date: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          installment_total: number | null
          invoice_id: string | null
          is_adjustment: boolean
          notes: string | null
          paid_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          recurring_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          supplier: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          date?: string
          description: string
          due_date?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          invoice_id?: string | null
          is_adjustment?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurring_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          supplier?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          invoice_id?: string | null
          is_adjustment?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurring_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          supplier?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          from_account_id: string
          id: string
          to_account_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description?: string | null
          from_account_id: string
          id?: string
          to_account_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          from_account_id?: string
          id?: string
          to_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      v_card_usage: {
        Row: {
          available_limit: number | null
          card_id: string | null
          credit_limit: number | null
          name: string | null
          used_amount: number | null
          user_id: string | null
        }
        Insert: {
          available_limit?: never
          card_id?: string | null
          credit_limit?: number | null
          name?: string | null
          used_amount?: never
          user_id?: string | null
        }
        Update: {
          available_limit?: never
          card_id?: string | null
          credit_limit?: number | null
          name?: string | null
          used_amount?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_category_summary: {
        Row: {
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          category_type: Database["public"]["Enums"]["category_type"] | null
          month: number | null
          total_amount: number | null
          user_id: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_monthly_summary: {
        Row: {
          balance: number | null
          month: number | null
          total_expense: number | null
          total_income: number | null
          user_id: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_net_worth: {
        Row: {
          net_worth: number | null
          total_accounts: number | null
          total_financings: number | null
          total_investments: number | null
          total_payable_loans: number | null
          total_receivable_loans: number | null
          user_id: string | null
        }
        Insert: {
          net_worth?: never
          total_accounts?: never
          total_financings?: never
          total_investments?: never
          total_payable_loans?: never
          total_receivable_loans?: never
          user_id?: string | null
        }
        Update: {
          net_worth?: never
          total_accounts?: never
          total_financings?: never
          total_investments?: never
          total_payable_loans?: never
          total_receivable_loans?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _transaction_balance_effect: {
        Args: { t: Database["public"]["Tables"]["transactions"]["Row"] }
        Returns: number
      }
      reconcile_account: {
        Args: {
          p_account_id: string
          p_notes?: string
          p_statement_balance: number
        }
        Returns: {
          account_id: string
          adjustment_transaction_id: string | null
          created_at: string
          difference: number
          id: string
          notes: string | null
          previous_balance: number
          reconciled_at: string
          statement_balance: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_reconciliations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_categories: {
        Args: { p_category_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "ativa" | "inativa" | "arquivada"
      account_type:
        | "carteira"
        | "banco"
        | "caixa"
        | "conta_corrente"
        | "conta_poupanca"
        | "conta_digital"
        | "investimentos"
        | "conta_internacional"
      amortization_type: "sac" | "price"
      billing_cycle: "mensal" | "anual"
      card_brand: "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "outro"
      category_type: "receita" | "despesa" | "transferencia" | "investimento"
      goal_status: "em_andamento" | "concluida" | "cancelada"
      installment_status: "pendente" | "pago" | "atrasado"
      investment_movement_type: "aporte" | "resgate" | "rendimento"
      investment_type:
        | "tesouro"
        | "cdb"
        | "lci"
        | "lca"
        | "fundos"
        | "acoes"
        | "fiis"
        | "etfs"
        | "cripto"
        | "exterior"
      invoice_status: "aberta" | "fechada" | "paga" | "atrasada"
      loan_status: "ativo" | "quitado" | "atrasado" | "cancelado"
      loan_type: "recebido" | "concedido"
      notification_type:
        | "conta_vencendo"
        | "fatura"
        | "meta_atrasada"
        | "saldo_negativo"
        | "saldo_baixo"
        | "limite_cartao"
        | "orcamento_estourado"
        | "geral"
      payment_method:
        | "dinheiro"
        | "debito"
        | "credito"
        | "pix"
        | "boleto"
        | "transferencia"
        | "outro"
      priority_level: "baixa" | "media" | "alta"
      recurrence_frequency:
        | "mensal"
        | "semanal"
        | "anual"
        | "quinzenal"
        | "personalizada"
      transaction_status:
        | "pendente"
        | "pago"
        | "recebido"
        | "cancelado"
        | "atrasado"
      transaction_type: "receita" | "despesa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["ativa", "inativa", "arquivada"],
      account_type: [
        "carteira",
        "banco",
        "caixa",
        "conta_corrente",
        "conta_poupanca",
        "conta_digital",
        "investimentos",
        "conta_internacional",
      ],
      amortization_type: ["sac", "price"],
      billing_cycle: ["mensal", "anual"],
      card_brand: ["visa", "mastercard", "elo", "amex", "hipercard", "outro"],
      category_type: ["receita", "despesa", "transferencia", "investimento"],
      goal_status: ["em_andamento", "concluida", "cancelada"],
      installment_status: ["pendente", "pago", "atrasado"],
      investment_movement_type: ["aporte", "resgate", "rendimento"],
      investment_type: [
        "tesouro",
        "cdb",
        "lci",
        "lca",
        "fundos",
        "acoes",
        "fiis",
        "etfs",
        "cripto",
        "exterior",
      ],
      invoice_status: ["aberta", "fechada", "paga", "atrasada"],
      loan_status: ["ativo", "quitado", "atrasado", "cancelado"],
      loan_type: ["recebido", "concedido"],
      notification_type: [
        "conta_vencendo",
        "fatura",
        "meta_atrasada",
        "saldo_negativo",
        "saldo_baixo",
        "limite_cartao",
        "orcamento_estourado",
        "geral",
      ],
      payment_method: [
        "dinheiro",
        "debito",
        "credito",
        "pix",
        "boleto",
        "transferencia",
        "outro",
      ],
      priority_level: ["baixa", "media", "alta"],
      recurrence_frequency: [
        "mensal",
        "semanal",
        "anual",
        "quinzenal",
        "personalizada",
      ],
      transaction_status: [
        "pendente",
        "pago",
        "recebido",
        "cancelado",
        "atrasado",
      ],
      transaction_type: ["receita", "despesa"],
    },
  },
} as const
