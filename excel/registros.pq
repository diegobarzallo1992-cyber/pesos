// Excel > Datos > Obtener datos > De otras fuentes > Consulta en blanco > Editor avanzado > pegar esto.
// Cambia TU_CLAVE_EXCEL por la clave que te dio supabase/excel.sql.
let
  Clave = "TU_CLAVE_EXCEL",
  Origen = Json.Document(Web.Contents(
    "https://wqrtmkxtrzblghviumsd.supabase.co/rest/v1/rpc/exportar_registros",
    [ Query = [p_clave = Clave],
      Headers = [apikey = "sb_publishable_BDMsagmmNKYv_MDsPJ1U_Q_2iMasBBJ"] ])),
  Tabla = Table.FromRecords(Origen),
  Tipos = Table.TransformColumnTypes(Tabla, {
    {"fecha", type date}, {"hora_registro", type datetimezone},
    {"total", Int64.Type}, {"altas", Int64.Type}, {"bajas", Int64.Type}, {"critico", Int64.Type},
    {"fuera", Int64.Type}, {"pct", type number}}),
  Quitar = Table.RemoveColumns(Tipos, {"creado_por", "actualizado"}, MissingField.Ignore)
in
  Quitar
