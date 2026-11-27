# Project Rules: Idle Knight RPG

- **Active Project Directory**: `C:\Users\choijinhyeok\Desktop\game`
- **GitHub Remote (`origin`)**: `https://github.com/dnftest/autogame.git` (`main` branch)

## Automatic Test, Build, Commit & Push Workflow

Whenever you modify code or configuration files in this project:

1. **Verify First**: Run `npx vitest run` and `npm run build` (`tsc --noEmit && vite build`) in `C:\Users\choijinhyeok\Desktop\game`.
2. **Auto-Commit & Push**: Once all tests and the production build pass with exit code 0, automatically run:
   - `git add -A`
   - `git commit -m "<concise summary of changes>"`
   - `git push origin main`
3. **Exclusions**: Never commit `node_modules/`, `dist/`, or `.env` files.
4. **Report**: Include the commit hash / push status in the final reply.
