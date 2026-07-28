import type { InteractionType, StakeholderInfluence } from "@/lib/types/database";

export type StructuredImportKind = "clients" | "people" | "contracts" | "interactions";

export type ImportIssue = {
  row: number;
  field: string;
  code: "required" | "invalid" | "duplicate" | "unresolved";
  message: string;
};

export type ParsedImportRow = {
  row: number;
  values: Record<string, string>;
};

export type ImportReferenceData = {
  clients?: Array<{ id: string; name: string }>;
  products?: Array<{ id: string; name: string; slug?: string }>;
  managers?: Array<{ id: string; name: string; email?: string | null }>;
  contacts?: Array<{ id: string; client_id: string; name: string; email?: string | null }>;
  contracts?: Array<{ client_id: string; product_id: string }>;
  interactions?: Array<{ client_id: string; product_id: string; topic: string; occurred_at: string }>;
};

export type ImportAnalysis = {
  headers: string[];
  rows: ParsedImportRow[];
  issues: ImportIssue[];
  validRows: ParsedImportRow[];
  duplicateRows: number[];
  invalidRows: number[];
};

export const IMPORT_COLUMNS: Record<StructuredImportKind, string[]> = {
  clients: ["name", "segment", "contract_value", "contract_renewal_date", "owner_email"],
  people: ["client_name", "name", "role", "email", "phone", "influence"],
  contracts: ["client_name", "product_name", "contract_value", "renewal_date"],
  interactions: [
    "client_name",
    "product_name",
    "manager_email",
    "contact_email",
    "interaction_type",
    "topic",
    "notes",
    "relevance",
    "occurred_at",
  ],
};

const REQUIRED_COLUMNS: Record<StructuredImportKind, string[]> = {
  clients: ["name"],
  people: ["client_name", "name"],
  contracts: ["client_name", "product_name"],
  interactions: ["client_name", "product_name", "interaction_type", "topic", "relevance", "occurred_at"],
};

const INTERACTION_TYPES = new Set<InteractionType>([
  "meeting", "call", "email", "whatsapp", "ticket", "demo", "implantacao", "treinamento", "incidente", "encerramento", "other",
]);
const INFLUENCES = new Set<StakeholderInfluence>(["baixa", "media", "alta"]);

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      fields.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  fields.push(value.trim());
  return fields;
}

function logicalLines(csv: string): string[] {
  const lines: string[] = [];
  let current = "";
  let quoted = false;
  const source = csv.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        current += '""';
        index += 1;
        continue;
      }
      quoted = !quoted;
    }
    if (char === "\n" && !quoted) {
      lines.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.filter((line) => line.trim().length > 0);
}

function detectDelimiter(header: string) {
  const commas = parseLine(header, ",").length;
  const semicolons = parseLine(header, ";").length;
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(csv: string): { headers: string[]; rows: ParsedImportRow[] } {
  const lines = logicalLines(csv);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter).map(normalize);
  const rows = lines.slice(1).map((line, index) => {
    const cells = parseLine(line, delimiter);
    return {
      row: index + 2,
      values: Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex]?.trim() ?? ""])),
    };
  });
  return { headers, rows };
}

function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isMoney(value: string) {
  return /^\d+(?:[.,]\d{1,2})?$/.test(value);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function addIssue(issues: ImportIssue[], row: number, field: string, code: ImportIssue["code"], message: string) {
  issues.push({ row, field, code, message });
}

export function analyzeImport(
  kind: StructuredImportKind,
  csv: string,
  references: ImportReferenceData = {},
): ImportAnalysis {
  const { headers, rows } = parseCsv(csv);
  const issues: ImportIssue[] = [];
  const missingHeaders = REQUIRED_COLUMNS[kind].filter((column) => !headers.includes(column));
  for (const column of missingHeaders) addIssue(issues, 1, column, "required", `Coluna obrigatória ausente: ${column}.`);

  const clientsByName = new Map((references.clients ?? []).map((item) => [normalize(item.name), item]));
  const productsByName = new Map((references.products ?? []).flatMap((item) => [[normalize(item.name), item], [normalize(item.slug), item]]));
  const managersByEmail = new Map((references.managers ?? []).filter((item) => item.email).map((item) => [normalize(item.email), item]));
  const contactsByClientEmail = new Map((references.contacts ?? []).filter((item) => item.email).map((item) => [`${item.client_id}|${normalize(item.email)}`, item]));
  const existingKeys = new Set<string>();

  if (kind === "clients") for (const client of references.clients ?? []) existingKeys.add(normalize(client.name));
  if (kind === "people") for (const contact of references.contacts ?? []) existingKeys.add(`${contact.client_id}|${normalize(contact.email || contact.name)}`);
  if (kind === "contracts") for (const contract of references.contracts ?? []) existingKeys.add(`${contract.client_id}|${contract.product_id}`);
  if (kind === "interactions") for (const interaction of references.interactions ?? []) existingKeys.add(`${interaction.client_id}|${interaction.product_id}|${normalize(interaction.topic)}|${interaction.occurred_at}`);

  const batchKeys = new Set<string>();
  for (const item of rows) {
    const values = item.values;
    for (const field of REQUIRED_COLUMNS[kind]) {
      if (!values[field]?.trim()) addIssue(issues, item.row, field, "required", "Campo obrigatório não preenchido.");
    }
    for (const field of ["contract_value"]) {
      if (values[field] && !isMoney(values[field])) addIssue(issues, item.row, field, "invalid", "Use um valor positivo com até duas casas decimais.");
    }
    for (const field of ["contract_renewal_date", "renewal_date", "occurred_at"]) {
      if (values[field] && !isIsoDate(values[field])) addIssue(issues, item.row, field, "invalid", "Use uma data válida no formato AAAA-MM-DD.");
    }
    for (const field of ["email", "owner_email", "manager_email", "contact_email"]) {
      if (values[field] && !isEmail(values[field])) addIssue(issues, item.row, field, "invalid", "E-mail inválido.");
    }
    if (values.influence && !INFLUENCES.has(normalize(values.influence) as StakeholderInfluence)) addIssue(issues, item.row, "influence", "invalid", "Use baixa, media ou alta.");
    if (values.interaction_type && !INTERACTION_TYPES.has(normalize(values.interaction_type) as InteractionType)) addIssue(issues, item.row, "interaction_type", "invalid", "Tipo de interação não reconhecido.");
    if (values.relevance && (!/^\d+$/.test(values.relevance) || Number(values.relevance) < 1 || Number(values.relevance) > 5)) addIssue(issues, item.row, "relevance", "invalid", "A relevância deve estar entre 1 e 5.");

    const client = values.client_name ? clientsByName.get(normalize(values.client_name)) : undefined;
    const product = values.product_name ? productsByName.get(normalize(values.product_name)) : undefined;
    if (values.client_name && !client) addIssue(issues, item.row, "client_name", "unresolved", "Cliente não encontrado.");
    if (values.product_name && !product) addIssue(issues, item.row, "product_name", "unresolved", "Produto não encontrado.");
    if (values.owner_email && !managersByEmail.has(normalize(values.owner_email))) addIssue(issues, item.row, "owner_email", "unresolved", "Responsável não encontrado.");
    if (values.manager_email && !managersByEmail.has(normalize(values.manager_email))) addIssue(issues, item.row, "manager_email", "unresolved", "Responsável não encontrado.");
    if (values.contact_email && client && !contactsByClientEmail.has(`${client.id}|${normalize(values.contact_email)}`)) addIssue(issues, item.row, "contact_email", "unresolved", "Contato não encontrado para este cliente.");

    let key = "";
    if (kind === "clients") key = normalize(values.name);
    if (kind === "people" && client) key = `${client.id}|${normalize(values.email || values.name)}`;
    if (kind === "contracts" && client && product) key = `${client.id}|${product.id}`;
    if (kind === "interactions" && client && product) key = `${client.id}|${product.id}|${normalize(values.topic)}|${values.occurred_at}`;
    if (key && (existingKeys.has(key) || batchKeys.has(key))) addIssue(issues, item.row, "_row", "duplicate", "Registro duplicado no arquivo ou na base.");
    if (key) batchKeys.add(key);
  }

  const invalidRows = [...new Set(issues.filter((issue) => issue.row > 1).map((issue) => issue.row))];
  const duplicateRows = [...new Set(issues.filter((issue) => issue.code === "duplicate").map((issue) => issue.row))];
  return {
    headers,
    rows,
    issues,
    validRows: missingHeaders.length > 0 ? [] : rows.filter((row) => !invalidRows.includes(row.row)),
    duplicateRows,
    invalidRows,
  };
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildErrorReport(issues: ImportIssue[]) {
  return ["linha,campo,codigo,motivo", ...issues.map((issue) => [issue.row, issue.field, issue.code, issue.message].map(csvCell).join(","))].join("\n");
}

export function prepareImportPayload(kind: StructuredImportKind, rows: ParsedImportRow[], references: ImportReferenceData) {
  const clients = new Map((references.clients ?? []).map((item) => [normalize(item.name), item]));
  const products = new Map((references.products ?? []).flatMap((item) => [[normalize(item.name), item], [normalize(item.slug), item]]));
  const managers = new Map((references.managers ?? []).filter((item) => item.email).map((item) => [normalize(item.email), item]));
  const contacts = new Map((references.contacts ?? []).filter((item) => item.email).map((item) => [`${item.client_id}|${normalize(item.email)}`, item]));

  return rows.map(({ values }) => {
    const client = clients.get(normalize(values.client_name));
    const product = products.get(normalize(values.product_name));
    if (kind === "clients") return {
      name: values.name,
      segment: values.segment || null,
      contract_value: values.contract_value?.replace(",", ".") || null,
      contract_renewal_date: values.contract_renewal_date || null,
      owner_manager_id: managers.get(normalize(values.owner_email))?.id ?? null,
    };
    if (kind === "people") return {
      client_id: client?.id,
      name: values.name,
      role: values.role || null,
      email: values.email || null,
      phone: values.phone || null,
      influence: normalize(values.influence) || "media",
    };
    if (kind === "contracts") return {
      client_id: client?.id,
      product_id: product?.id,
      contract_value: values.contract_value?.replace(",", ".") || null,
      renewal_date: values.renewal_date || null,
    };
    return {
      client_id: client?.id,
      product_id: product?.id,
      manager_id: managers.get(normalize(values.manager_email))?.id ?? null,
      contact_id: client ? contacts.get(`${client.id}|${normalize(values.contact_email)}`)?.id ?? null : null,
      interaction_type: normalize(values.interaction_type),
      topic: values.topic,
      notes: values.notes || null,
      relevance: values.relevance,
      occurred_at: values.occurred_at,
    };
  });
}
