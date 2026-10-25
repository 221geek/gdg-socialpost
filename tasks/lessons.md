# Leçons

Format : [date] | ce qui a mal tourné | règle pour l'éviter

[2026-10-25] | `@fastify/cors` v11 n'autorise par défaut que GET,HEAD,POST : PATCH/DELETE du back-office échouaient en silence (« Failed to fetch ») | lister explicitement `methods` dans la config CORS et tester chaque verbe HTTP depuis le navigateur, pas seulement avec curl
[2026-10-25] | Un statut intermédiaire (`dispatching`) posé avant un appel externe sans timeout ni journal a bloqué une publication « En cours » pour toujours | toute transition d'état asynchrone doit avoir une issue garantie (succès, échec, ou relance après délai) et un journal par étape
[2026-10-25] | Sans gestionnaire d'erreurs Fastify, chaque erreur zod renvoyait un 500 avec le JSON brut des issues, affiché tel quel dans l'UI | garder un `setErrorHandler` global qui convertit `ZodError` en 422 avec le premier message
