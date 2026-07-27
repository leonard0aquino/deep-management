export type RelationshipStatus = "recente" | "ok" | "atencao" | "alerta" | "critico";

export type StakeholderInfluence = "baixa" | "media" | "alta";

export type StakeholderRisk = "baixo" | "medio" | "alto";

export type Link = { label: string; url: string };

export type CustomerSentiment = "positive" | "neutral" | "negative";

export type UserRole = "admin" | "gerente" | "analista";

export type RoadmapStatus = "planejado" | "em_andamento" | "concluido";

export type InteractionType =
  | "meeting"
  | "call"
  | "email"
  | "whatsapp"
  | "ticket"
  | "demo"
  | "implantacao"
  | "treinamento"
  | "incidente"
  | "encerramento"
  | "other";

export type DeepManager = {
  id: string;
  name: string;
  email: string | null;
  avatar_color: string | null;
  active: boolean;
  linked_user_id: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  active: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  segment: string | null;
  logo_url: string | null;
  contract_value: number | null;
  contract_renewal_date: string | null;
  active: boolean;
  custom_fields: Record<string, string>;
  created_at: string;
};

export type ClientContact = {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  influence: StakeholderInfluence;
  reports_to_contact_id: string | null;
  photo_url: string | null;
  created_at: string;
};

export type Interaction = {
  id: string;
  client_id: string;
  product_id: string;
  manager_id: string | null;
  contact_id: string | null;
  interaction_type: InteractionType;
  topic: string;
  notes: string | null;
  decisions: string | null;
  customer_sentiment: CustomerSentiment | null;
  risks: string | null;
  opportunities: string | null;
  next_step: string | null;
  next_step_owner: string | null;
  next_step_due_date: string | null;
  additional_participants: string[];
  confidential: boolean;
  relevance: number;
  occurred_at: string;
  links: Link[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InteractionView = Interaction & {
  client_name: string;
  product_name: string;
  product_color: string | null;
  manager_name: string | null;
  contact_name: string | null;
  days_since_contact: number;
  status: RelationshipStatus;
};

export type ClientProductMatrixRow = {
  client_id: string;
  client_name: string;
  product_id: string;
  product_name: string;
  product_color: string | null;
  last_contact: string;
  interaction_count: number;
  avg_relevance: number;
  days_since_contact: number;
  status: RelationshipStatus;
  recency_score: number;
  frequency_score: number;
  relevance_score: number;
  participation_score: number;
  diversity_score: number;
  composite_score: number;
};

export type HealthScore = {
  score: number;
  critical_count: number;
  tracked_combinations: number;
};

export type ClientHealth = {
  client_id: string;
  client_name: string;
  score: number;
  days_since_last_contact: number;
  tracked_products: number;
  critical_products: number;
};

export type StakeholderHealth = {
  contact_id: string;
  client_id: string;
  client_name: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  influence: StakeholderInfluence;
  photo_url: string | null;
  reports_to_contact_id: string | null;
  last_contact: string | null;
  interaction_count: number;
  days_since_contact: number | null;
  status: RelationshipStatus | "sem_contato";
  score: number;
  risk: StakeholderRisk;
};

export type HealthScoreSettings = {
  id: boolean;
  target_score: number;
  weight_recency: number;
  weight_frequency: number;
  weight_relevance: number;
  weight_participation: number;
  weight_diversity: number;
  threshold_recente_dias: number;
  threshold_ok_dias: number;
  threshold_atencao_dias: number;
  threshold_alerta_dias: number;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  name: string | null;
  role: UserRole;
  created_at: string;
};

export type ProductRoadmapItem = {
  id: string;
  product_id: string;
  title: string;
  status: RoadmapStatus;
  target_quarter: string | null;
  created_at: string;
};

export type TopicTag = {
  id: string;
  name: string;
  created_at: string;
};

export type InteractionTemplate = {
  id: string;
  name: string;
  interaction_type: InteractionType;
  topic: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  read_at: string | null;
  severity: "info" | "warning" | "critical" | "opportunity";
  category: "risk" | "opportunity" | "relationship" | "system";
  dedupe_key: string | null;
  created_at: string;
};

export type NotificationPreference = {
  user_id: string;
  risk: boolean;
  opportunity: boolean;
  relationship: boolean;
  system: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiKey = {
  id: string;
  label: string;
  key_hash: string;
  key_prefix: string;
  created_by: string | null;
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
};

export type AuditLog = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  actor: string | null;
  diff: unknown;
  created_at: string;
};

export type AuditLogEntry = AuditLog & {
  actor_name: string | null;
  actor_email: string | null;
};

export type ActionDecision = {
  id: string;
  user_id: string;
  action_key: string;
  status: "dismissed";
  created_at: string;
  updated_at: string;
};

export type ActionTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "postponed"
  | "dismissed";

export type ActionTask = {
  id: string;
  action_key: string;
  client_id: string;
  client_name: string;
  product_id: string;
  product_name: string;
  priority: "alta" | "media";
  reason: string;
  status: ActionTaskStatus;
  assigned_to: string | null;
  due_date: string;
  justification: string | null;
  result: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ActionTaskEventType =
  | "created"
  | "assigned"
  | "started"
  | "completed"
  | "postponed"
  | "dismissed"
  | "reopened"
  | "due_date_changed"
  | "updated";

export type ActionTaskEvent = {
  id: string;
  task_id: string;
  event_type: ActionTaskEventType;
  from_status: ActionTaskStatus | null;
  to_status: ActionTaskStatus;
  actor_id: string | null;
  assigned_to: string | null;
  due_date: string;
  justification: string | null;
  result: string | null;
  created_at: string;
};

export type AssignableActionUser = {
  id: string;
  name: string;
};

export type SavedDashboardView = {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, string>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type View<Row> = {
  Row: Row;
  Relationships: [];
};

type InteractionInsert = Omit<
  Interaction,
  | "id"
  | "created_at"
  | "updated_at"
  | "notes"
  | "decisions"
  | "customer_sentiment"
  | "risks"
  | "opportunities"
  | "next_step"
  | "next_step_owner"
  | "next_step_due_date"
  | "additional_participants"
  | "confidential"
  | "created_by"
  | "links"
> & {
  id?: string;
  notes?: string | null;
  decisions?: string | null;
  customer_sentiment?: CustomerSentiment | null;
  risks?: string | null;
  opportunities?: string | null;
  next_step?: string | null;
  next_step_owner?: string | null;
  next_step_due_date?: string | null;
  additional_participants?: string[];
  confidential?: boolean;
  created_by?: string | null;
  links?: Link[];
};
type InteractionUpdate = Partial<InteractionInsert>;

type ClientInsert = Partial<Omit<Client, "id" | "name" | "created_at" | "custom_fields">> & {
  id?: string;
  name: string;
  custom_fields?: Record<string, string>;
  created_at?: string;
};
type ClientUpdate = Partial<Omit<Client, "id" | "created_at" | "custom_fields">>;

type ProductInsert = Partial<Omit<Product, "id" | "name" | "slug" | "created_at">> & {
  id?: string;
  name: string;
  slug: string;
  created_at?: string;
};
type ProductUpdate = Partial<Omit<Product, "id" | "created_at">>;

type DeepManagerInsert = Partial<Omit<DeepManager, "id" | "name" | "created_at">> & {
  id?: string;
  name: string;
  created_at?: string;
};
type ClientContactUpdate = Partial<Omit<ClientContact, "id" | "client_id" | "created_at">>;

type ClientContactInsert = Partial<
  Omit<ClientContact, "id" | "client_id" | "name" | "created_at" | "influence">
> & {
  id?: string;
  client_id: string;
  name: string;
  influence?: StakeholderInfluence;
  created_at?: string;
};

type HealthScoreSettingsUpdate = Partial<Omit<HealthScoreSettings, "id" | "updated_at">>;

type UserProfileInsert = Omit<UserProfile, "created_at"> & { created_at?: string };
type UserProfileUpdate = Partial<Omit<UserProfile, "id" | "created_at">>;

type ProductRoadmapItemInsert = Omit<
  ProductRoadmapItem,
  "id" | "created_at" | "status" | "target_quarter"
> & {
  id?: string;
  status?: RoadmapStatus;
  target_quarter?: string | null;
  created_at?: string;
};

type TopicTagInsert = Omit<TopicTag, "id" | "created_at"> & { id?: string; created_at?: string };

type InteractionTemplateInsert = Omit<InteractionTemplate, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

type NotificationInsert = Omit<Notification, "id" | "created_at" | "read" | "read_at" | "severity" | "category"> & {
  id?: string;
  read?: boolean;
  read_at?: string | null;
  severity?: Notification["severity"];
  category?: Notification["category"];
  created_at?: string;
};
type NotificationUpdate = Partial<Pick<Notification, "read" | "read_at">>;
type NotificationPreferenceInsert = Omit<NotificationPreference, "created_at" | "updated_at"> & {
  created_at?: string; updated_at?: string;
};
type NotificationPreferenceUpdate = Partial<Pick<NotificationPreference, "risk" | "opportunity" | "relationship" | "system">>;

type ApiKeyInsert = Omit<ApiKey, "id" | "created_at" | "last_used_at" | "revoked"> & {
  id?: string;
  last_used_at?: string | null;
  revoked?: boolean;
  created_at?: string;
};
type ApiKeyUpdate = Partial<Pick<ApiKey, "revoked" | "last_used_at">>;

type ActionDecisionInsert = Omit<ActionDecision, "id" | "created_at" | "updated_at" | "status"> & {
  id?: string;
  status?: "dismissed";
  created_at?: string;
  updated_at?: string;
};
type ActionDecisionUpdate = Partial<Pick<ActionDecision, "status">>;
type ActionTaskInsert = Omit<
  ActionTask,
  "id" | "client_name" | "product_name" | "created_by" | "updated_by" | "created_at" | "updated_at" | "status" | "assigned_to" | "justification" | "result"
> & {
  id?: string;
  status?: ActionTaskStatus;
  assigned_to?: string | null;
  justification?: string | null;
  result?: string | null;
};
type ActionTaskUpdate = Partial<
  Pick<ActionTask, "priority" | "reason" | "status" | "assigned_to" | "due_date" | "justification" | "result">
>;
type SavedDashboardViewInsert = Omit<SavedDashboardView, "id" | "created_at" | "updated_at" | "is_default"> & {
  id?: string; is_default?: boolean; created_at?: string; updated_at?: string;
};
type SavedDashboardViewUpdate = Partial<Pick<SavedDashboardView, "name" | "filters" | "is_default">>;

export type DatabaseSchema = {
  public: {
    Tables: {
      deep_managers: Table<DeepManager, DeepManagerInsert>;
      products: Table<Product, ProductInsert, ProductUpdate>;
      clients: Table<Client, ClientInsert, ClientUpdate>;
      client_contacts: Table<ClientContact, ClientContactInsert, ClientContactUpdate>;
      interactions: Table<Interaction, InteractionInsert, InteractionUpdate>;
      health_score_settings: Table<
        HealthScoreSettings,
        HealthScoreSettings,
        HealthScoreSettingsUpdate
      >;
      user_profiles: Table<UserProfile, UserProfileInsert, UserProfileUpdate>;
      product_roadmap_items: Table<ProductRoadmapItem, ProductRoadmapItemInsert>;
      topic_tags: Table<TopicTag, TopicTagInsert>;
      interaction_templates: Table<InteractionTemplate, InteractionTemplateInsert>;
      notifications: Table<Notification, NotificationInsert, NotificationUpdate>;
      notification_preferences: Table<NotificationPreference, NotificationPreferenceInsert, NotificationPreferenceUpdate>;
      api_keys: Table<ApiKey, ApiKeyInsert, ApiKeyUpdate>;
      audit_log: Table<AuditLog, never>;
      action_decisions: Table<ActionDecision, ActionDecisionInsert, ActionDecisionUpdate>;
      action_tasks: Table<ActionTask, ActionTaskInsert, ActionTaskUpdate>;
      action_task_events: Table<ActionTaskEvent, never, never>;
      saved_dashboard_views: Table<SavedDashboardView, SavedDashboardViewInsert, SavedDashboardViewUpdate>;
    };
    Views: {
      interactions_view: View<InteractionView>;
      client_product_matrix: View<ClientProductMatrixRow>;
      health_score: View<HealthScore>;
      client_health: View<ClientHealth>;
      stakeholder_health: View<StakeholderHealth>;
    };
    Functions: {
      get_audit_log: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_action?: string | null;
          p_table_name?: string | null;
          p_actor?: string | null;
          p_search?: string | null;
        };
        Returns: AuditLogEntry[];
      };
      get_assignable_action_users: {
        Args: Record<string, never>;
        Returns: AssignableActionUser[];
      };
    };
  };
};
