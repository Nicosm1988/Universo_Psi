-- Sólo universo-psi-mp-sandbox (gzsbndvaxdyuyhjidfqq), tras bootstrap legacy.
-- Configuración mínima de QA basada en el seed aprobado; no usuarios, PII,
-- perfiles, documentos, facturación, suscripciones ni publicaciones.
-- El caller debe verificar el project_ref; current_database() no lo identifica.
begin;
do $fixture_guard$
begin
  if exists(select 1 from public.user_profiles)
     or exists(select 1 from public.professional_profiles)
     or exists(select 1 from public.plans)
     or exists(select 1 from supabase_migrations.schema_migrations where version='20260911224302')
     or (select count(*) from supabase_migrations.schema_migrations) <> 8 then
    raise exception 'Expected empty identity/catalog fixtures and exactly eight legacy migrations';
  end if;
end;
$fixture_guard$;
insert into public.professional_types(id,code,slug,name,description,is_regulated,sort_order,is_active)
values ('20000000-0000-4000-8000-000000000001','psychologist','psicologia','Psicólogo/a','Evaluación, acompañamiento y tratamiento psicológico.',true,10,true);
insert into public.credential_types(id,code,name,description,sort_order) values
 ('21000000-0000-4000-8000-000000000001','professional_license','Matrícula profesional','Matrícula y jurisdicción de ejercicio.',10),
 ('21000000-0000-4000-8000-000000000002','university_degree','Título universitario','Título emitido por una institución educativa.',20);
insert into public.verification_rules(professional_type_id,credential_type_id,requirement_level,jurisdiction_required,instructions) values
 ('20000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','REQUIRED',true,'Presentar matrícula vigente y jurisdicción.'),
 ('20000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','REQUIRED',false,'Presentar título universitario.');
insert into public.needs(id,code,slug,name,short_description,sort_order)
values ('22000000-0000-4000-8000-000000000001','anxiety','ansiedad','Ansiedad','Acompañamiento para comprender y manejar la ansiedad.',10);
insert into public.services(id,code,slug,name,description,sort_order)
values ('23000000-0000-4000-8000-000000000001','individual_therapy','terapia-individual','Terapia individual','Espacio individual de trabajo terapéutico.',10);
insert into public.modalities(id,code,name,sort_order)
values ('26000000-0000-4000-8000-000000000001','ONLINE','Online',10);
insert into public.languages(id,code,name,sort_order)
values ('28000000-0000-4000-8000-000000000001','es','Español',10);
insert into public.plans(id,code,name,description,price_amount,currency,billing_interval,pricing_status,
 monthly_lead_quota,ranking_boost_points,visibility_score,sort_order,is_active,payment_model,commitment_cycles,grace_period_days)
values ('2b000000-0000-4000-8000-000000000001','PROFESSIONAL_MONTHLY','Profesional · Mensual',
 'Perfil público, buscador, recepción de contactos y panel de leads. Cobro mensual recurrente.',
 120000,'ARS','MONTH','PUBLISHED',null,0,40,10,true,'RECURRING',null,3);
insert into public.plan_entitlements(plan_id,entitlement_code,enabled,limit_value,configuration) values
 ('2b000000-0000-4000-8000-000000000001','public_profile',true,null,'{}'),
 ('2b000000-0000-4000-8000-000000000001','receive_leads',true,null,'{}');
commit;
