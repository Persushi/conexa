---
description: Implementa una feature nueva respetando la arquitectura hexagonal (delega en el agente hexagonal-feature y lo revisa al final)
argument-hint: <qué construir: recurso, campos, endpoints y quién puede usarlos>
---

Quiero implementar esta feature: $ARGUMENTS

Seguí este flujo:

1. Verificá que el pedido defina **recurso, campos, endpoints y rol requerido de cada uno**. Si falta algo,
   preguntámelo antes de delegar; no lo adivines.
2. Delegá la implementación en el agente `hexagonal-feature`, pasándole el pedido completo y las
   respuestas que me hayas pedido.
3. Cuando termine, pasale el resultado al agente `hexagonal-reviewer` y mostrame su veredicto tal cual.
4. Si el revisor marca algo **bloqueante**, devolvelo a `hexagonal-feature` para corregirlo y volvé a revisar.
   Máximo dos vueltas; si sigue sin aprobar, frená y explicame qué falta.
5. No hagas commit ni release. Cerrá con un resumen: archivos, endpoints con su rol, resultado de
   `npm run check` y la entrada que quedó en `CHANGELOG.md`.
