begin;
set local statement_timeout = '15s';
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users where role='administrador' limit 1),true);
set local role authenticated;
do $$
declare p public.products%rowtype; new_id uuid; result jsonb; rejected boolean; before_prices jsonb;
begin
 select * into strict p from public.products where sku like 'HS-NA-250-N-01-%' order by id limit 1;
 if p.price<>18000 then raise exception 'Unexpected baseline'; end if;
 select jsonb_agg(jsonb_build_array(id,price,published) order by id) into before_prices from public.products;
 update public.products set price=18001 where id=p.id;
 if exists(select 1 from public.products where sku like 'HS-NA-250-N-01-%' and price is distinct from 18001) then raise exception 'single edit did not propagate'; end if;
 if exists(select 1 from public.products where sku like 'HS-NA-250-N-01-%' and published) then raise exception 'visibility changed'; end if;
 insert into public.products(name,slug,sku,price,category_id,color,uses_fragrance,published)
 values('QA rollback','qa-generic-price-rollback','HS-NA-250-N-01-ZZ',9,p.category_id,'QA',true,false) returning id into new_id;
 if (select price from public.products where id=new_id)<>18001 then raise exception 'new color did not inherit'; end if;
 update public.products set sku='HO-CE-000-N-01-ZZ',price=7 where id=new_id;
 if (select price from public.products where id=new_id)<>20000 then raise exception 'move did not inherit'; end if;
 if exists(select 1 from public.products where sku like 'HS-NA-250-N-01-%' and price<>18001) then raise exception 'source group changed'; end if;
 update public.products set sku='QA-CE-000-N-98-ZZ',price=1234 where id=new_id;
 if (select price from public.products where id=new_id)<>1234 then raise exception 'new generic price lost'; end if;
 result:=public.save_generic_price_grid('[{"sku":"HS-NA-250-N-01","price":18002}]'::jsonb);
 if (result->>'presentations')::int<>2 then raise exception 'incorrect RPC result'; end if;
 if exists(select 1 from public.products where sku like 'HS-NA-250-N-01-%' and price<>18002) then raise exception 'grid not uniform'; end if;
 rejected:=false;
 begin
  perform public.save_generic_price_grid('[{"sku":"HS-NA-250-N-01","price":18003},{"sku":"ZZ-ZZ-000-N-99","price":2}]'::jsonb);
 exception when others then rejected:=true;
 end;
 if not rejected or exists(select 1 from public.products where sku like 'HS-NA-250-N-01-%' and price<>18002) then raise exception 'partial grid write'; end if;
 rejected:=false;
 begin
  update public.products set price=case when id=p.id then 18004 else 18005 end where sku like 'HS-NA-250-N-01-%';
 exception when others then rejected:=true;
 end;
 if not rejected then raise exception 'conflicting group values accepted'; end if;
 perform public.apply_inventory_import('[{"sku":"HS-NA-250-N-01","price":18006,"published":null}]'::jsonb,'[]'::jsonb,'total');
 if exists(select 1 from public.products where sku like 'HS-NA-250-N-01-%' and price<>18006) then raise exception 'Excel failed'; end if;
 update public.products set price=null where id=p.id;
 if exists(select 1 from public.products where sku like 'HS-NA-250-N-01-%' and price is not null) then raise exception 'null not propagated'; end if;
 raise notice 'PASS: edit, inherit, move, new generic, atomic grid rollback, conflicting prices rejection, Excel, explicit null';
end $$;
rollback;
select count(*) as inconsistent_groups from (
 select array_to_string((string_to_array(sku,'-'))[1:5],'-') from public.products
 group by 1 having count(distinct coalesce(to_jsonb(price),'null'::jsonb))>1
) g;
