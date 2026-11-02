@echo off
if not exist node_modules call npm install
if not exist .env copy .env.example .env
call npm run dev
