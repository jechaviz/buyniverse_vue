const text = { type: "text" };
const number = { type: "number" };
const tags = { type: "tags" };
const select = (options) => ({ type: "select", options });
export const workspaceConfigs = {
clients: {
title: "Clients",
copy: "Companies and individual buyers registered on the platform.",
groupBy: "location",
columns: [
{ key: "name", label: "Client", edit: text },
{ key: "company", label: "Company", edit: text },
{ key: "location", label: "Location", edit: text },
{ key: "totalSpend", label: "Total spend", edit: number },
],
},
suppliers: {
title: "Suppliers",
copy: "Vetted suppliers and providers across all categories.",
groupBy: "category",
columns: [
{ key: "name", label: "Supplier", edit: text },
{ key: "category", label: "Category", edit: text },
{ key: "score", label: "Score", edit: number },
{ key: "risk", label: "Risk", edit: number },
{ key: "status", label: "Status", edit: select(["Active", "Preferred", "In review"]) },
],
},
leads: {
title: "Commercial leads",
copy: "Track and convert pipeline opportunities.",
groupBy: "status",
columns: [
{ key: "title", label: "Lead", edit: text },
{ key: "clientName", label: "Company", edit: text },
{ key: "status", label: "Status", edit: select(["New", "Contacted", "Proposal Sent", "Negotiation", "Won", "Lost"]) },
{ key: "value", label: "Estimated value", edit: number },
{ key: "assignedTo", label: "Owner", edit: { type: "users" } },
],
},
projects: {
title: "Projects",
copy: "Active project delivery, milestones and contracts.",
action: { to: "/post-job/new", label: "Post project" },
groupBy: "status",
columns: [
{ key: "title", label: "Project", edit: text },
{ key: "category", label: "Category", edit: text },
{ key: "status", label: "Status", edit: select(["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED"]) },
{ key: "budget", label: "Budget", edit: number },
{ key: "progress", label: "Progress", edit: number },
],
},
invoices: {
title: "Invoices",
copy: "Issued and received invoices with fiscal status.",
action: { mode: "invoice", label: "Create invoice" },
groupBy: "status",
columns: [
{ key: "id", label: "Invoice #" },
{ key: "projectTitle", label: "Project", edit: text },
{ key: "status", label: "Status", edit: select(["DRAFT", "ISSUED", "PAID", "CANCELLED"]) },
{ key: "total", label: "Amount", edit: number },
{ key: "dueDate", label: "Due date", edit: { type: "date" } },
],
},
estimates: {
title: "Estimates & proposals",
copy: "Commercial proposals sent to clients.",
groupBy: "status",
columns: [
{ key: "title", label: "Estimate", edit: text },
{ key: "status", label: "Status", edit: select(["Draft", "Sent", "Accepted", "Declined"]) },
{ key: "total", label: "Amount", edit: number },
{ key: "validUntil", label: "Valid until", edit: { type: "date" } },
],
},
payments: {
title: "Payment receipts",
copy: "Confirmed financial transactions and escrow releases.",
groupBy: "status",
columns: [
{ key: "id", label: "Receipt #" },
{ key: "invoiceId", label: "Invoice" },
{ key: "amount", label: "Amount", edit: number },
{ key: "paidAt", label: "Paid date" },
{ key: "method", label: "Method", edit: select(["Escrow Release", "Bank Transfer", "Credit Card", "SPEI"]) },
],
},
products: {
title: "Product catalog",
copy: "Standardized products and goods for procurement.",
groupBy: "category",
columns: [
{ key: "name", label: "Product", edit: text },
{ key: "sku", label: "SKU", edit: text },
{ key: "category", label: "Category", edit: text },
{ key: "price", label: "Unit price", edit: number },
{ key: "stock", label: "Stock", edit: number },
],
},
expenses: {
title: "Project expenses",
copy: "Track billable and operating expenses per project.",
groupBy: "category",
columns: [
{ key: "title", label: "Expense", edit: text },
{ key: "projectId", label: "Project" },
{ key: "category", label: "Category", edit: text },
{ key: "amount", label: "Amount", edit: number },
{ key: "billable", label: "Billable", edit: select(["Yes", "No"]) },
],
},
saved: {
title: "Saved jobs",
copy: "Opportunities bookmarked for later proposal submission.",
groupBy: "category",
columns: [
{ key: "title", label: "Job" },
{ key: "category", label: "Category" },
{ key: "budget", label: "Budget" },
{ key: "dueDate", label: "Due date" },
],
},
issuers: {
title: "Fiscal issuers",
copy: "Administration available to the Admin role.",
groupBy: "regime",
columns: [
{ key: "name", label: "Issuer", edit: text },
{ key: "rfc", label: "RFC", edit: text },
{ key: "regime", label: "Regime", edit: select(["601", "612", "626"]) },
{ key: "branches", label: "Branches", edit: tags },
],
},
};