begin;
set local statement_timeout='15s';
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users limit 1),true);
set local role authenticated;
do $$
declare c uuid; p uuid; f uuid; r integer; n integer; bad boolean;
begin
 select id into c from public.categories limit 1;
 select id into p from public.products limit 1;
 select id into f from public.fragrances limit 1;
 insert into public.category_manufacturing_templates values(c,'{"kind":"custom","lines":[{"key":"vessel","label":"Envase","unit":"unit","basis":"fixed","required":true}]}',1,now()) on conflict(category_id) do update set data=excluded.data;
 insert into public.product_manufacturing_recipes values(p,'{"kind":"custom","status":"draft","measures":{},"lines":[{"key":"vessel","label":"Envase","name":"","quantity":null,"unit":"unit","basis":"fixed","required":true}]}',1,now());
 bad:=false;begin
  update public.product_manufacturing_recipes set data=jsonb_set(data,'{status}','"ready"') where product_id=p;
 exception when raise_exception then bad:=true;end;
 if not bad then raise exception 'FAIL incomplete recipe accepted';end if;
 update public.product_manufacturing_recipes set data=jsonb_set(jsonb_set(jsonb_set(data,'{status}','"ready"'),'{lines,0,name}','"Vaso"'),'{lines,0,quantity}','1') where product_id=p;
 select revision into r from public.product_manufacturing_recipes where product_id=p;
 if r<>2 then raise exception 'FAIL revision';end if;
 update public.product_manufacturing_recipes set data=data where product_id=p and revision=1;
 get diagnostics n=row_count;if n<>0 then raise exception 'FAIL stale edit';end if;
 insert into public.fragrance_compositions values(f,'{"status":"draft","lines":[{"name":"A","percent":80}]}',1,now());
 bad:=false;begin
  update public.fragrance_compositions set data=jsonb_set(data,'{status}','"ready"') where fragrance_id=f;
 exception when raise_exception then bad:=true;end;
 if not bad then raise exception 'FAIL 80 percent accepted as ready';end if;
 update public.fragrance_compositions set data='{"status":"ready","lines":[{"name":"A","percent":70},{"name":"B","percent":30}]}' where fragrance_id=f;
 bad:=false;begin
  update public.fragrance_compositions set data='{"status":"ready","lines":[{"name":"A","percent":70},{"name":" a ","percent":30}]}' where fragrance_id=f;
 exception when raise_exception then bad:=true;end;
 if not bad then raise exception 'FAIL duplicate essence';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ declare bad boolean:=false; begin
 if exists(select 1 from public.category_manufacturing_templates) or exists(select 1 from public.product_manufacturing_recipes) or exists(select 1 from public.fragrance_compositions) then raise exception 'FAIL unauthorized read';end if;
 begin
 insert into public.fragrance_compositions select id,'{"status":"draft","lines":[]}',1,now() from public.fragrances limit 1;
 exception when insufficient_privilege then bad:=true;end;
 if not bad then raise exception 'FAIL unauthorized insert';end if;
end $$;
set local role anon;
do $$ declare bad boolean:=false; begin
 begin perform * from public.product_manufacturing_recipes;exception when insufficient_privilege then bad:=true;end;
 if not bad then raise exception 'FAIL anonymous access';end if;
end $$;
rollback;
select 'PASS: draft/ready, 100 percent, duplicates, revision, staff access, unrelated authenticated denial, anonymous denial; all test data rolled back' as result;
