# Payzen API - README

**Base URL:** `http://localhost:8080`

Payzen is a simple invoicing API with user authentication, invoice creation, PDF generation, and dashboard summaries.
It is deliberately lightweight, secure by default, and built on the some of the most proven Node.js stack — Express + Prisma + PostgreSQL + Redis.



All protected endpoints require the header:  
`Authorization: Bearer <your-access-token>`

---

## Authentication

### 1. Register
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "password": "secret123",
    "company_name": "Acme Corp"
  }'
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully. Verification email sent.",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "company_name": "Acme Corp",
    "created_at": "2025-11-23T10:00:00Z",
    "is_email_verified": false
  }
}
```

### 2. Login *(email must be verified)*
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '"email": "john@example.com", "password": "secret123"'
```

### 3. Logout
```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer <token>"
```

### 4. Refresh Token
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"token": "your_refresh_token_here"}'
```

### 5. Verify Email
```bash
curl -X POST http://localhost:8080/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '"code": "ABCD1234"'
```

### 6. Resend Verification Email
```bash
curl -X POST http://localhost:8080/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '"email": "john@example.com"'
```

---

## Invoices (Protected Routes)

### 7. Create Invoice
```bash
curl -X POST http://localhost:8080/invoices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "client": {
      "name": "Jane Smith",
      "email": "jane@client.com",
      "phone": "+1234567890",
      "address": "123 Main St, NY"
    },
    "issueDate": "2025-11-23",
    "dueDate": "2025-12-23",
    "purchaseOrder": "PO-2025-001",
    "status": "PAID",
    "logoUrl": "https://example.com/logo.png",
    "items": [
      { "description": "Web Design", "quantity": 10, "rate": 150.00, "discount": 0 },
      { "description": "Hosting", "quantity": 1, "rate": 300.00, "discount": 10 }
    ]
  }'
```

### 8. List Invoices (paginated)
```bash
curl -X GET "http://localhost:8080/invoices?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### 9. Invoice Summary Dashboard
```bash
curl -X GET http://localhost:8080/invoices/summary \
  -H "Authorization: Bearer <token>"
```

### 10. Upload Logo
```bash
curl -X POST http://localhost:8080/invoices/upload-logo \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/logo.png" \
  -F "invoiceId=15"   # optional
```

### 11. Download Invoice PDF
```bash
curl -X GET http://localhost:8080/invoices/23/download \
  -H "Authorization: Bearer <token>" \
  --output invoice_23.pdf
```

---

## Error Response Format
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```
