# Promotion analytics

PROMY mide una impresión cuando una tarjeta de promoción permanece al menos 50% visible durante 750 ms en una pantalla CLIENT enfocada. Una apertura se registra únicamente después de que `PromotionDetail` carga el detalle público elegible.

La sesión de analytics vive sólo en memoria Mobile, rota cada 24 horas y deduplica `promotionId + eventType`. La API deriva un HMAC por evento con `ANALYTICS_HMAC_SECRET`; nunca persiste `sessionId`, usuario, IP, ubicación ni User-Agent. Los recibos se retienen 48 horas y el proceso API los limpia cada hora mediante un timer `unref` no crítico.

Los agregados diarios usan `PROMOTION_TIMEZONE` (`America/Argentina/Buenos_Aires` por defecto). `analyticsDataFrom` es el primer día con una fila diaria real: los días anteriores se devuelven como `null`, no como cero. La validación física de scroll, deep links y dispositivos sigue en `PHYSICAL_DEVICE_QA_PENDING`.
