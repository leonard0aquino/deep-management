export type RelationshipStatus = "recente" | "ok" | "atencao" | "alerta" | "critico";

export type StakeholderInfluence = "baixa" | "media" | "alta";

export type StakeholderRisk = "baixo" | "medio" | "alto";

export type StakeholderRelationshipRole =
  | "patrocinador"
  | "decisor"
  | "influenciador"
  | "usuario_chave"
  | "contato_operacional"
  | "detrator";

export type Link = { label: string; url: string };

export type CustomerSentiment = "positive" | "neutral" | "negative";

export type UserRole = "admin" | "executivo" | "gerente" | "supervisor" | "analista";

export type BusinessArea = "customer_success" | "commercial";

export type ClientKind = "prospect" | "customer";

export type CommercialOpportunityStage =
  | "prospecting"
  | "meeting"
  | "qualification"
  | "nda_poc"
  | "proposal"
  | "negotiation"
  | "awaiting_signature"
  | "won"
  | "lost";

export type CommercialCockpitStage = "prospecting" | "meetings" | "nda_poc" | "awaiting_signature" | "won";

export type InternalGoalKey =
  | "portfolio_on_track"
  | "actions_on_time"
  | "strategic_stakeholder_coverage"
  | "risk_client_reduction"
  | "alert_response_time"
  | "updated_success_plans";

export type SuccessPlanStatus = "rascunho" | "ativo" | "concluido" | "cancelado";

export type SuccessMilestoneStatus = "pendente" | "em_andamento" | "concluido" | "cancelado";

export type ClientPortfolioItemKind = "risco" | "oportunidade";

export type ClientPortfolioItemImpact = "baixo" | "medio" | "alto";

export type ClientPortfolioItemProbability = "baixa" | "media" | "alta";

export type ClientPortfolioItemStatus = "aberto" | "em_andamento" | "concluido" | "descartado";

export type ClientCommercialPlanStatus =
  | "nao_iniciado"
  | "em_preparacao"
  | "em_negociacao"
  | "renovado"
  | "perdido";

export type ClientCadenceStatus = "active" | "completed";

export type RoadmapStatus = "planejado" | "em_andamento" | "concluido";

export type InteractionType =
  | "meeting"
  | "call"
  | "email"
  | "whatsapp"
  | "teams"
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
  owner_manager_id: string | null;
  client_kind: ClientKind;
  active: boolean;
  custom_fields: Record<string, string>;
  created_at: string;
};

export type ClientProduct = {
  id: string;
  client_id: string;
  product_id: string;
  owner_manager_id: string | null;
  contract_value: number | null;
  renewal_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientProductOwner = {
  id: string;
  client_product_id: string;
  manager_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ImportBatch = {
  id: string;
  kind: "clients" | "people" | "contracts" | "interactions";
  file_name: string;
  total_rows: number;
  imported_rows: number;
  created_by: string;
  created_at: string;
};

export type JiraProject = {
  id: string;
  project_key: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type JiraIssue = {
  id: string;
  project_id: string;
  issue_key: string;
  jira_issue_id: string | null;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
  priority: string | null;
  resolution: string | null;
  assignee_name: string | null;
  assignee_account_id: string | null;
  source_created_at: string | null;
  source_updated_at: string | null;
  source_resolved_at: string | null;
  due_at: string | null;
  parent_key: string | null;
  active: boolean;
  imported_at: string;
  created_at: string;
  updated_at: string;
};

export type JiraImportBatch = {
  id: string;
  project_id: string;
  file_name: string;
  total_rows: number;
  inserted_rows: number;
  updated_rows: number;
  imported_by: string;
  imported_at: string;
};

export type InternalApiEvent = {
  id: string;
  source: string;
  event_type: string;
  external_key: string;
  payload: Record<string, unknown>;
  api_key_id: string;
  received_at: string;
};

export type ClientSuccessPlan = {
  id: string;
  client_id: string;
  objective: string;
  expected_outcome: string;
  owner_manager_id: string;
  target_date: string;
  status: SuccessPlanStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientSuccessMilestone = {
  id: string;
  plan_id: string;
  title: string;
  owner_manager_id: string | null;
  target_date: string;
  status: SuccessMilestoneStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientRiskOpportunity = {
  id: string;
  client_id: string;
  kind: ClientPortfolioItemKind;
  title: string;
  description: string | null;
  impact: ClientPortfolioItemImpact;
  probability: ClientPortfolioItemProbability;
  owner_manager_id: string;
  target_date: string;
  status: ClientPortfolioItemStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientCommercialPlan = {
  id: string;
  client_id: string;
  owner_manager_id: string;
  status: ClientCommercialPlanStatus;
  probability: number;
  expected_renewal_value: number;
  expansion_value: number;
  next_step: string;
  next_step_due_date: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CommercialOpportunity = {
  id: string;
  client_id: string;
  contact_id: string | null;
  product_id: string | null;
  owner_manager_id: string | null;
  name: string;
  stage: CommercialOpportunityStage;
  amount: number;
  probability: number;
  next_step: string | null;
  next_step_at: string | null;
  closed_at: string | null;
  loss_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CommercialOpportunityStageEvent = {
  id: string;
  opportunity_id: string;
  from_stage: CommercialOpportunityStage | null;
  to_stage: CommercialOpportunityStage;
  actor_id: string | null;
  created_at: string;
};

export type CommercialCockpitState = {
  id: string;
  owner_user_id: string;
  prospecting_count: number;
  meetings_count: number;
  nda_poc_count: number;
  awaiting_signature_count: number;
  won_count: number;
  last_meeting_on: string | null;
  last_nda_poc_on: string | null;
  last_proposal_on: string | null;
  last_won_on: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type CommercialDailyProspecting = {
  id: string;
  owner_user_id: string;
  activity_on: string;
  prospecting_count: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type CommercialUserStageScope = {
  id: string;
  owner_user_id: string;
  stage: CommercialCockpitStage;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type CommercialAgendaEntryKind = "meeting" | "nda_poc" | "proposal" | "won" | "other";
export type CommercialAgendaEntryStatus = "scheduled" | "completed" | "cancelled";

export type CommercialAgendaEntry = {
  id: string;
  owner_user_id: string;
  company_name: string;
  title: string;
  kind: CommercialAgendaEntryKind;
  scheduled_at: string;
  status: CommercialAgendaEntryStatus;
  completed_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type CustomerPlaybook = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerPlaybookStep = {
  id: string;
  playbook_id: string;
  position: number;
  title: string;
  guidance: string | null;
  day_offset: number;
  priority: "alta" | "media";
  recommended_interaction_type: InteractionType;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientCadence = {
  id: string;
  playbook_id: string;
  client_id: string;
  product_id: string;
  owner_manager_id: string;
  start_date: string;
  status: ClientCadenceStatus;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

export type ClientCadenceProgress = ClientCadence & {
  playbook_name: string;
  client_name: string;
  product_name: string;
  owner_manager_name: string;
  total_steps: number;
  completed_steps: number;
  progress_percent: number;
  next_task_id: string | null;
  next_step: string | null;
  next_due_date: string | null;
  next_interaction_type: InteractionType | null;
  next_task_status: ActionTaskStatus | null;
  next_step_overdue: boolean;
};

export type ClientContact = {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  influence: StakeholderInfluence;
  relationship_role: StakeholderRelationshipRole | null;
  owner_manager_id: string | null;
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
  business_area: BusinessArea;
  counts_for_health: boolean;
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
  relationship_role: StakeholderRelationshipRole | null;
  owner_manager_id: string | null;
  owner_manager_name: string | null;
  photo_url: string | null;
  reports_to_contact_id: string | null;
  last_contact: string | null;
  interaction_count: number;
  last_customer_sentiment: CustomerSentiment | null;
  sentiment_recorded_at: string | null;
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
  business_area: BusinessArea;
  commercial_access?: boolean;
  manager_user_id: string | null;
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

export type InternalGoal = {
  key: InternalGoalKey;
  target_value: number;
  baseline_value: number | null;
  updated_by: string | null;
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
  client_cadence_id?: string | null;
  playbook_step_id?: string | null;
  recommended_interaction_type?: InteractionType | null;
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
  | "business_area"
  | "counts_for_health"
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
type ClientProductInsert = Omit<ClientProduct, "id" | "created_at" | "updated_at" | "active" | "owner_manager_id"> & {
  id?: string; active?: boolean; owner_manager_id?: string | null; created_at?: string; updated_at?: string;
};
type ClientProductOwnerInsert = Omit<ClientProductOwner, "id" | "created_at" | "updated_at" | "active"> & {
  id?: string; active?: boolean; created_at?: string; updated_at?: string;
};

type ClientSuccessPlanInsert = Omit<
  ClientSuccessPlan,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "status"
> & {
  id?: string;
  status?: SuccessPlanStatus;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ClientSuccessPlanUpdate = Partial<
  Pick<ClientSuccessPlan, "objective" | "expected_outcome" | "owner_manager_id" | "target_date" | "status">
>;
type CommercialOpportunityInsert = Omit<
  CommercialOpportunity,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "closed_at" | "loss_reason"
> & {
  id?: string;
  closed_at?: string | null;
  loss_reason?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type CommercialOpportunityUpdate = Partial<CommercialOpportunityInsert>;
type CommercialCockpitStateInsert = Omit<
  CommercialCockpitState,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at"
> & {
  id?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
};
type CommercialCockpitStateUpdate = Partial<Omit<CommercialCockpitStateInsert, "owner_user_id">>;
type CommercialDailyProspectingInsert = Omit<
  CommercialDailyProspecting,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at"
> & {
  id?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
};
type CommercialDailyProspectingUpdate = Partial<Omit<CommercialDailyProspectingInsert, "owner_user_id">>;
type CommercialUserStageScopeInsert = Omit<
  CommercialUserStageScope,
  "id" | "active" | "created_by" | "updated_by" | "created_at" | "updated_at"
> & {
  id?: string;
  active?: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
};
type CommercialUserStageScopeUpdate = Partial<Pick<CommercialUserStageScope, "active" | "updated_by" | "updated_at">>;
type CommercialAgendaEntryInsert = Omit<
  CommercialAgendaEntry,
  "id" | "status" | "completed_at" | "created_by" | "updated_by" | "created_at" | "updated_at"
> & {
  id?: string;
  status?: CommercialAgendaEntryStatus;
  completed_at?: string | null;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
};
type CommercialAgendaEntryUpdate = Partial<CommercialAgendaEntryInsert>;

type ClientSuccessMilestoneInsert = Omit<
  ClientSuccessMilestone,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "status"
> & {
  id?: string;
  status?: SuccessMilestoneStatus;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ClientSuccessMilestoneUpdate = Partial<
  Pick<ClientSuccessMilestone, "title" | "owner_manager_id" | "target_date" | "status">
>;

type ClientRiskOpportunityInsert = Omit<
  ClientRiskOpportunity,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "status"
> & {
  id?: string;
  status?: ClientPortfolioItemStatus;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ClientRiskOpportunityUpdate = Partial<
  Pick<
    ClientRiskOpportunity,
    "kind" | "title" | "description" | "impact" | "probability" | "owner_manager_id" | "target_date" | "status"
  >
>;

type ClientCommercialPlanInsert = Omit<
  ClientCommercialPlan,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "status" | "probability" | "expansion_value"
> & {
  id?: string;
  status?: ClientCommercialPlanStatus;
  probability?: number;
  expansion_value?: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ClientCommercialPlanUpdate = Partial<
  Pick<ClientCommercialPlan, "owner_manager_id" | "status" | "probability" | "expected_renewal_value" | "expansion_value" | "next_step" | "next_step_due_date" | "notes">
>;

type CustomerPlaybookInsert = Omit<
  CustomerPlaybook,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "active"
> & {
  id?: string;
  active?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type CustomerPlaybookUpdate = Partial<Pick<CustomerPlaybook, "name" | "description" | "active">>;
type CustomerPlaybookStepInsert = Omit<
  CustomerPlaybookStep,
  "id" | "created_by" | "updated_by" | "created_at" | "updated_at"
> & {
  id?: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type CustomerPlaybookStepUpdate = Partial<
  Pick<CustomerPlaybookStep, "position" | "title" | "guidance" | "day_offset" | "priority" | "recommended_interaction_type">
>;
type ClientCadenceInsert = Omit<
  ClientCadence,
  "id" | "status" | "created_by" | "created_at" | "completed_at"
> & {
  id?: string;
  status?: ClientCadenceStatus;
  created_by?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

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

type UserProfileInsert = Omit<UserProfile, "created_at" | "business_area"> & {
  business_area?: BusinessArea;
  created_at?: string;
};
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
type InternalGoalUpdate = Partial<Pick<InternalGoal, "target_value" | "baseline_value">>;

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
      client_products: Table<ClientProduct, ClientProductInsert, Partial<ClientProductInsert>>;
      client_product_owners: Table<ClientProductOwner, ClientProductOwnerInsert, Partial<ClientProductOwnerInsert>>;
      import_batches: Table<ImportBatch, never, never>;
      jira_projects: Table<JiraProject, never, never>;
      jira_issues: Table<JiraIssue, never, never>;
      jira_import_batches: Table<JiraImportBatch, never, never>;
      internal_api_events: Table<InternalApiEvent, Omit<InternalApiEvent, "id" | "received_at">, never>;
      client_success_plans: Table<ClientSuccessPlan, ClientSuccessPlanInsert, ClientSuccessPlanUpdate>;
      client_success_milestones: Table<
        ClientSuccessMilestone,
        ClientSuccessMilestoneInsert,
        ClientSuccessMilestoneUpdate
      >;
      client_risk_opportunities: Table<
        ClientRiskOpportunity,
        ClientRiskOpportunityInsert,
        ClientRiskOpportunityUpdate
      >;
      client_commercial_plans: Table<
        ClientCommercialPlan,
        ClientCommercialPlanInsert,
        ClientCommercialPlanUpdate
      >;
      commercial_opportunities: Table<CommercialOpportunity, CommercialOpportunityInsert, CommercialOpportunityUpdate>;
      commercial_opportunity_stage_events: Table<CommercialOpportunityStageEvent, never, never>;
      commercial_cockpit_states: Table<CommercialCockpitState, CommercialCockpitStateInsert, CommercialCockpitStateUpdate>;
      commercial_daily_prospecting: Table<CommercialDailyProspecting, CommercialDailyProspectingInsert, CommercialDailyProspectingUpdate>;
      commercial_user_stage_scopes: Table<CommercialUserStageScope, CommercialUserStageScopeInsert, CommercialUserStageScopeUpdate>;
      commercial_agenda_entries: Table<CommercialAgendaEntry, CommercialAgendaEntryInsert, CommercialAgendaEntryUpdate>;
      customer_playbooks: Table<CustomerPlaybook, CustomerPlaybookInsert, CustomerPlaybookUpdate>;
      customer_playbook_steps: Table<CustomerPlaybookStep, CustomerPlaybookStepInsert, CustomerPlaybookStepUpdate>;
      client_cadences: Table<ClientCadence, ClientCadenceInsert, never>;
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
      internal_goals: Table<InternalGoal, never, InternalGoalUpdate>;
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
      client_cadence_progress: View<ClientCadenceProgress>;
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
      save_commercial_cockpit: {
        Args: {
          p_owner_user_id: string;
          p_prospecting_count: number;
          p_meetings_count: number;
          p_nda_poc_count: number;
          p_awaiting_signature_count: number;
          p_won_count: number;
          p_last_meeting_on: string | null;
          p_last_nda_poc_on: string | null;
          p_last_proposal_on: string | null;
          p_last_won_on: string | null;
          p_daily_activity_on: string | null;
          p_daily_prospecting_count: number | null;
        };
        Returns: undefined;
      };
      apply_customer_playbook: {
        Args: {
          p_playbook_id: string;
          p_client_id: string;
          p_product_id: string;
          p_owner_manager_id: string;
          p_start_date: string;
        };
        Returns: string;
      };
      import_structured_data: {
        Args: { p_kind: string; p_file_name: string; p_rows: unknown };
        Returns: { batch_id: string; imported_rows: number };
      };
      import_jira_issues: {
        Args: { p_project_key: string; p_project_name: string; p_file_name: string; p_rows: unknown };
        Returns: { batch_id: string; total_rows: number; inserted_rows: number; updated_rows: number };
      };
      api_create_action: {
        Args: { p_api_key_id: string; p_payload: unknown };
        Returns: ActionTask;
      };
      api_update_action: {
        Args: { p_api_key_id: string; p_action_id: string; p_payload: unknown };
        Returns: ActionTask;
      };
    };
  };
};
