#!/usr/bin/env sh
set -eu
if [ ! -d node_modules ]; then npm install; fi
if [ ! -f .env ]; then cp .env.example .env; fi
npm run dev
