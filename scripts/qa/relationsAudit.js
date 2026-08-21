const fs = require("fs");
const path = require("path");

function runRelationsAudit(root, read, seed, main) {
  const procurementScope = {};
  new Function(
    "window",
    fs.readFileSync(path.resolve(root, "../lib/procurement-common/browser.js"), "utf8"),
  )(procurementScope);

  for (const token of [
    'modes: ["buyer", "admin"]',
    'modes: ["supplier", "admin"]',
    "jobAccess: true",
    "projectAccess: true",
    "invoiceAccess: true",
    "contractAccess: true",
    "paymentAccess: true",
    "to.meta.roles",
    "to.meta.modes",
    "to.meta.jobAccess",
    "to.meta.projectAccess",
    "to.meta.invoiceAccess",
    "to.meta.contractAccess",
    "to.meta.paymentAccess",
  ]) {
    if (!main.includes(token))
      throw new Error(`Route/object access guard is missing: ${token}`);
  }

  const byId = (collection) => new Set(collection.map((item) => item.id));
  const users = byId(seed.users),
    jobs = byId(seed.jobs),
    contracts = byId(seed.contracts);
  const agencies = byId(seed.agencies),
    invoices = byId(seed.invoices);

  for (const [name, collection] of Object.entries(seed).filter(([, value]) =>
    Array.isArray(value),
  )) {
    if (byId(collection).size !== collection.length)
      throw new Error(`Duplicate IDs in ${name}`);
  }

  for (const job of seed.jobs) {
    if (!users.has(job.clientId))
      throw new Error(`Job ${job.id} has missing client ${job.clientId}`);
    for (const proposal of job.proposals || [])
      if (!users.has(proposal.freelancerId))
        throw new Error(`Proposal ${proposal.id} has missing freelancer`);
    if (job.contractId && !contracts.has(job.contractId))
      throw new Error(`Job ${job.id} has missing contract`);
  }

  for (const contract of seed.contracts) {
    if (
      !jobs.has(contract.sourceId) ||
      !users.has(contract.clientId) ||
      !users.has(contract.providerId)
    )
      throw new Error(`Broken contract relation: ${contract.id}`);
  }

  for (const invoice of seed.invoices) {
    if (!users.has(invoice.clientId) || !users.has(invoice.providerId))
      throw new Error(`Broken invoice relation: ${invoice.id}`);
  }

  for (const conversation of seed.conversations) {
    if (
      !jobs.has(conversation.jobId) ||
      conversation.participants.some((id) => !users.has(id))
    )
      throw new Error(`Broken conversation relation: ${conversation.id}`);
  }

  for (const agency of seed.agencies) {
    if (
      !users.has(agency.ownerId) ||
      agency.members.some((member) => !users.has(member.userId))
    )
      throw new Error(`Broken agency relation: ${agency.id}`);
  }

  for (const gig of seed.gigs) {
    const creators = gig.creatorType === "agency" ? agencies : users;
    if (!creators.has(gig.creatorId))
      throw new Error(`Broken gig creator: ${gig.id}`);
  }

  const suppliers = byId(seed.suppliers),
    products = byId(seed.products);
  const requests = byId(seed.purchaseRequests),
    events = byId(seed.sourcingEvents);
  const auctions = byId(seed.auctions),
    orders = byId(seed.purchaseOrders);

  for (const request of seed.purchaseRequests) {
    if (
      !users.has(request.requesterId) ||
      !users.has(request.approverId) ||
      !users.has(request.ownerId)
    )
      throw new Error(`Broken request people: ${request.id}`);
    if (request.projectId && !jobs.has(request.projectId))
      throw new Error(`Broken request project: ${request.id}`);
    if (request.sourcingEventId && !events.has(request.sourcingEventId))
      throw new Error(`Broken request sourcing event: ${request.id}`);
    for (const line of request.items || [])
      if (line.productId && !products.has(line.productId))
        throw new Error(`Broken request product: ${request.id}`);
  }

  for (const event of seed.sourcingEvents) {
    if (event.requestId && !requests.has(event.requestId))
      throw new Error(`Broken event request: ${event.id}`);
    if (event.projectId && !jobs.has(event.projectId))
      throw new Error(`Broken event project: ${event.id}`);
    if (!users.has(event.ownerId))
      throw new Error(`Broken event owner: ${event.id}`);
    if ((event.invitedSupplierIds || []).some((id) => !suppliers.has(id)))
      throw new Error(`Broken event invitation: ${event.id}`);
    if ((event.quotes || []).some((quote) => !suppliers.has(quote.supplierId)))
      throw new Error(`Broken event quote: ${event.id}`);
    if (event.awardedSupplierId && !suppliers.has(event.awardedSupplierId))
      throw new Error(`Broken event award: ${event.id}`);
  }

  for (const auction of seed.auctions) {
    if (!events.has(auction.eventId) || !suppliers.has(auction.leadingSupplierId))
      throw new Error(`Broken auction relation: ${auction.id}`);
    if (
      auction.participants.some((item) => !suppliers.has(item.supplierId)) ||
      auction.bids.some((item) => !suppliers.has(item.supplierId))
    )
      throw new Error(`Broken auction supplier: ${auction.id}`);
  }

  const auctionProbe = JSON.parse(
    JSON.stringify(seed.auctions.find((item) => item.status === "Running")),
  );
  const auditCount = auctionProbe.audit.length;
  const bidResult = procurementScope.ProcurementCommon.placeReverseBid(
    auctionProbe,
    auctionProbe.participants[0].supplierId,
    auctionProbe.currentBid - auctionProbe.minStep,
    "QA bidder",
  );
  if (
    !bidResult.ok ||
    auctionProbe.audit.length !== auditCount + 1 ||
    auctionProbe.bids.at(-1).amount !== auctionProbe.currentBid
  )
    throw new Error("Reverse auction bid/audit flow failed");

  for (const order of seed.purchaseOrders) {
    if (order.requestId && !requests.has(order.requestId))
      throw new Error(`Broken order request: ${order.id}`);
    if (order.eventId && !events.has(order.eventId))
      throw new Error(`Broken order event: ${order.id}`);
    if (order.projectId && !jobs.has(order.projectId))
      throw new Error(`Broken order project: ${order.id}`);
    if (!suppliers.has(order.supplierId) || !users.has(order.buyerId))
      throw new Error(`Broken order party: ${order.id}`);
    if (order.invoiceId && !invoices.has(order.invoiceId))
      throw new Error(`Broken order invoice: ${order.id}`);
    if (order.exceptions.some((item) => !users.has(item.ownerId)))
      throw new Error(`Broken order exception owner: ${order.id}`);
    if (
      order.lines.some((line) => line.productId && !products.has(line.productId))
    )
      throw new Error(`Broken order product: ${order.id}`);
  }

  const ranked = procurementScope.ProcurementCommon.rankQuotes(
    seed.sourcingEvents[0].quotes,
    seed.sourcingEvents[0].weights,
  );
  if (
    !ranked.length ||
    ranked.some((row, index) => row.rank !== index + 1) ||
    ranked.some((row) => !Number.isFinite(row.score))
  )
    throw new Error("Procurement quote ranking failed");
}

module.exports = { runRelationsAudit };
