"""Fencing races in the dedicated local fixture DB; no remote target is accepted."""
import concurrent.futures
import json
import subprocess
import uuid

CMD = ["docker", "exec", "-i", "supabase_db_psi_payments_20260911", "psql", "-X", "-qAt",
       "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "psi_payments_legacy_20260912"]


def sql(query):
    result = subprocess.run(CMD, input=query, capture_output=True, text=True, check=True)
    return [line for line in result.stdout.splitlines() if line.strip()]


def race(first, second):
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        a = pool.submit(sql, first)
        b = pool.submit(sql, second)
        return a.result(), b.result()


plan_id, profile_id, subscription_id = (str(uuid.uuid4()) for _ in range(3))
code = "CARD_QA_" + uuid.uuid4().hex[:16].upper()
try:
    sql(f"""begin;
    insert into public.plans(id,code,name,price_amount,currency,billing_interval,pricing_status,payment_model,is_demo)
    values('{plan_id}','{code}','Plan QA concurrente',1,'ARS','MONTH','PUBLISHED','RECURRING',true);
    insert into public.professional_profiles(id,slug,first_name,last_name,headline,bio,is_demo)
    values('{profile_id}','card-race-{profile_id}','Prueba','Aislada','Perfil QA concurrente','Perfil aislado de prueba de reservas concurrentes sin publicación.',true);
    insert into public.subscriptions(id,professional_profile_id,plan_id,plan_snapshot,is_demo)
    values('{subscription_id}','{profile_id}','{plan_id}',
    '{{"code":"{code}","price_amount":1,"currency":"ARS","pricing_status":"PUBLISHED","payment_model":"RECURRING"}}',true);
    commit;""")
    reserve = f"""begin;
    select row_to_json(r) from public.reserve_card_checkout('{subscription_id}','personal',
      (select plan_snapshot from public.subscriptions where id='{subscription_id}')) r;
    select pg_sleep(0.2); commit;"""
    a, b = race(reserve, reserve)
    claims = [json.loads(a[0]), json.loads(b[0])]
    assert sorted(c['may_create'] for c in claims) == [False, True]
    assert all(c['attempt_id'] is None for c in claims if not c['may_create'])
    first_id = next(c['attempt_id'] for c in claims if c['may_create'])
    assert sql(f"select count(*) from private.card_checkout_attempts where subscription_id='{subscription_id}';") == ['1']
    print('PASS: two concurrent claims permit one POST and never reveal the winning token')

    release = f"begin; select public.release_failed_card_checkout('{subscription_id}','{first_id}',400); select pg_sleep(0.2); commit;"
    a, b = race(release, release)
    assert sorted([a[0], b[0]]) == ['f', 't']
    assert sql(f"select count(*) from private.card_checkout_attempts where subscription_id='{subscription_id}' and released_at is not null;") == ['1']
    print('PASS: concurrent repeated rejection releases once and retains its attempt')

    a, b = race(reserve, release)
    new_claim = json.loads(a[0])
    assert new_claim['may_create'] and new_claim['attempt_id'] != first_id and b[0] == 'f'
    assert sql(f"select current_card_attempt_id::text from private.subscription_payment_state where subscription_id='{subscription_id}';") == [new_claim['attempt_id']]
    assert sql(f"select count(*) from private.card_checkout_attempts where subscription_id='{subscription_id}' and released_at is null;") == ['1']
    print('PASS: late old rejection cannot release a concurrently created newer attempt')
finally:
    sql(f"""begin;
    delete from private.subscription_payment_state where subscription_id='{subscription_id}';
    delete from private.card_checkout_attempts where subscription_id='{subscription_id}';
    delete from public.subscriptions where id='{subscription_id}';
    delete from public.professional_profiles where id='{profile_id}';
    delete from public.plans where id='{plan_id}';
    commit;""")
