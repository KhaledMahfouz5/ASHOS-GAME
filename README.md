# ASHOS GAME

ASHOS GAME is an original 2D mobile platformer prototype built with Expo and React Native. It features deceptive platforms, teeth traps, slime monsters, a moving camera, touch controls, and three increasingly difficult stages.

## Game source

The mobile game lives in [artifacts/crooked-platforms](./artifacts/crooked-platforms).

## Run locally

Requirements: Node.js >= 22.13 (Node 24 LTS recommended) and pnpm.

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs the Expo app from the workspace root. You can also run `pnpm --filter @workspace/crooked-platforms run dev`, or use `pnpm expo <command>` for one-off Expo CLI commands. Do not use `npx expo` from the repository root: it downloads a different Expo SDK (58) that is not installed in this workspace and cannot resolve the project's Expo SDK version.

Metro listens on port 8081 by default; set `PORT` to use a different port. The Replit-specific environment variables are optional when running locally.

Then open the Expo preview with Expo Go on Android or iPhone.

## Controls

- Left and right buttons move the character.
- The jump button makes the character jump.
- Reach the escape door while avoiding collapsing platforms and traps.

The interface and game text are in Syrian Arabic.
