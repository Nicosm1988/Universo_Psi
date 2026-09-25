begin;

-- ---------------------------------------------------------------------------
-- Paquete legal 2026-09.2: cuenta opcional para quien consulta
--
-- Los textos entregados afirmaban que quien busca un profesional no puede tener
-- cuenta. El producto ahora ofrece una, gratuita y opcional, cuya única función
-- es reunir las consultas enviadas y su estado. Tres textos cambian en
-- consecuencia:
--
--   · Términos, cláusula 6: se aclara que registrarse no es obligatorio para
--     Visitantes y Usuarios, y que esa cuenta no otorga prioridad ni posición.
--   · Privacidad, cláusula 1: se declara la cuenta opcional, qué datos trata y
--     que su baja no afecta las consultas ya remitidas.
--   · Preguntas frecuentes: se explica para qué sirve y qué no cambia.
--
-- Cambia el alcance de quién puede tener cuenta, así que se publica una
-- revisión nueva en lugar de editar 2026-09.1 en el lugar. Las filas anteriores
-- no se borran: sostienen las aceptaciones ya registradas.
--
-- `content_sha256` = sha256 del archivo fuente de cada página al publicar.
-- ---------------------------------------------------------------------------
update private.legal_document_versions
set is_current = false
where document_type in ('TERMS', 'PRIVACY') and is_current;

insert into private.legal_document_versions (
  document_type, version, document_path, content_sha256, is_current, published_at
) values
  (
    'TERMS', '2026-09.2', '/terminos',
    '4be90bced97bedeb662afe6ce96c4e4d0c11c3ed195d3804fe416efee6511760',
    true, timestamptz '2026-09-24 00:00:00+00'
  ),
  (
    'PRIVACY', '2026-09.2', '/privacidad',
    '4b45d01a19fd83460a66dc2ad44868e97da063e38b64564035894b662b0d5919',
    true, timestamptz '2026-09-24 00:00:00+00'
  )
on conflict (document_type, version) do update
set document_path = excluded.document_path,
    content_sha256 = excluded.content_sha256,
    is_current = excluded.is_current,
    published_at = excluded.published_at;

commit;
