# Graph Report - anime_master  (2026-10-12)

## Corpus Check
- 253 files · ~209,598 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .example 1, .toml 1)

## Summary
- 2630 nodes · 4502 edges · 180 communities (174 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `267927f6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lab.js
- album.ts
- three.js materials, lights & IBL reference (r155+)
- SceneBody
- package.json
- import.ts
- auth-actions.ts
- start
- asset_report.py
- compilerOptions
- scripts
- Three.js Textures
- PixiJS 8.21 Rendering
- Three.js Shaders
- Three.js Loaders
- Three.js Interaction
- Common Effects
- Three.js Lighting
- Three.js Animation
- Three.js Geometry
- Three.js Fundamentals
- Three.js Materials
- react
- Master Router — Game-Development Skill Dispatcher
- wallet.ts
- DuplicateSale.tsx
- Performance optimization
- Roguelike
- Étape 1 — Base de personnages (100 % local)
- Camera systems
- Card Game
- FPS Shooter
- Game feel (juice)
- Game UI/UX
- Phaser 4 Arcade Physics
- Platformer
- Puzzle
- RPG
- Steam Publish (Steamworks + SteamPipe)
- Survival Crafting
- three.js glTF Loading
- three.js Materials & Lighting
- three.js Scene Setup
- Tower Defense
- Visual Novel
- Étape 3 — Économie
- test_check_db_quality.py
- Audio design
- Dialogue systems
- Game AI: decisions, steering, and pathfinding
- Game Jam
- Input systems
- itch.io Publish (butler)
- Physics tuning
- Display object types
- Procedural generation
- Prototype Fast
- Engine skills
- Save systems
- Shader programming (cross-engine)
- next
- Étape 4 — Duels, classements, succès
- Level design
- Roguelike generation, FOV, and loot (depth)
- devDependencies
- Étape 6 — Mise en ligne
- Étape 2 — Site : comptes, paquets, album (100 % local)
- Behavior Tree core — Blackboard, nodes, leaves, composites, decorators
- Arcade body anatomy & collision detail (Phaser 4.2)
- Fixed timestep, interpolation, CCD, and stability
- Platformer feel tuning (depth)
- Noise for terrain, biomes, and scatter
- Puzzle board models and resolution (depth)
- Étape 5 — Social
- character/[id]/page.tsx
- Behavior Trees & Utility AI
- Follow & framing — depth for `camera-systems`
- Card effect resolution and structure (depth)
- Create Game Assets
- FPS shooting model and feel (depth)
- Layout, scaling & flow — depth for `game-ui-ux`
- Pacing, flow, teaching, and guidance
- Profiling & budgets — depth for `performance-optimization`
- Survival needs, crafting trees, and building (depth)
- Tower defense balancing and pathing (depth)
- Visual novel script model and flow (depth)
- dependencies
- auctions.ts
- Best practices & pitfalls — performance, memory, hybrid AI
- Raster, sprite, tile, background, and UI pipeline
- Behavior trees, FSMs, and the blackboard
- Feedback recipes — depth for `game-feel`
- Input buffering, game feel, devices, and accessibility
- RPG stats, combat, and quests (depth)
- Save versioning, migration, and robustness
- Shader effects and GLSL↔HLSL mapping
- SteamPipe: advanced build scripts, branches, CI/CD, troubleshooting
- test_generation_scripts.py
- actions.ts
- Anime Masters — Spécifications
- three.js scene graph, cameras & cleanup (r150+)
- Frontend Design
- Art direction and consistency
- 3D concept-to-runtime pipeline
- A custom dialogue runner
- Pathfinding: A* in full
- butler: CI/CD, full flag reference, and the update-check API
- Dungeon and level generation
- three.js glTF: loaders, compression & animation detail (r150+)
- start
- Utility AI system — curves, considerations, evaluator
- Adaptive (dynamic) music
- Art direction brief
- Ink and Yarn Spinner — syntax cheat sheet
- Engine detection — full project fingerprint
- allowScripts
- AGENTS.md
- Web Interface Guidelines
- Practical examples — guard AI, villager needs, hybrid agent
- Asset rights and provenance
- eslint.config.mjs
- buildCapsule
- start
- engine.js
- test_shell_blocks.py
- pull.ts
- audio.js
- duels/[id]/page.tsx
- test_find_databases.py
- session.ts
- duel-actions.ts
- re
- Step 2: Query Known Sources and Sinks
- packs.ts
- Money
- test_verify_query_suite.py
- Build Database Workflow
- test_script_flags.py
- test_suite_templates.py
- trades.ts
- wishlist.ts
- duel-quiz.ts
- duels.ts
- duel-rules.ts
- market/page.tsx
- subprocess
- Build Required
- Steps
- achievements.ts
- trade-actions.ts
- db.ts
- duels/page.tsx
- Build Fixes
- CodeQL Analysis
- economy.ts
- Sink Enumeration Queries
- test_build_mode_claims.py
- _unpreserved_pipelines
- Quality Assessment
- Data Extension YAML Format
- Important-Only Query Suite
- _discovery_without_status
- _unsourced_helper_uses
- _ungated_finalizes
- build_preview_sheet.py
- noyaux.js
- Performance Tuning
- Run-All Query Suite
- SARIF Processing
- build_log.sh
- test_arrays_are_consumed_in_the_block_that_builds_them
- État du projet — passation
- Ruleset Catalog
- test_both_quote_styles_are_extracted
- Threat Models Reference
- find_databases.sh
- generate_suite.sh
- codeql-skill-scripts

## God Nodes (most connected - your core abstractions)
1. `next` - 43 edges
2. `react` - 43 edges
3. `_database()` - 40 edges
4. `assess()` - 39 edges
5. `start()` - 31 edges
6. `SceneBody()` - 27 edges
7. `prisma` - 27 edges
8. `getSessionUser()` - 26 edges
9. `Fait et committé` - 26 edges
10. `Money()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Fait et committé` --references--> `warmUp()`  [INFERRED]
  docs/STATE.md → public/pack-opening/futur/engine.js
- `Lifecycle order` --references--> `init()`  [INFERRED]
  .claude/skills/phaser-core/references/scene-flow.md → public/pack-opening/futur/noyaux.js
- `Core workflow` --references--> `init()`  [INFERRED]
  .claude/skills/phaser-core/SKILL.md → public/pack-opening/futur/noyaux.js
- `Pitfalls` --references--> `init()`  [INFERRED]
  .claude/skills/phaser-core/SKILL.md → public/pack-opening/futur/noyaux.js
- `Pitfalls` --references--> `init()`  [INFERRED]
  .claude/skills/pixijs-rendering/SKILL.md → public/pack-opening/futur/noyaux.js

## Import Cycles
- None detected.

## Communities (180 total, 6 thin omitted)

### Community 0 - "lab.js"
Cohesion: 0.16
Nodes (16): BLUE, buildDecor(), hdr(), MINT, A, CHARS, DESC, HOME (+8 more)

### Community 1 - "album.ts"
Cohesion: 0.07
Nodes (43): AlbumFilters(), albumHref(), Chip(), OWNED, RARITIES, TYPES, Album(), AlbumPage() (+35 more)

### Community 2 - "three.js materials, lights & IBL reference (r155+)"
Cohesion: 0.25
Nodes (7): Common PBR intuition, IBL without an HDR file: PMREM + RoomEnvironment, Light types, Material cheat-sheet, Shadow camera by light type, three.js materials, lights & IBL reference (r155+), Transparency & sorting

### Community 3 - "SceneBody"
Cohesion: 0.17
Nodes (16): createTradeAction(), Composer(), metadata, NewTradePage(), Picker(), Row, TradeComposer(), NewTradeForm() (+8 more)

### Community 4 - "package.json"
Cohesion: 0.12
Nodes (15): name, private, version, dotenv, prisma, @prisma/adapter-better-sqlite3, @prisma/client, react-dom (+7 more)

### Community 5 - "import.ts"
Cohesion: 0.08
Nodes (40): Transition verbs, fetchAll(), inBatches(), Kept, main(), parsePages(), printSummary(), recompute() (+32 more)

### Community 6 - "auth-actions.ts"
Cohesion: 0.11
Nodes (22): better-auth, GET, POST, AuthFormState, describe(), ERRORS, field(), signIn() (+14 more)

### Community 7 - "start"
Cohesion: 0.27
Nodes (17): slot(), start(), emerge(), emit(), ensureMachine(), fillPod(), ignite(), legTarget() (+9 more)

### Community 8 - "asset_report.py"
Cohesion: 0.26
Nodes (4): alpha_stats(), inspect(), main(), parse_size()

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, check:achievements, check:auctions, check:duels, check:economy, check:recharge, check:trades (+9 more)

### Community 11 - "Three.js Textures"
Cohesion: 0.04
Nodes (44): Accessing UVs, Background Options, Basic Loading, Canvas Texture, Color Space, Compressed Textures, Cube Textures, CubeCamera (+36 more)

### Community 12 - "PixiJS 8.21 Rendering"
Cohesion: 0.06
Nodes (31): Duplicate listeners, Lifecycle order, Phaser scene flow (Phaser 4.2; core lifecycle also applies to 3.90), Removing or replacing a scene, The restart-state bug, 1. Game config + boot (ES module), 2. A Scene with the full lifecycle, 3. Cross-scene data + events (+23 more)

### Community 13 - "Three.js Shaders"
Cohesion: 0.06
Nodes (33): Common Injection Points, Common Material Properties, Common Shader Patterns, Debugging Shaders, Dissolve Effect, Extending Built-in Materials, External Shader Files, Fresnel Effect (+25 more)

### Community 14 - "Three.js Loaders"
Cohesion: 0.06
Nodes (32): ArrayBuffer, Async/Promise Loading, Blob URL, Built-in Cache, Caching, CubeTextureLoader, Custom Asset Manager, Custom Path/URL (+24 more)

### Community 15 - "Three.js Interaction"
Cohesion: 0.07
Nodes (29): Basic Raycasting, Box Selection, Camera Controls, Click to Select, DragControls, Efficient Raycasting, Event Handling Best Practices, FirstPersonControls (+21 more)

### Community 16 - "Common Effects"
Cohesion: 0.07
Nodes (28): Bloom (Glow), Chromatic Aberration, Color Correction, Combining Multiple Effects, Common Effects, Custom ShaderPass, Depth of Field (DOF), EffectComposer Setup (+20 more)

### Community 17 - "Three.js Lighting"
Cohesion: 0.07
Nodes (27): AmbientLight, Common Lighting Setups, Contact Shadows (Fake, Fast), Cube Texture Environment, DirectionalLight, DirectionalLight Shadows, Enable Shadows, Environment Lighting (IBL) (+19 more)

### Community 18 - "Three.js Animation"
Cohesion: 0.07
Nodes (26): Additive Blending, Animating Morph Targets, Animation Blending, Animation System Overview, Animation Utilities, AnimationAction, AnimationClip, AnimationMixer (+18 more)

### Community 19 - "Three.js Geometry"
Cohesion: 0.07
Nodes (26): Advanced Shapes, Basic Shapes, BufferAttribute Types, BufferGeometry, Built-in Geometries, Center Geometry, Clone and Transform, Common Patterns (+18 more)

### Community 20 - "Three.js Fundamentals"
Cohesion: 0.08
Nodes (24): Cameras, Clock for Animation, Color, Common Patterns, Coordinate System, Core Classes, Euler, Group (+16 more)

### Community 21 - "Three.js Materials"
Cohesion: 0.08
Nodes (24): Built-in Uniforms (auto-provided), Car Paint Example, Common Material Properties, Environment Maps, Glass Material Example, LineBasicMaterial & LineDashedMaterial, Material Cloning and Modification, Material Types Overview (+16 more)

### Community 22 - "react"
Cohesion: 0.33
Nodes (9): react, Guest(), Home(), Item(), Menu(), num, Wordmark(), MenuNav() (+1 more)

### Community 23 - "Master Router — Game-Development Skill Dispatcher"
Cohesion: 0.12
Nodes (15): 1. Engine detection (project fingerprint), 2. Task classification (phrasing → category), 3. Routing table (task → category → skill), 3a. Engine skills — read the one matching the detected engine + sub-task, 3b. Disciplines — load **with** the engine skill (concept ↔ engine API), 3c. Genres — **compose** engine + disciplines (bind `*` to the detected engine), 3d. Workflows — engine-independent process & shipping, 4. Read protocol (progressive disclosure) (+7 more)

### Community 24 - "wallet.ts"
Cohesion: 0.19
Nodes (25): check(), invariant(), main(), rejects(), canReward(), canClaimDailyBonus(), DAILY_BONUS, PACK_PRICE (+17 more)

### Community 25 - "DuplicateSale.tsx"
Cohesion: 0.46
Nodes (7): DuplicateSale(), sell(), toggle(), RARITY_ORDER, parseRarities(), previewDuplicatesAction(), sellDuplicatesAction()

### Community 26 - "Performance optimization"
Cohesion: 0.14
Nodes (13): 1. Frame budget math (turn "feels slow" into a number), 2. Measure with the engine profiler (do this before any fix), 3. Object pooling (stop allocating/freeing in hot loops), 4. Cut draw calls (the most common GPU-side win), 5. Kill per-frame allocations (GC spikes = stutter), Core workflow, Patterns, Performance optimization (+5 more)

### Community 27 - "Roguelike"
Cohesion: 0.14
Nodes (13): 1. Deterministic, seedable run RNG, 2. Energy-based turn scheduler (speeds differ), 3. Field of view + explored memory, Composition (build it from these skills), Core loop, Design knobs, Must-have systems, Patterns (+5 more)

### Community 28 - "Étape 1 — Base de personnages (100 % local)"
Cohesion: 0.15
Nodes (13): 1. Stack, 3. Import, 4. Nettoyage des descriptions, 5 bis. Finitions, 5. Rareté, 5 ter. Types, 6. Stats (ATK / DEF), 7. Mises à jour (+5 more)

### Community 29 - "Camera systems"
Cohesion: 0.15
Nodes (12): 1. Godot 2D built-in follow: smoothing + bounds (don't hand-roll first), 2. Frame-rate-independent smooth follow (when you hand-roll it), 3. Deadzone + look-ahead (lead the player, ignore jitter), 4. 3D third-person orbit with collision push-in, 5. Screen shake hook (owned trigger lives in `game-feel`), Camera systems, Core workflow, Patterns (+4 more)

### Community 30 - "Card Game"
Cohesion: 0.15
Nodes (12): 1. Zones + draw with automatic reshuffle, 2. Card as data + effect resolution, 3. Turn structure as a phase machine, Card Game, Composition (build it from these skills), Core loop, Design knobs, Must-have systems (+4 more)

### Community 31 - "FPS Shooter"
Cohesion: 0.15
Nodes (12): 1. Hitscan shot (instant ray, the workhorse), 2. Projectile shot (dodgeable, leads the target), 3. Time-to-kill (balance the trio together), Composition (build it from these skills), Core loop, Design knobs, FPS Shooter, Must-have systems (+4 more)

### Community 32 - "Game feel (juice)"
Cohesion: 0.15
Nodes (12): 1. Screen shake by decaying "trauma" (smooth, not a random jitter), 2. Hit-stop / freeze frame (sell impact by briefly stopping time), 3. Squash & stretch + overshoot via an eased tween (the "pop"), 4. A feedback bundle scaled by importance (keep juice proportional), Core principle: feedback is layered and exaggerated, Core workflow, Game feel (juice), Patterns (+4 more)

### Community 33 - "Game UI/UX"
Cohesion: 0.15
Nodes (12): 1. Anchors + containers, not absolute coordinates, 2. Scale to a reference resolution (one UI, many screens), 3. Safe-area inset for notches / overscan, 4. Gamepad/keyboard focus (UI is unusable on a controller without it), 5. Event-driven HUD (decouple UI from game logic), Core workflow, Game UI/UX, Patterns (+4 more)

### Community 34 - "Phaser 4 Arcade Physics"
Cohesion: 0.15
Nodes (12): 1. Enable Arcade Physics (game config), 2. Top-down movement (velocity from input), 3. Platformer jump (gravity + ground check), 4. Colliders vs overlaps (separate vs detect), 5. A group of moving objects, Core workflow, Patterns, Phaser 4 Arcade Physics (+4 more)

### Community 35 - "Platformer"
Cohesion: 0.15
Nodes (12): 1. Solve jump physics from height + time (not magic numbers), 2. Coyote time + jump buffer + variable height (the feel core), 3. One-way platforms, Composition (build it from these skills), Core loop, Design knobs (make the jump feel right), Must-have systems, Patterns (+4 more)

### Community 36 - "Puzzle"
Cohesion: 0.15
Nodes (12): 1. Board model + match detection (logic separate from visuals), 2. Resolve → collapse → refill → cascade (repeat to stability), 3. Undo via state snapshot or command, Composition (build it from these skills), Core loop, Design knobs, Must-have systems, Patterns (+4 more)

### Community 37 - "RPG"
Cohesion: 0.15
Nodes (12): 1. Derived stats from base attributes (recompute, never store as truth), 2. XP curve + level-up, 3. Quest objective update driven by game events, Composition (build it from these skills), Core loop, Design knobs, Must-have systems, Patterns (+4 more)

### Community 38 - "Steam Publish (Steamworks + SteamPipe)"
Cohesion: 0.15
Nodes (12): 1. SteamPipe ContentBuilder layout (Steamworks SDK), 2. Minimal app build script — `app_build_1000.vdf`, 3. Upload the build (Windows; substitute the platform builder elsewhere), 4. Iterate safely with a preview build (uploads nothing), Core workflow, Patterns, Pitfalls, Prerequisites (do these once, in order) (+4 more)

### Community 39 - "Survival Crafting"
Cohesion: 0.15
Nodes (12): 1. Needs decay with graded consequences, 2. Crafting: validate, then atomically consume inputs, 3. Gathering gated by tool tier, Composition (build it from these skills), Core loop, Design knobs, Must-have systems, Patterns (+4 more)

### Community 40 - "three.js glTF Loading"
Cohesion: 0.15
Nodes (12): 1. Load a model and frame it, 2. Play a skinned animation with AnimationMixer, 3. Cross-fade between two clips, 4. DRACO-compressed geometry, 5. Find and animate a named part, Core workflow, Patterns, Pitfalls (+4 more)

### Community 41 - "three.js Materials & Lighting"
Cohesion: 0.15
Nodes (12): 1. PBR material under a 3-light rig, 2. Unlit material (no light needed), 3. Shadows (the three required switches + camera fit), 4. PBR textures on a material, 5. Image-based lighting from an HDR environment, Core workflow, Patterns, Pitfalls (+4 more)

### Community 42 - "three.js Scene Setup"
Cohesion: 0.15
Nodes (12): 1. HTML import map + module entry (no bundler), 2. Scene + camera + renderer, 3. The render loop (setAnimationLoop + Timer), 4. Responsive resize, 5. OrbitControls (orbit / pan / zoom), Core workflow, Patterns, Pitfalls (+4 more)

### Community 43 - "Tower Defense"
Cohesion: 0.15
Nodes (12): 1. Wave spawner (timed, data-driven), 2. Tower targeting (filter to range, then pick by priority), 3. "Can this lane hold?" sanity check (DPS vs. HP), Composition (build it from these skills), Core loop, Design knobs, Must-have systems, Patterns (+4 more)

### Community 44 - "Visual Novel"
Cohesion: 0.15
Nodes (12): 1. Script as data the engine walks, 2. Typewriter reveal + advance (skippable), 3. Choice sets a flag that branches later content, Composition (build it from these skills), Core loop, Design knobs, Must-have systems, Patterns (+4 more)

### Community 45 - "Étape 3 — Économie"
Cohesion: 0.15
Nodes (13): 10. Critères pour dire que l'étape 3 est finie, 1. Monnaie, 2. Sources et dépenses, 3. Échanges directs, 4. Enchères, 5. Marché et liste de souhaits, 6. Notifications, 7. Anti-abus (+5 more)

### Community 46 - "test_check_db_quality.py"
Cohesion: 0.06
Nodes (51): archive_file_count(), _archive_files(), _archive_source_root(), assess(), baseline_lines_of_code(), _errors_from_one_extractor(), extractor_error_count(), _extractor_of() (+43 more)

### Community 47 - "Audio design"
Cohesion: 0.17
Nodes (11): 1. Bus routing and dB gain, 2. Ducking via sidechain (music dips under voice), 3. SFX variation (kill the "machine gun" repeat), 4. Beat-synced events (quantize to the music grid), Audio design, Core workflow, Patterns, Pitfalls (+3 more)

### Community 48 - "Dialogue systems"
Cohesion: 0.17
Nodes (11): 1. Engine-neutral dialogue graph (data, not code), 2. Runner step (a state machine over the graph), 3. Ink — branching with knots, choices, and variables (inkle), 4. Yarn Spinner — nodes, options, and commands (Yarn Spinner 3.x), Core workflow, Dialogue systems, Patterns, Pitfalls (+3 more)

### Community 49 - "Game AI: decisions, steering, and pathfinding"
Cohesion: 0.17
Nodes (11): 1. Finite state machine (one state object, explicit transitions), 2. Behavior tree tick (composite nodes return a status), 3. Steering: seek and arrive (smooth, frame-rate independent), 4. A* heuristic must not overestimate (or paths stop being shortest), Core workflow, Game AI: decisions, steering, and pathfinding, Patterns, Pitfalls (+3 more)

### Community 50 - "Game Jam"
Cohesion: 0.17
Nodes (11): 1. Scope budget by jam length (plan backwards from the deadline), 2. The 48-hour timeline (concrete blocks), 3. Feature triage — decide fast, decide out loud, 4. Pre-submission build check (run on a clean copy, not your dev folder), Core workflow, Game Jam, Patterns, Pitfalls (+3 more)

### Community 51 - "Input systems"
Cohesion: 0.17
Nodes (11): 1. Actions over raw keys; edge vs held, 2. Analog deadzone and sensitivity, 3. Input buffering + coyote time (forgiving, responsive feel), 4. Rebinding with conflict detection, Core workflow, Input systems, Patterns, Pitfalls (+3 more)

### Community 52 - "itch.io Publish (butler)"
Cohesion: 0.17
Nodes (11): 1. The one command you need — `butler push`, 2. Channel naming controls the platform tag (kebab-case, lowercase), 3. Version, verify, and preview, 4. First-time, hidden, and filtered pushes, Core workflow, itch.io Publish (butler), Patterns, Pitfalls (+3 more)

### Community 53 - "Physics tuning"
Cohesion: 0.17
Nodes (11): 1. Fixed timestep for simulation, render interpolation for smoothness, 2. Stop tunneling: CCD + a speed cap, 3. Body tuning: mass, drag, gravity scale, material, 4. Collision layers and masks (who collides with whom), Core workflow, Patterns, Physics tuning, Pitfalls (+3 more)

### Community 54 - "Display object types"
Cohesion: 0.17
Nodes (11): AnimatedSprite, Cleanup, Display object types, Filters, Graphics (vector drawing), ParticleContainer (many simple sprites), PixiJS v8 assets & display objects, Text & BitmapText (+3 more)

### Community 55 - "Procedural generation"
Cohesion: 0.17
Nodes (11): 1. Seeded, deterministic RNG (the foundation), 2. Fractal (fBm) noise for heightmaps, 3. Weighted loot table (rarity-correct selection), 4. Rooms-and-corridors dungeon (sketch), Core workflow, Patterns, Pitfalls, Procedural generation (+3 more)

### Community 56 - "Prototype Fast"
Cohesion: 0.17
Nodes (11): 1. The prototype brief (fill this in before coding), 2. Greybox the core loop, fake everything else (engine-agnostic pseudocode), 3. Kill criteria — make the keep/kill call observable, not emotional, 4. Containment: keep a spike out of the shipping codebase, Core workflow, Patterns, Pitfalls, Prototype Fast (+3 more)

### Community 57 - "Engine skills"
Cohesion: 0.17
Nodes (11): Binding gaps (be honest; do not fabricate a skill), Disciplines (`skills/disciplines/`) — cross-engine concepts, load **with** the engine skill, Engine skills, Full routing table — every authored skill, Genres (`skills/genres/`) — whole-game templates, **compose** engine + disciplines, Godot (`skills/godot/`, target Godot 4.7) — read after `project.godot` is detected, Other engines (`skills/other-engines/`), Unity (`skills/unity/`, target Unity 6.3 LTS / 6000.3) (+3 more)

### Community 58 - "Save systems"
Cohesion: 0.17
Nodes (11): 1. Serialize state as plain data (not engine objects), 2. Atomic, crash-safe write (temp + rename), 3. Versioned load with migration, 4. Save slots + throttled autosave, Core workflow, Patterns, Pitfalls, References (+3 more)

### Community 59 - "Shader programming (cross-engine)"
Cohesion: 0.17
Nodes (11): 1. Fragment basics: sample, tint, and combine, 2. Scrolling UVs (animated texture) — frame-rate independent, 3. Dissolve (threshold a noise map, glow the edge), 4. Fresnel rim light (3D) — brighten glancing angles, Core workflow, Patterns, Pitfalls, References (+3 more)

### Community 60 - "next"
Cohesion: 0.14
Nodes (22): nextConfig, next, claimDailyBonusAction(), metadata, michroma, RootLayout(), sora, AlbumLink() (+14 more)

### Community 61 - "Étape 4 — Duels, classements, succès"
Cohesion: 0.17
Nodes (12): 1. Déroulement d'un duel, 2. Quiz, 3. Calcul du combat, 4. Récompenses et limites, 5. Classements, 6. Succès, 7. Modèle de données (ajouts), 8. Pages (+4 more)

### Community 62 - "Level design"
Cohesion: 0.18
Nodes (10): 1. Player metrics drive every dimension, 2. Encounter / pacing as data (a tension timeline), 3. Gating and the critical path (a small graph), Core workflow, Level design, Patterns, Pitfalls, References (+2 more)

### Community 63 - "Roguelike generation, FOV, and loot (depth)"
Cohesion: 0.18
Nodes (10): 1. Dungeon generation approaches, 2. Connectivity (never skip this), 3. Field of view — symmetric shadowcasting, 4. Weighted, depth-scaled loot and spawn tables, 5. Run vs. profile state (permadeath + meta-progression), BSP (binary space partition — tidy, building-like), Cellular automata (organic caves), Drunkard's walk (cheap, winding) (+2 more)

### Community 64 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/turbopack, tsx, @types/node (+3 more)

### Community 65 - "Étape 6 — Mise en ligne"
Cohesion: 0.18
Nodes (11): 1. Hébergement, 2. Passage de SQLite à PostgreSQL, 3. Emails, 4. Sécurité, 5. Aspects juridiques, 6. Lancement, 7. Modèle de données (ajouts), 8. Critères pour dire que l'étape 6 est finie (+3 more)

### Community 66 - "Étape 2 — Site : comptes, paquets, album (100 % local)"
Cohesion: 0.18
Nodes (11): 1. Stack, 2. Pages, 3. Paquets, 4. Tirage, 5. Modèle de données (ajouts), 6. Ouverture d'un paquet, 7. Album, 8. Critères pour dire que l'étape 2 est finie (+3 more)

### Community 67 - "Behavior Tree core — Blackboard, nodes, leaves, composites, decorators"
Cohesion: 0.20
Nodes (9): Action leaves — multi-frame work that returns Running, Base classes: leaf, composite, decorator, Behavior Tree core — Blackboard, nodes, leaves, composites, decorators, Blackboard — the shared state system, Composites — how child statuses combine, Condition leaves — instantaneous predicates, Decorators — wrap one child to change its meaning, Running the tree (+1 more)

### Community 68 - "Arcade body anatomy & collision detail (Phaser 4.2)"
Cohesion: 0.20
Nodes (9): Arcade body anatomy & collision detail (Phaser 4.2), Colliders, overlaps, and callbacks, Collision categories & masks, Contact state, Custom hitboxes, Debugging, Dynamic vs static bodies, Movement properties (+1 more)

### Community 69 - "Fixed timestep, interpolation, CCD, and stability"
Cohesion: 0.20
Nodes (9): Continuous collision detection (CCD), Fixed timestep, interpolation, CCD, and stability, Render interpolation, Sleeping, Solver iterations and stability, Stability checklist, Substepping, The accumulator loop (engine-neutral) (+1 more)

### Community 70 - "Platformer feel tuning (depth)"
Cohesion: 0.20
Nodes (9): 1. Deriving jump physics, 2. Full feel knob reference, 3. Apex hang and fast-fall, 4. Corner correction (ceiling and ledge nudging), 5. One-way platforms and drop-through, 6. Moving platforms, 7. Camera follow, 8. Teaching and pacing (hand-off to `level-design`) (+1 more)

### Community 71 - "Noise for terrain, biomes, and scatter"
Cohesion: 0.20
Nodes (9): Biome lookup from two fields, Determinism checklist, Frequency and wavelength, Island shaping, Noise for terrain, biomes, and scatter, Object scatter (trees, rocks), Octaves (fractal Brownian motion), Redistribution: shaping the elevation curve (+1 more)

### Community 72 - "Puzzle board models and resolution (depth)"
Cohesion: 0.20
Nodes (9): 1. Match-3 full resolution, 2. Deadlock detection and reshuffle (match-3), 3. Cascade scoring, 4. Sokoban / push puzzles, 5. Rule-based / logic puzzles, 6. Undo strategies, 7. Solvable generation, 8. Input locking and presentation (+1 more)

### Community 73 - "Étape 5 — Social"
Cohesion: 0.22
Nodes (9): 1. Profils publics et vitrine, 2. Amis, 3. Guildes, 4. Messagerie, 6. Pages, 7. Critères pour dire que l'étape 5 est finie, Décisions validées, Objectif (+1 more)

### Community 74 - "character/[id]/page.tsx"
Cohesion: 0.18
Nodes (13): createAuctionAction(), CopyActions(), Props, dateFmt, generateMetadata(), MONTHS, numFmt, parseId() (+5 more)

### Community 75 - "Behavior Trees & Utility AI"
Cohesion: 0.22
Nodes (8): Architecture at a glance, Behavior Trees & Utility AI, Core workflow, Pitfalls, References, Related skills, Utility scoring in one snippet, When to use

### Community 76 - "Follow & framing — depth for `camera-systems`"
Cohesion: 0.22
Nodes (8): 1. Why `1 - exp(-rate*dt)` (frame-rate-independent smoothing), 2. Full 2D rig: deadzone + look-ahead + bounds, 3. 3D third-person orbit, 4. First-person look, 5. Multi-target / group framing, 6. Cinematic blends & transitions, 7. Per-engine rig summary, Follow & framing — depth for `camera-systems`

### Community 77 - "Card effect resolution and structure (depth)"
Cohesion: 0.22
Nodes (8): 1. Effects as data + an interpreter, 2. The resolution queue / stack, 3. Triggers and keywords, 4. Targeting, 5. Deckbuilder vs. constructed, 6. Shuffle fairness and consistency, 7. Mana / resource curves, Card effect resolution and structure (depth)

### Community 78 - "Create Game Assets"
Cohesion: 0.22
Nodes (8): Choose the production path, Core workflow, Create Game Assets, Image-generation handoff, Quality gates, Raster QA recipes, References, Related skills

### Community 79 - "FPS shooting model and feel (depth)"
Cohesion: 0.22
Nodes (8): 1. Hitscan vs. projectile, 2. Hitscan shot, 3. Damage falloff (range limiting for hitscan), 4. Spread and recoil, 5. Time-to-kill (TTK) — the master balance lever, 6. Hit registration and (multiplayer) lag, 7. Enemy AI states (single-player), FPS shooting model and feel (depth)

### Community 80 - "Layout, scaling & flow — depth for `game-ui-ux`"
Cohesion: 0.22
Nodes (8): 1. Scaling modes per engine, 2. Safe-area math, 3. Focus navigation (full pattern), 4. Screen/menu stack, 5. Diegetic vs non-diegetic UI, 6. Accessibility (bake in, don't bolt on), 7. Localization-ready layout, Layout, scaling & flow — depth for `game-ui-ux`

### Community 81 - "Pacing, flow, teaching, and guidance"
Cohesion: 0.22
Nodes (8): 2D vs 3D considerations, Blockout review checklist, Gating tools, Pacing, flow, teaching, and guidance, Readability and guidance (lead without walls), The critical path, golden path, and branches, The difficulty / tension curve, The teaching loop (mechanic introduction)

### Community 82 - "Profiling & budgets — depth for `performance-optimization`"
Cohesion: 0.22
Nodes (8): 1. CPU-vs-GPU triage (decide before you fix), 2. Per-engine profiler quick start, 3. Pooling manager (generic), 4. Batching & instancing rules, 5. Allocation / GC guidance, 6. Do-less techniques (algorithmic wins), 7. Asset budgets (prevent regressions at the source), Profiling & budgets — depth for `performance-optimization`

### Community 83 - "Survival needs, crafting trees, and building (depth)"
Cohesion: 0.22
Nodes (8): 1. Needs model, 2. Crafting tech tree, 3. Recipe data and multi-step chains, 4. Gathering and respawn, 5. Base building, 6. Threat escalation, 7. Saving a large world, Survival needs, crafting trees, and building (depth)

### Community 84 - "Tower defense balancing and pathing (depth)"
Cohesion: 0.22
Nodes (8): 1. Representing the path, 2. Tower targeting modes, 3. DPS and "can this lane hold?", 4. Enemy scaling across waves, 5. Economy, 6. Leak / lives model, 7. Wave pacing, Tower defense balancing and pathing (depth)

### Community 85 - "Visual novel script model and flow (depth)"
Cohesion: 0.22
Nodes (8): 1. The script data model, 2. Route structures, 3. Flags and variables, 4. Save-anywhere data, 5. Backlog, skip, and auto, 6. Presentation conventions, 7. Localization, Visual novel script model and flow (depth)

### Community 86 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, better-auth, dotenv, next, @prisma/adapter-better-sqlite3, @prisma/client, react, react-dom (+1 more)

### Community 87 - "auctions.ts"
Cohesion: 0.15
Nodes (30): Fait et committé, check(), main(), invariants(), rejects(), POST(), assertEligible(), AuctionDraft (+22 more)

### Community 88 - "Best practices & pitfalls — performance, memory, hybrid AI"
Cohesion: 0.25
Nodes (7): Avoiding deep, brittle trees, Best practices & pitfalls — performance, memory, hybrid AI, Combining Utility AI with behavior trees (hybrid), Debugging, Memory management, Performance & profiling, Pitfall quick-reference

### Community 89 - "Raster, sprite, tile, background, and UI pipeline"
Cohesion: 0.25
Nodes (7): Backgrounds and parallax, Import checkpoints, Primary documentation, Raster, sprite, tile, background, and UI pipeline, Sprites and animation, Tiles and repeatable textures, UI art and icons

### Community 90 - "Behavior trees, FSMs, and the blackboard"
Cohesion: 0.25
Nodes (7): Behavior trees, FSMs, and the blackboard, FSM vs behavior tree — choosing, Leaf examples, Node taxonomy, Stateful composites and RUNNING, The blackboard, Utility AI (brief)

### Community 91 - "Feedback recipes — depth for `game-feel`"
Cohesion: 0.25
Nodes (7): 1. The trauma model (why shake feels good), 2. Easing cheat sheet — which curve for which job, 3. The rest of the feedback menu, 4. Importance tiers (keep the whole game proportional), 5. Accessibility (ship these toggles), 6. Per-engine binding summary, Feedback recipes — depth for `game-feel`

### Community 92 - "Input buffering, game feel, devices, and accessibility"
Cohesion: 0.25
Nodes (7): Accessibility checklist, Buffering and coyote time, tuned, Device detection and prompt swapping, Input buffering, game feel, devices, and accessibility, Jump feel (where input meets physics), Loop placement, Touch controls

### Community 93 - "RPG stats, combat, and quests (depth)"
Cohesion: 0.25
Nodes (7): 1. Stat block: base, derived, and modifiers, 2. Damage formulas, 3. Leveling curves, 4. Turn-based vs. action combat timelines, 5. Inventory and equipment data, 6. Quest state model, RPG stats, combat, and quests (depth)

### Community 94 - "Save versioning, migration, and robustness"
Cohesion: 0.25
Nodes (7): Backups and rollback, Format trade-offs, Load-time validation checklist, Save versioning, migration, and robustness, The migration chain, The version field is non-negotiable, What to store vs recompute

### Community 95 - "Shader effects and GLSL↔HLSL mapping"
Cohesion: 0.25
Nodes (7): 2D sprite outline (sample the alpha neighborhood), Color grading via a curve (brightness/contrast/saturation), GLSL ↔ HLSL quick reference, Per-engine notes, Performance checklist, Shader effects and GLSL↔HLSL mapping, Vignette (darken the screen edges) — post-process

### Community 96 - "SteamPipe: advanced build scripts, branches, CI/CD, troubleshooting"
Cohesion: 0.25
Nodes (7): 1. App build script with separate depot scripts, 2. Running builds (per platform), 3. Branches (betas) — test before customers see it, 4. CI/CD upload (token-based login, no password in scripts), 5. Patch-size hygiene (keep updates small), 6. Troubleshooting table, SteamPipe: advanced build scripts, branches, CI/CD, troubleshooting

### Community 97 - "test_generation_scripts.py"
Cohesion: 0.12
Nodes (16): _fake_codeql(), _fake_uv(), _invocation_block(), _run(), _significant(), _suite_text(), test_a_suite_that_fails_verification_is_deleted(), test_generates_a_suite_naming_the_language() (+8 more)

### Community 98 - "actions.ts"
Cohesion: 0.18
Nodes (19): Ouverture 3D dans `/packs`, buyPackAction(), BuyPackResult, openPackAction(), OpenPackResult, ImmersiveOpener(), onMessage(), SceneMessage (+11 more)

### Community 99 - "Anime Masters — Spécifications"
Cohesion: 0.25
Nodes (6): Anime Masters, Commandes, Installation, Prérequis, Anime Masters — Spécifications, MVP (validé)

### Community 100 - "three.js scene graph, cameras & cleanup (r150+)"
Cohesion: 0.25
Nodes (7): Coordinates & conventions, Disposing of resources (avoiding leaks), PerspectiveCamera vs OrthographicCamera, Render-on-demand, Stopping and restarting the loop, The Object3D hierarchy, three.js scene graph, cameras & cleanup (r150+)

### Community 101 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 102 - "Art direction and consistency"
Cohesion: 0.29
Nodes (6): Art direction and consistency, Build a visual target, Common drift signals, Describe a system, not a mood word, Evaluate at three distances, Keep a family coherent

### Community 103 - "3D concept-to-runtime pipeline"
Cohesion: 0.29
Nodes (6): 3D concept-to-runtime pipeline, Default pipeline, Generated 3D caution, Geometry gates, Material and texture gates, Primary documentation

### Community 104 - "A custom dialogue runner"
Cohesion: 0.29
Nodes (6): A custom dialogue runner, Graph schema, Localization lookup, The runner state machine, Validation pass, Variable store and expression evaluation

### Community 105 - "Pathfinding: A* in full"
Cohesion: 0.29
Nodes (6): Complete A* (engine-neutral Python), Grid graph adapter, Heuristics by movement type, Pathfinding: A* in full, Performance notes, When to use an engine navmesh instead

### Community 106 - "butler: CI/CD, full flag reference, and the update-check API"
Cohesion: 0.29
Nodes (6): 1. Authentication for CI (`BUTLER_API_KEY`), 2. Installing butler in CI (use `broth`, not the page link), 3. GitHub Actions example, 4. `butler push` flag reference (verified), 5. Notify players of updates (no auth required), butler: CI/CD, full flag reference, and the update-check API

### Community 107 - "Dungeon and level generation"
Cohesion: 0.29
Nodes (6): A. Rooms and corridors, B. BSP (binary space partitioning), C. Random-walk / cellular caves, Connectivity validation (do this every time), Distribution control for loot/spawns, Dungeon and level generation

### Community 108 - "three.js glTF: loaders, compression & animation detail (r150+)"
Cohesion: 0.29
Nodes (6): AnimationMixer detail, Async loading with a progress bar, Compression: DRACO, Meshopt, KTX2, Exporter hygiene (Blender → glTF), Reusing a model many times, three.js glTF: loaders, compression & animation detail (r150+)

### Community 109 - "start"
Cohesion: 0.16
Nodes (20): post(), start(), burst(), charge(), checkStored(), finish(), hud(), impact() (+12 more)

### Community 110 - "Utility AI system — curves, considerations, evaluator"
Cohesion: 0.33
Nodes (5): Considerations — one fact, one curve, Response-curve library, Scored actions and the compensation factor, The evaluator — scoring and selection, Utility AI system — curves, considerations, evaluator

### Community 111 - "Adaptive (dynamic) music"
Cohesion: 0.33
Nodes (5): Adaptive (dynamic) music, Horizontal re-sequencing, Mapping gameplay to intensity, Practical notes, Vertical layering

### Community 112 - "Art direction brief"
Cohesion: 0.33
Nodes (5): Art direction brief, Game frame, Technical contract, Visual system, Visual target

### Community 113 - "Ink and Yarn Spinner — syntax cheat sheet"
Cohesion: 0.33
Nodes (5): Ink and Yarn Spinner — syntax cheat sheet, Ink essentials, Integration notes, Side-by-side, Yarn Spinner essentials

### Community 114 - "Engine detection — full project fingerprint"
Cohesion: 0.33
Nodes (5): Confidence boosters from task files, Detect the installed version, Disambiguation rules (must-handle ambiguities), Engine detection — full project fingerprint, Plain-text engine mentions

### Community 115 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, better-sqlite3@12.11.1, esbuild@0.28.2, prisma@7.10.0, @prisma/engines@7.10.0, unrs-resolver@1.12.2

### Community 116 - "AGENTS.md"
Cohesion: 0.33
Nodes (5): Git workflow, graphify, Session handoff, This is NOT the Next.js you know, Token-efficient defaults

### Community 117 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 118 - "Practical examples — guard AI, villager needs, hybrid agent"
Cohesion: 0.40
Nodes (4): 1. Enemy guard — Patrol → Combat behavior tree, 2. Villager needs — Utility AI, 3. Hybrid — a BT that delegates a choice to Utility AI, Practical examples — guard AI, villager needs, hybrid agent

### Community 119 - "Asset rights and provenance"
Cohesion: 0.40
Nodes (4): Asset rights and provenance, Decision rules, Record per shipped asset, Useful primary references

### Community 120 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 121 - "buildCapsule"
Cohesion: 0.33
Nodes (3): buildCapsule(), halfGeometry(), HOME

### Community 122 - "start"
Cohesion: 0.44
Nodes (10): start(), burst(), finish(), fxPulse(), makeCard(), moveTo(), openBooster(), reveal() (+2 more)

### Community 123 - "engine.js"
Cohesion: 0.13
Nodes (22): FOCUS, MODES, PERF, canvasTex(), cardPainter(), drawFront(), CHARS, defaultSounds() (+14 more)

### Community 124 - "test_shell_blocks.py"
Cohesion: 0.08
Nodes (17): _blocks(), _embedded_python(), _embedded_python_bodies(), _ident(), _markdown_files(), _outside_heredoc(), test_array_names_were_found(), test_arrays_are_expanded_with_subscript() (+9 more)

### Community 125 - "pull.ts"
Cohesion: 0.13
Nodes (25): Counts, expected(), main(), ModeOutcome, option(), pct(), RARITIES, RATE (+17 more)

### Community 126 - "audio.js"
Cohesion: 0.29
Nodes (4): ARP, BARS, futurAudio(), LEVEL

### Community 127 - "duels/[id]/page.tsx"
Cohesion: 0.15
Nodes (22): DefenseSession(), num, Phase, Duel(), DuelPage(), metadata, num, Outcome() (+14 more)

### Community 128 - "test_find_databases.py"
Cohesion: 0.18
Nodes (11): _fake_codeql(), _invoke(), _marker(), _run(), test_a_database_under_a_dotted_ancestor_is_still_found(), test_a_dot_directory_below_the_root_is_still_skipped(), test_a_failed_builds_marker_is_not_reported_as_a_database(), test_a_missing_codeql_is_an_error_not_an_empty_list() (+3 more)

### Community 129 - "session.ts"
Cohesion: 0.12
Nodes (20): server-only, Leaderboard(), LeaderboardPage(), metadata, num, dateFmt, metadata, Notifications() (+12 more)

### Community 130 - "duel-actions.ts"
Cohesion: 0.22
Nodes (22): main(), quickDuel(), throws(), acceptDuelAction(), answerAction(), createDuelAction(), declineDuelAction(), ids() (+14 more)

### Community 131 - "re"
Cohesion: 0.15
Nodes (11): _collect(), _doc_files(), _headings(), _js_constants(), _resolve(), _slug(), test_anchor_link_lands_on_a_heading(), test_pointers_were_found() (+3 more)

### Community 132 - "Step 2: Query Known Sources and Sinks"
Cohesion: 0.09
Nodes (23): 2a: Select Database and Language, 2b: Write Source Enumeration Query, 2c: Write Sink Enumeration Query, 2d: Run Queries, 2e: Summarize Results, 3a: Map the Project's API Surface, 3b: Cross-Reference Against Known Sources and Sinks, 3c: Report Gaps (+15 more)

### Community 133 - "packs.ts"
Cohesion: 0.18
Nodes (18): check(), main(), minutesUntil(), near(), setStock(), getCollectionPower(), afterOpening(), packStock (+10 more)

### Community 134 - "Money"
Cohesion: 0.16
Nodes (18): Achievements(), AchievementsPage(), dateFmt, metadata, buyNowAction(), cancelAuctionAction(), placeBidAction(), run() (+10 more)

### Community 135 - "test_verify_query_suite.py"
Cohesion: 0.21
Nodes (9): _result(), test_codeql_failure_fails(), test_empty_suite_cli_exits_nonzero(), test_empty_suite_fails(), test_malformed_output_fails(), test_non_empty_suite_succeeds(), main(), resolve_queries() (+1 more)

### Community 136 - "Build Database Workflow"
Cohesion: 0.09
Nodes (22): 1a. Detect Language, 1b. Create Exclusion Config (Interpreted Languages Only), Build Database Workflow, Build Log, Build required, no fallback (Go, Swift), Build required, `none` available as a fallback (C/C++, Java/Kotlin, C#, Rust), Exit Conditions, Final Report (+14 more)

### Community 137 - "test_script_flags.py"
Cohesion: 0.12
Nodes (9): _accepted_flags(), _argparse_scripts(), _doc_files(), _invocations(), test_documented_flag_exists(), test_flagged_invocations_were_found(), test_scripts_were_discovered(), test_the_scanner_tells_an_invocation_from_a_mention() (+1 more)

### Community 138 - "test_suite_templates.py"
Cohesion: 0.17
Nodes (11): _entry_keys(), _template(), test_important_only_covers_every_precision_it_claims(), test_important_only_filters_on_security_tag(), test_run_all_does_not_filter_on_precision(), test_run_all_imports_both_official_suites(), test_template_declares_the_language_placeholder(), test_template_excludes_deprecated_and_model_queries() (+3 more)

### Community 139 - "trades.ts"
Cohesion: 0.20
Nodes (17): check(), main(), invariant(), rejects(), tradeEligibility(), assertCards(), cancelTrade(), CARD_SELECT (+9 more)

### Community 140 - "wishlist.ts"
Cohesion: 0.20
Nodes (15): WishButton(), addWishAction(), removeWishAction(), run(), metadata, Wishlist(), WishlistPage(), RemoveWish() (+7 more)

### Community 141 - "duel-quiz.ts"
Cohesion: 0.17
Nodes (18): ALL_KINDS, allMedia(), build(), dateLabel(), DAYS_IN_MONTH, GeneratedQuestion, generateQuestions(), loadSubject() (+10 more)

### Community 142 - "duels.ts"
Cohesion: 0.14
Nodes (19): QuestionPrompt, ANSWER_GRACE_MS, CombatResult, DUEL_REWARDS, QUESTIONS_PER_CARD, REWARDED_DUELS_PER_OPPONENT, TEAM_SIZE, DuelCard (+11 more)

### Community 143 - "duel-rules.ts"
Cohesion: 0.20
Nodes (17): check(), f(), pureChecks(), ATK_MOD, attackDamage(), DEF_MOD, DUEL_ACCEPT_MS, DUEL_PLAY_MS (+9 more)

### Community 144 - "market/page.tsx"
Cohesion: 0.16
Nodes (16): 2. Modèle de données, Countdown(), format(), FINISHES, Market(), MarketPage(), metadata, one() (+8 more)

### Community 145 - "subprocess"
Cohesion: 0.21
Nodes (8): _bash(), test_an_unwritable_log_fails_at_source_time(), test_log_file_defaults_under_output_dir(), test_output_is_written_to_the_log(), test_run_logged_keeps_arguments_apart(), test_run_logged_reports_success(), test_run_logged_reports_the_commands_failure(), test_sourcing_sets_pipefail_for_the_caller()

### Community 146 - "Build Required"
Cohesion: 0.12
Nodes (16): Build Required, C#, C/C++, C/C++ Options, Extractor Options, Go, Java/Kotlin, Java Options (+8 more)

### Community 147 - "Steps"
Cohesion: 0.12
Nodes (17): 2a: Query Packs, 2b: Detect Model Packs, Final Output, Generate custom suite, Log selected query packs, Performance, Produce final results, Run analysis (+9 more)

### Community 148 - "achievements.ts"
Cohesion: 0.23
Nodes (13): check(), main(), AchievementDef, AchievementFacts, ACHIEVEMENTS, checkAchievements(), checkAchievementsSafe(), earned() (+5 more)

### Community 149 - "trade-actions.ts"
Cohesion: 0.25
Nodes (13): MarkRead(), acceptTradeAction(), cancelTradeAction(), markNotificationsReadAction(), refuseTradeAction(), run(), TradeInput, dateFmt (+5 more)

### Community 150 - "db.ts"
Cohesion: 0.17
Nodes (9): CardDb, globalForPrisma, prisma, collectionLeaderboard(), CollectionRow, Raw, scores(), Db (+1 more)

### Community 151 - "duels/page.tsx"
Cohesion: 0.20
Nodes (13): NewDuelForm(), dateFmt, DuelList(), Duels(), DuelsPage(), metadata, OUTCOME, STATUS (+5 more)

### Community 152 - "Build Fixes"
Cohesion: 0.14
Nodes (10): 1. Clean existing state, 2. Clean build cache, 3. Install missing dependencies, 4. Handle private registries, Build Fixes, macOS arm64e Workaround, Sub-method 2m-a: Homebrew clang/gcc with multi-step tracing, Sub-method 2m-b: Rosetta x86_64 emulation (+2 more)

### Community 153 - "CodeQL Analysis"
Cohesion: 0.14
Nodes (14): Auto-Detection Logic, Building unattended, CodeQL Analysis, Database Discovery, Database Selection Prompt, Each Bash call is a fresh shell, Essential Principles, General Decision Prompt (+6 more)

### Community 154 - "economy.ts"
Cohesion: 0.14
Nodes (13): ANTI_SNIPING_MS, AUCTION_DURATIONS_H, AUCTION_FEE_RATE, COLLECTION_POINTS, FINISH_MULTIPLIER, FINISH_RANK, MAX_ACTIVE_AUCTIONS, MAX_PACK_PURCHASES_PER_DAY (+5 more)

### Community 155 - "Sink Enumeration Queries"
Cohesion: 0.15
Nodes (13): C\#, C / C++, Concept Class Reference, Diagnostic Query Templates, Go, Import Reference, Java, JavaScript / TypeScript (+5 more)

### Community 156 - "test_build_mode_claims.py"
Cohesion: 0.15
Nodes (4): test_claims_name_the_verified_codeql_version(), test_go_is_not_listed_as_needing_no_build(), test_language_table_covers_both_axes(), test_languages_without_a_none_mode_are_flagged()

### Community 157 - "_unpreserved_pipelines"
Cohesion: 0.17
Nodes (6): _sets_pipefail(), _status_consuming_pipelines(), test_detector_flags_unsafe_pipelines(), test_detector_passes_safe_pipelines(), test_no_block_consumes_an_unpreserved_pipeline_status(), _unpreserved_pipelines()

### Community 159 - "Quality Assessment"
Cohesion: 0.20
Nodes (10): 1. Adjust source root, 2. Fix "no source code seen" (cached build - compiled languages only), 3. Install type stubs / dependencies, 4. Adjust extractor options, Collect Metrics, Compare Against Expected Source, Enforce the Thresholds, Improve Quality (if poor) (+2 more)

### Community 160 - "Data Extension YAML Format"
Cohesion: 0.25
Nodes (8): Data Extension YAML Format, Deploying Extensions, Language-Specific Notes, Neutral Models, Sink Models, Source Models, Structure, Summary Models

### Community 161 - "Important-Only Query Suite"
Cohesion: 0.25
Nodes (8): Generation Script, How Filtering Works on Third-Party Queries, Important-Only Query Suite, Metadata Criteria, Phase 1: Suite selection (which queries run), Phase 2: Post-analysis filter (which results are reported), Suite Template, Why a Custom Suite

### Community 162 - "_discovery_without_status"
Cohesion: 0.25
Nodes (4): _discovery_without_status(), test_detector_flags_discovery_process_substitution(), test_detector_passes_status_checked_discovery(), test_discovery_exit_status_is_observed()

### Community 163 - "_unsourced_helper_uses"
Cohesion: 0.25
Nodes (4): test_detector_flags_unsourced_helpers(), test_detector_passes_sourced_helpers(), test_helper_uses_are_sourced_in_the_same_block(), _unsourced_helper_uses()

### Community 164 - "_ungated_finalizes"
Cohesion: 0.25
Nodes (4): test_detector_flags_ungated_finalize(), test_detector_passes_gated_finalize(), test_finalize_is_gated_on_the_step_before_it(), _ungated_finalizes()

### Community 165 - "build_preview_sheet.py"
Cohesion: 0.52
Nodes (3): checkerboard(), fit_nearest(), main()

### Community 166 - "noyaux.js"
Cohesion: 0.38
Nodes (5): buildItem(), clear(), open(), update(), warm()

### Community 167 - "Performance Tuning"
Cohesion: 0.33
Nodes (6): Caching Behavior, Disk Space, Evaluator Diagnostics, Memory, Threads, and Timeouts, Performance Tuning, Troubleshooting Performance

### Community 168 - "Run-All Query Suite"
Cohesion: 0.33
Nodes (6): Generation Script, How This Differs From Important-Only, Run-All Query Suite, Suite Template, What "run all" does and does not cover, Why a Custom Suite

### Community 169 - "SARIF Processing"
Cohesion: 0.33
Nodes (6): Count Findings, Important-Only Post-Filter, SARIF Processing, Summary by Rule, Summary by SARIF Level, Summary by Security Severity (most useful for triage)

### Community 170 - "build_log.sh"
Cohesion: 0.40
Nodes (3): log_cmd(), run_logged(), build_log.sh script

### Community 171 - "test_arrays_are_consumed_in_the_block_that_builds_them"
Cohesion: 0.40
Nodes (4): _assigns(), _subscripted_reads(), test_arrays_are_consumed_in_the_block_that_builds_them(), test_the_same_block_rule_has_something_to_check()

### Community 172 - "État du projet — passation"
Cohesion: 0.33
Nodes (5): Décisions et raisons, Fichiers clés, Pièges, Reste à faire, dans l'ordre, État du projet — passation

### Community 173 - "Ruleset Catalog"
Cohesion: 0.40
Nodes (5): CodeQL Community Packs, Official CodeQL Suites, Ruleset Catalog, Trail of Bits Packs, Verify Installation

### Community 175 - "Threat Models Reference"
Cohesion: 0.50
Nodes (4): Available Models, Default Behavior, Threat Models Reference, Usage

## Knowledge Gaps
- **10 isolated node(s):** `codeql-skill-scripts`, `@prisma/client`, `react-dom`, `@tailwindcss/turbopack`, `@types/node` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1556 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Fait et committé` connect `auctions.ts` to `album.ts`, `actions.ts`, `Money`, `trades.ts`, `État du projet — passation`, `start`, `duels.ts`, `achievements.ts`, `trade-actions.ts`, `react`, `wallet.ts`, `next`, `duels/[id]/page.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `codeql-skill-scripts`, `@prisma/client`, `react-dom` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `album.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07239819004524888 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `album.ts`, `duel-actions.ts`, `session.ts`, `package.json`, `actions.ts`, `Money`, `SceneBody`, `auth-actions.ts`, `character/[id]/page.tsx`, `wishlist.ts`, `market/page.tsx`, `trade-actions.ts`, `duels/page.tsx`, `DuplicateSale.tsx`, `next`, `duels/[id]/page.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `start()` connect `start` to `lab.js`, `buildCapsule`, `engine.js`, `audio.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `import.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07777777777777778 - nodes in this community are weakly interconnected._