# Nowshera Shopping Mall Inventory System

An AI-powered inventory management system for Nowshera Shopping Mall. The system replaces paper registers and WhatsApp-based stock tracking with a centralized inventory platform and an AI assistant.

## Overview

The system allows mall staff and managers to manage real inventory, track stock movements, and use an AI assistant to ask questions about inventory using natural language.

The AI works with real database information and requires human confirmation before making stock changes.

## Key Features

- Real Supabase authentication
- Manager and Staff roles
- Manager-controlled Staff accounts
- Real-time inventory management
- Stock In and Stock Out
- Stock movement history
- Protection against negative stock
- Role-based access control
- Cost and profit protection for Staff
- AI inventory assistant
- AI answers based on real inventory data
- AI stock-change proposals with Confirm/Cancel
- Normal inventory functions continue working if AI is unavailable
- Responsive mobile interface

## AI Assistant

The AI assistant can:

- Answer inventory questions
- Check current stock
- Analyze stock movements
- Identify sales information
- Prepare stock changes from natural-language requests

Example:

> "Add 40 Type-C cables from Ali Traders."

The AI prepares the proposed change first. The database is only changed after the user confirms it.

## Security

- Authentication is handled by Supabase Auth.
- User roles are stored in the `profiles` table.
- Database permissions are enforced through Supabase security policies.
- Staff cannot access cost price or profit information.
- Stock changes are performed through secure database operations.
- The Supabase service-role key is never used in the frontend.

## Technology Stack

- Frontend: React
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- AI: Gemini
- Deployment: Web/PWA

## Testing

The project is tested against five core requirements:

1. AI answers questions using real inventory data.
2. AI stock changes require user confirmation.
3. Stock cannot go below zero.
4. Staff cannot access restricted financial information or perform unauthorized changes.
5. Normal inventory functionality continues working when the AI is unavailable.

## Project Goal

The goal is to provide Nowshera Shopping Mall with a reliable inventory system where:

**Real data → Secure database → AI assistance → Human confirmation → Recorded stock change**

No stock change should happen without proper authorization and confirmation.
