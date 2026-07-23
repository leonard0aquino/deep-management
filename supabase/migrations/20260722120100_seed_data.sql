-- ============================================================================
-- Seed de demonstração — dados fictícios para validar o dashboard
-- ============================================================================

insert into public.deep_managers (name, email, avatar_color) values
  ('Alice', 'alice@deep.com', '#16a34a'),
  ('Carlos', 'carlos@deep.com', '#f59e0b'),
  ('Beatriz', 'beatriz@deep.com', '#ef4444'),
  ('Leonardo', 'leonardo@deep.com', '#2563eb');

insert into public.products (name, slug, color) values
  ('Deep One', 'deep-one', '#2563eb'),
  ('Deep Voice', 'deep-voice', '#0891b2'),
  ('Deep Analytics', 'deep-analytics', '#7c3aed'),
  ('Legal v3', 'legal-v3', '#0f172a');

insert into public.clients (name, segment, contract_value, contract_renewal_date) values
  ('Bradesco', 'Banking', 480000, '2026-11-01'),
  ('Itaú', 'Banking', 620000, '2027-02-15'),
  ('Nubank', 'Fintech', 310000, '2026-09-30'),
  ('Santander', 'Banking', 275000, '2026-08-20'),
  ('XP Investimentos', 'Investimentos', 190000, '2027-01-10'),
  ('BTG Pactual', 'Investimentos', 225000, '2026-10-05');

insert into public.client_contacts (client_id, name, role)
select c.id, v.name, v.role
from (values
  ('Bradesco', 'Gina', 'Gerente de Produto'),
  ('Bradesco', 'Estrela', 'Compliance'),
  ('Itaú', 'Fernanda', 'Head de Operações'),
  ('Nubank', 'Ricardo', 'Product Owner'),
  ('Santander', 'Marcos', 'Diretor de TI'),
  ('XP Investimentos', 'Marcos', 'Analista de Sistemas'),
  ('BTG Pactual', 'Sergio', 'Gerente de Inovação')
) as v(client_name, name, role)
join public.clients c on c.name = v.client_name;

-- Interações — datas relativas a hoje para os badges de recência baterem
-- com o comportamento real do heatmap (recente/ok/atencao/alerta/critico)
insert into public.interactions (client_id, product_id, manager_id, contact_id, topic, relevance, occurred_at, interaction_type)
select
  c.id, p.id, m.id, cc.id, v.topic, v.relevance, current_date - v.days_ago, v.itype::public.interaction_type
from (values
  ('Bradesco', 'Deep One', 'Alice', 'Gina', 'Melhoria', 3, 0, 'meeting'),
  ('Bradesco', 'Deep Voice', 'Alice', 'Gina', 'Inovação', 3, 12, 'call'),
  ('Bradesco', 'Legal v3', 'Leonardo', 'Estrela', 'Agenda', 2, 0, 'meeting'),
  ('Itaú', 'Deep One', 'Carlos', 'Fernanda', 'Expansão', 4, 37, 'meeting'),
  ('Itaú', 'Deep Voice', 'Carlos', 'Fernanda', 'Suporte', 5, 4, 'ticket'),
  ('Santander', 'Deep Analytics', 'Alice', 'Marcos', 'Renovação', 2, 82, 'call'),
  ('Nubank', 'Deep Analytics', 'Beatriz', 'Ricardo', 'Demo', 3, 103, 'demo'),
  ('Nubank', 'Deep One', 'Beatriz', 'Ricardo', 'Upsell', 3, 17, 'meeting'),
  ('Santander', 'Deep Analytics', 'Carlos', 'Marcos', 'Implantação', 2, 111, 'ticket'),
  ('XP Investimentos', 'Deep Voice', 'Beatriz', 'Marcos', 'Proposta', 4, 148, 'email'),
  ('XP Investimentos', 'Deep One', 'Alice', 'Marcos', 'Melhoria', 3, 21, 'meeting'),
  ('BTG Pactual', 'Deep One', 'Carlos', 'Sergio', 'Piloto', 5, 191, 'demo'),
  ('BTG Pactual', 'Deep Analytics', 'Beatriz', 'Sergio', 'Review', 3, 7, 'meeting')
) as v(client_name, product_name, manager_name, contact_name, topic, relevance, days_ago, itype)
join public.clients c on c.name = v.client_name
join public.products p on p.name = v.product_name
join public.deep_managers m on m.name = v.manager_name
left join public.client_contacts cc on cc.name = v.contact_name and cc.client_id = c.id;
