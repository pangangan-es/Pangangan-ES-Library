# Legacy prototype (reference only)

The original static HTML/JavaScript tracker, kept so its workflows can be compared with the React application. **Do not deploy or reuse it.** It carries the former reference school's name, stores data only in browser `localStorage`, uses a hardcoded password, and renders unescaped HTML. The former school's logo file is renamed with a `.REFERENCE_ONLY` suffix and is excluded from Git by `.gitignore`.

The deployed site is built only from `src/` by `npm run build`; this folder is never published.
