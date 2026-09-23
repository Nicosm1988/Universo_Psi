begin;

-- ---------------------------------------------------------------------------
-- Paquete legal 2026-09.1: identificación del titular
--
-- Los documentos entregados por asesoría legal decían «de titularidad de
-- UniversoPsi», que es una marca y no identifica a la persona obligada. Se
-- completa con el titular real, su CUIT y su domicilio, como exigen la Ley
-- N° 24.240 para la contratación y la Ley N° 25.326 para el responsable de la
-- base de datos.
--
-- Cambia quién es la parte contratante, así que se publica una revisión nueva en
-- lugar de editar 2026-09 en el lugar: entre el despliegue de esa versión y esta
-- pudo haber aceptaciones, y no deben quedar apuntando a un texto distinto del
-- que se aceptó. Las filas anteriores no se borran.
--
-- `content_sha256` = sha256 del archivo fuente de cada página al publicar:
--   sha256sum 'src/app/(public)/terminos/page.tsx'
--   sha256sum 'src/app/(public)/privacidad/page.tsx'
-- ---------------------------------------------------------------------------
update private.legal_document_versions
set is_current = false
where document_type in ('TERMS', 'PRIVACY') and is_current;

insert into private.legal_document_versions (
  document_type, version, document_path, content_sha256, is_current, published_at
) values
  (
    'TERMS', '2026-09.1', '/terminos',
    'afbf41b58f588edd6502d1eee4c3a83f088a2621e2e6a5e66a9e801b3cdc8794',
    true, timestamptz '2026-09-23 00:00:00+00'
  ),
  (
    'PRIVACY', '2026-09.1', '/privacidad',
    'e643ab6d9ce361a6b646f210d61f2d66344d5952f51838677fae86dd7e6e1260',
    true, timestamptz '2026-09-23 00:00:00+00'
  )
on conflict (document_type, version) do update
set document_path = excluded.document_path,
    content_sha256 = excluded.content_sha256,
    is_current = excluded.is_current,
    published_at = excluded.published_at;

commit;
