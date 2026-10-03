create or replace function public.validate_manufacturing_spec() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
 line jsonb; lines jsonb; keys text[] := '{}'; names text[] := '{}'; k text; n text;
 total numeric:=0; q numeric; ready boolean; measure record; m jsonb;
 mass numeric; wax numeric; additives numeric:=0; fill numeric; density numeric; height numeric; wicks numeric; purchase jsonb; target text;
begin
 if jsonb_typeof(new.data) is distinct from 'object' then raise exception 'Configuración inválida.'; end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1; else new.revision:=1; end if;
 new.updated_at:=now();
 ready:=coalesce(new.data->>'status','draft')='ready';
 if tg_table_name<>'category_manufacturing_templates' and coalesce(new.data->>'status','draft') not in ('draft','ready') then raise exception 'Estado inválido.'; end if;
 lines:=new.data->'lines';
 if jsonb_typeof(lines) is distinct from 'array' then raise exception 'Faltan los componentes.'; end if;
 for line in select value from jsonb_array_elements(lines) loop
  purchase:=line->'purchase';
  if purchase is not null and purchase<>'null'::jsonb then
   if jsonb_typeof(purchase)<>'object' or coalesce(purchase->>'unit','') not in ('ml','l','g','kg','cm','m','unit') then raise exception 'Unidad de compra inválida.'; end if;
   if purchase->>'pack_size' is not null and ((purchase->>'pack_size')::numeric<=0 or (purchase->>'pack_size')::numeric>1000000) then raise exception 'Contenido de compra inválido.'; end if;
   if purchase->>'density_g_ml' is not null and ((purchase->>'density_g_ml')::numeric<=0 or (purchase->>'density_g_ml')::numeric>100) then raise exception 'Equivalencia de compra inválida.'; end if;
   target:=purchase->>'unit';
   if (line->>'unit'='unit' and target<>'unit') or (line->>'unit'='cm' and target not in ('cm','m')) or (line->>'unit' in ('g','ml') and target not in ('g','kg','ml','l')) then raise exception 'Unidad de compra incompatible con el consumo.'; end if;
  end if;
 end loop;
 if tg_table_name='fragrance_compositions' then
  if coalesce(new.data->>'composition_basis','volume') not in ('volume','mass') then raise exception 'Base de composición inválida.'; end if;
  if new.data->>'density_g_ml' is not null and ((new.data->>'density_g_ml')::numeric<=0 or (new.data->>'density_g_ml')::numeric>100) then raise exception 'Densidad de mezcla inválida.'; end if;
  if jsonb_array_length(lines)>4 then raise exception 'La composición admite hasta cuatro esencias.'; end if;
  for line in select value from jsonb_array_elements(lines) loop
   n:=lower(regexp_replace(btrim(coalesce(line->>'name','')), '\s+', ' ', 'g'));
   if n='' or n=any(names) then raise exception 'Revisá los nombres de esencias: vacíos o repetidos.'; end if;
   names:=array_append(names,n);
   if jsonb_typeof(line->'percent') is distinct from 'number' then raise exception 'Ingresá un porcentaje numérico.'; end if;
   q:=(line->>'percent')::numeric;
   if q<=0 or q>100 then raise exception 'Los porcentajes deben ser mayores que 0 y hasta 100.'; end if;
   total:=total+q;
  end loop;
  if total>100 or (ready and total<>100) then raise exception 'La composición lista debe sumar 100%%; el borrador no puede excederlo.'; end if;
  return new;
 end if;
 if new.data->>'kind' is null or new.data->>'kind' not in ('candle','diffuser','spray','custom') then raise exception 'Modelo de fabricación inválido.'; end if;
 if jsonb_array_length(lines)>20 or jsonb_array_length(lines)=0 then raise exception 'El modelo requiere entre 1 y 20 componentes.'; end if;
 for line in select value from jsonb_array_elements(lines) loop
  k:=line->>'key';
  if k is null or k='' or k=any(keys) or btrim(coalesce(line->>'label',''))='' then raise exception 'Componente vacío o repetido.'; end if;
  keys:=array_append(keys,k);
  if jsonb_typeof(line->'required') is distinct from 'boolean' then raise exception 'Indicá si el componente es obligatorio.'; end if;
  if line->>'unit' is null or line->>'unit' not in ('g','ml','unit','cm') or line->>'basis' is null or line->>'basis' not in ('fixed','per100wax','per100mass','per100ml','wax','wick','wax_capacity','per100wax_ml','wick_external','same_wicks') then raise exception 'Unidad o base inválida.'; end if;
  if (line->>'basis' in ('wax','wax_capacity','per100wax','per100mass') and line->>'unit'<>'g') or (line->>'basis' in ('wick','wick_external') and line->>'unit'<>'cm') or (line->>'basis'='per100wax_ml' and line->>'unit'<>'ml') or (line->>'basis'='same_wicks' and line->>'unit'<>'unit') then raise exception 'La unidad no corresponde al cálculo.'; end if;
  if tg_table_name='category_manufacturing_templates' then
   if line->>'default_quantity' is not null and ((line->>'default_quantity')::numeric<0 or (line->>'default_quantity')::numeric>1000000 or ((line->>'unit'='unit' or line->>'basis'='wick_external') and (line->>'default_quantity')::numeric<>trunc((line->>'default_quantity')::numeric))) then raise exception 'Cantidad sugerida inválida.'; end if;
   if line->>'triada_quantity' is not null and ((line->>'triada_quantity')::numeric<=0 or (line->>'triada_quantity')::numeric<>trunc((line->>'triada_quantity')::numeric)) then raise exception 'Cantidad de pabilos Tríada inválida.'; end if;
  end if;
  if tg_table_name='product_manufacturing_recipes' then
   if line->'quantity' is not null and line->'quantity'<>'null'::jsonb then
    if jsonb_typeof(line->'quantity')<>'number' then raise exception 'Cantidad inválida.'; end if;
    q:=(line->>'quantity')::numeric;
    if q<0 or q>1000000 or ((line->>'unit'='unit' or line->>'basis' in ('wick','wick_external')) and q<>trunc(q)) then raise exception 'Revisá la cantidad del componente.'; end if;
   end if;
   if ready and (line->>'required')::boolean and (btrim(coalesce(line->>'name',''))='' or (line->>'basis' not in ('wax','wax_capacity','same_wicks') and coalesce((line->>'quantity')::numeric,0)<=0)) then raise exception 'Completá los componentes obligatorios antes de marcar Lista para producción.'; end if;
   if line->>'basis' in ('per100mass','per100wax') then additives:=additives+coalesce((line->>'quantity')::numeric,0); end if;
  end if;
 end loop;
 if tg_table_name='product_manufacturing_recipes' then
  m:=new.data->'measures';
  if jsonb_typeof(m) is distinct from 'object' then raise exception 'Faltan las medidas.'; end if;
  for measure in select * from jsonb_each(m) loop
   if measure.value<>'null'::jsonb and (jsonb_typeof(measure.value)<>'number' or (measure.value::text)::numeric<0 or (measure.value::text)::numeric>1000000) then raise exception 'Medida inválida.'; end if;
  end loop;
  if coalesce((m->>'alcohol_strength_percent')::numeric,0)>100 then raise exception 'La concentración del alcohol no puede superar 100%%.'; end if;
  fill:=nullif(m->>'fill_ml','')::numeric; density:=nullif(m->>'density_g_ml','')::numeric;
  mass:=coalesce(nullif(m->>'final_mass_g','')::numeric,fill*density);
  height:=nullif(m->>'internal_height_cm','')::numeric;
  select (l->>'quantity')::numeric into wicks from jsonb_array_elements(lines) l where l->>'key'='wick';
  wax:=coalesce(nullif((m->>'wax_override_g')::numeric,0),fill*(m->>'wax_g_per_cc')::numeric);
  if exists(select 1 from jsonb_array_elements(lines) l where l->>'basis'='wax_capacity') then mass:=wax; end if;
  if exists(select 1 from jsonb_array_elements(lines) l where l->>'basis'='per100wax') and exists(select 1 from jsonb_array_elements(lines) l where l->>'basis'='per100mass') then raise exception 'Usá una sola base de dosificación: cera o mezcla final.'; end if;
  if exists(select 1 from jsonb_array_elements(lines) l where l->>'basis'='per100mass') and additives>=100 then raise exception 'Los aditivos deben dejar una proporción positiva de cera.'; end if;
  if ready then
   if new.data->>'kind' in ('diffuser','spray') and abs(coalesce((select sum((l->>'quantity')::numeric) from jsonb_array_elements(lines) l where l->>'basis'='per100ml' and l->>'unit'='ml' and (btrim(coalesce(l->>'name',''))<>'' or (l->>'required')::boolean)),0)-100)>0.000001 then raise exception 'Alcohol y esencia deben sumar 100%% en volumen.'; end if;
   if not exists(select 1 from jsonb_array_elements(lines) l where btrim(coalesce(l->>'name',''))<>'') then raise exception 'Completá al menos un componente.'; end if;
   for line in select value from jsonb_array_elements(lines) loop
    if btrim(coalesce(line->>'name',''))='' and coalesce((line->>'quantity')::numeric,0)>0 then raise exception 'Ingresá el nombre de cada componente con cantidad.'; end if;
    if btrim(coalesce(line->>'name',''))<>'' then
     if line->>'basis' in ('wax','per100wax','per100mass','per100wax_ml','wax_capacity') and coalesce(mass,0)<=0 then raise exception 'Ingresá peso final medido o volumen y densidad de mezcla.'; end if;
     if line->>'basis'='per100ml' and coalesce(fill,0)<=0 then raise exception 'Ingresá volumen de llenado.'; end if;
     if line->>'basis'='wick_external' and coalesce((m->>'external_height_cm')::numeric,0)<=0 then raise exception 'Ingresá la altura exterior del frasco.'; end if;
     if line->>'basis'='same_wicks' and coalesce(wicks,0)<=0 then raise exception 'Indicá la cantidad de pabilos para calcular chapitas.'; end if;
     if line->>'basis'='wick' and (coalesce(height,0)<=0 or m->>'wick_allowance_cm' is null) then raise exception 'Ingresá altura útil y margen de corte del pabilo.'; end if;
     if line->>'basis' not in ('wax','wax_capacity','same_wicks') and coalesce((line->>'quantity')::numeric,0)<=0 then raise exception 'Completá la cantidad de cada componente utilizado.'; end if;
    end if;
   end loop;
  end if;
 end if;
 return new;
end $$;
