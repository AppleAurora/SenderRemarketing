# Motor de despacho: etapa 1 (cola segura)

La base del motor está en `supabase/dispatch_queue.sql`. Ejecutar después de `schema.sql` y `batch_scheduler.sql`.

## Qué quedó implementado
- Reserva atómica de mensajes vencidos con `FOR UPDATE SKIP LOCKED`, evitando que dos procesos reclamen la misma fila.
- Solo selecciona campañas en estado `running`, líneas `connected` y contactos con `consent_status='opted_in'`.
- Registra cantidad de intentos y hora de reserva.
- Los trabajos cuyo resultado sea desconocido después de un corte quedan en `failed` para revisión manual, **no se reenvían automáticamente**.
- La función de reserva solo puede ejecutarse con la credencial de servicio de Supabase, nunca desde el navegador.

## Pendiente antes de activar envíos
1. Implementar un adaptador de entrega para un canal de mensajería autorizado y comprobar el resultado de cada envío.
2. Registrar resultados `sent` / `failed` y el identificador del proveedor en una operación idempotente.
3. Controles de inicio, pausa, cancelación, bajas y auditoría.
4. Ejecutar pruebas de concurrencia, reinicio, consentimiento revocado y cinco líneas.
5. Asegurar que el proveedor admite el tipo de mensaje y que los contactos dieron consentimiento válido.

**Importante:** el worker actual de `whatsapp-web.js` solo vincula sesiones; no envía mensajes. No se debe activar el procesamiento real de la cola hasta completar los controles anteriores. Los límites de volumen o variaciones de texto no garantizan evitar restricciones de WhatsApp.
