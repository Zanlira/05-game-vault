---
name: spec-impl-game
description: Como /spec-impl pero para specs que añaden un juego jugable. Ejecuta /spec-impl íntegro y, al terminar la implementación, lanza en secuencia (nunca en paralelo) los agentes skin-designer y luego mobile-porter sobre el juego implementado.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — /spec-impl + skins + mobile

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

---

## Fuente única: /spec-impl

A continuación el contenido íntegro de `/spec-impl`. Es la fuente de verdad de la Fase A; cualquier cambio futuro a ese skill se hereda aquí.

!`cat .agents/skills/spec-impl/SKILL.md`

---

## Instrucciones de /spec-impl-game

El argumento recibido es: `$ARGUMENTS`

### Fase A — Ejecutar /spec-impl

Sigue al pie de la letra las 4 fases del `/spec-impl` de arriba, usando `$ARGUMENTS` como spec. Mismos bloqueos (estado distinto de "Aprobado" → detente y no continúes con nada más), misma rama `spec-NN-slug`, mismas pausas por paso para revisar diffs. Ignora su mensaje final de "siguiente paso": el cierre lo da este skill.

Si la Fase A se aborta por cualquier motivo, **no** ejecutes las fases siguientes.

### Fase B — Identificar el juego

Tras completar el último paso del plan, determina el `id` del juego implementado (desde el spec y la nueva entrada en `app/components/games/registry.ts`).

- Si el spec no añade un juego jugable al registry: avisa al usuario y termina, sin lanzar agentes.
- Si el id es ambiguo: pregunta al usuario.

### Fase C — skin-designer

Lanza el agente `skin-designer` (Agent, `subagent_type: skin-designer`) con el id del juego. Espera su resultado y resúmelo al usuario.

Si falla (no compila, rechaza el juego, etc.): detente, informa, **no** lances mobile-porter.

### Fase D — mobile-porter

Solo si la Fase C terminó bien, y en un mensaje posterior (nunca en paralelo con C): lanza el agente `mobile-porter` (Agent, `subagent_type: mobile-porter`) con el mismo id. Espera su resultado y resúmelo.

### Cierre

Resumen final: spec, rama, archivos tocados por cada agente. Luego recuerda:

```
Siguiente paso: verifica los criterios de aceptación del spec uno por uno.
Si todos pasan, cambia el estado del spec a "Implementado" y haz el commit final antes de mergear la rama.
```

## Reglas duras

- skin-designer y mobile-porter se lanzan **uno después del otro**, jamás en el mismo mensaje.
- No lances agentes si la Fase A no terminó o se abortó.
- Sin commits automáticos; todo en la rama `spec-NN-slug`.
