# Webnity Global Simple CRM
Run: `npm install` then `npm start`, open `http://localhost:3000`.
Default admin key: `webnity-admin-change-me` (change it in production with `ADMIN_KEY`).
Lead API: POST `/api/leads` with header `x-admin-key` and JSON fields: `full_name`, `mobile_number`, `business_name`, `service`, `platform`, `requirement`.
Note: Meta WhatsApp Flow endpoints have their own verification/encryption requirements; this CRM provides the storage API. A Meta adapter can be connected after deployment.