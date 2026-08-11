# Local authentication and login-language implementation plan

1. Specify browser-language ordering, translation boundaries, and local credential behavior with tests.
2. Add English-first login copy with Italian and Japanese support lines ordered from `navigator.languages`.
3. Mark the application as non-translatable while retaining explicit `lang` attributes for each language.
4. Add a Vite-only local API with hashed credentials, standard profiles, sessions, progress, and teacher views.
5. Document the local setup and verify unit tests, type checks, build output, API login, and browser behavior.
