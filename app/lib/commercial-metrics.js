/*
 * Commercial metrics are intentionally calculated from source records rather
 * than copied into a dashboard counter.  That keeps the savings story
 * auditable: budget -> first qualified market signal -> final awarded bid.
 */
(function (global) {
  const amount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const positiveDelta = (from, to) => {
    if (amount(from) === null || amount(to) === null) return 0;
    return Math.max(0, Number(from) - Number(to));
  };
  const minimum = (values) => {
    const valid = values.map(amount).filter((value) => value !== null);
    return valid.length ? Math.min(...valid) : null;
  };
  const isFinal = (status) => ["Awarded", "Closed", "Completed"].includes(String(status || ""));
  const rounded = (value) => Math.round((Number(value) || 0) * 100) / 100;

  function orderedBids(auction) {
    return (Array.isArray(auction?.bids) ? auction.bids : [])
      .map((bid, index) => ({ ...bid, __index: index, amount: amount(bid.amount) }))
      .filter((bid) => bid.amount !== null && bid.amount >= 0)
      .sort((left, right) => {
        const leftTime = Date.parse(left.at || "") || 0;
        const rightTime = Date.parse(right.at || "") || 0;
        return leftTime - rightTime || left.__index - right.__index;
      });
  }

  function auction(auctionRecord, event, options = {}) {
    const bids = orderedBids(auctionRecord);
    const firstBySupplier = new Map();
    bids.forEach((bid) => {
      if (!bid.supplierId || firstBySupplier.has(bid.supplierId)) return;
      firstBySupplier.set(bid.supplierId, bid);
    });

    const budget = amount(event?.budget) ?? amount(auctionRecord?.startingPrice);
    const bestFirst = minimum(Array.from(firstBySupplier.values()).map((bid) => bid.amount));
    const declaredCurrent = amount(auctionRecord?.currentBid);
    const bestFinal = declaredCurrent ?? minimum(bids.map((bid) => bid.amount));
    const financialSavings = positiveDelta(budget, bestFirst);
    const buyniverseSavings = positiveDelta(bestFirst, bestFinal);
    const totalSavings = positiveDelta(budget, bestFinal);
    const lockedTerms = auctionRecord?.commercialSettlement?.serviceFee;
    const configuredRate = Math.min(100, Math.max(0, Number(options.successFeeRate ?? 40) || 0));
    const configuredBasis = options.successFeeBasis === "buyniverse" ? "buyniverse" : "total";
    const lockedRate = amount(lockedTerms?.rate);
    const successFeeRate = lockedRate === null ? configuredRate : Math.min(100, Math.max(0, lockedRate));
    const successFeeBasis = lockedTerms?.basis === "buyniverse" ? "buyniverse" : configuredBasis;
    const feeBase = successFeeBasis === "buyniverse" ? buyniverseSavings : totalSavings;
    const lockedFee = amount(lockedTerms?.amount);
    const outcomeShare = lockedFee === null ? rounded(feeBase * successFeeRate / 100) : Math.max(0, lockedFee);

    return {
      auctionId: auctionRecord?.id || null,
      currency: auctionRecord?.currency || event?.currency || options.currency || "USD",
      budget,
      bestFirst,
      bestFinal,
      financialSavings,
      buyniverseSavings,
      totalSavings,
      successFeeRate,
      successFeeBasis,
      outcomeShare,
      netSavings: rounded(Math.max(0, totalSavings - outcomeShare)),
      termsLocked: Boolean(lockedTerms && isFinal(auctionRecord?.status || event?.status)),
      status: auctionRecord?.status || event?.status || "",
      state: isFinal(auctionRecord?.status || event?.status) ? "realized" : "live",
      firstOfferCount: firstBySupplier.size,
      bidCount: bids.length,
      hasComparableOffers: budget !== null && bestFirst !== null,
      hasAuctionSavings: bestFirst !== null && bestFinal !== null,
    };
  }

  function job(jobRecord) {
    const budget = amount(jobRecord?.budget);
    const bestProposal = minimum(
      (Array.isArray(jobRecord?.proposals) ? jobRecord.proposals : [])
        .filter((proposal) => proposal.qualification !== "Rejected")
        .map((proposal) => proposal.bid),
    );
    return {
      currency: jobRecord?.currency || "USD",
      budget,
      bestProposal,
      savings: positiveDelta(budget, bestProposal),
      hasComparableOffers: budget !== null && bestProposal !== null,
    };
  }

  function product(productRecord) {
    const referencePrice = amount(productRecord?.referencePrice);
    const bestEligibleOffer = minimum(
      (Array.isArray(productRecord?.offers) ? productRecord.offers : [])
        .filter((offer) => offer.compliant !== false)
        .map((offer) => offer.price),
    );
    return {
      currency: productRecord?.currency || "USD",
      referencePrice,
      bestEligibleOffer,
      savingsPerUnit: positiveDelta(referencePrice, bestEligibleOffer),
      hasComparableOffers: referencePrice !== null && bestEligibleOffer !== null,
    };
  }

  function addCurrency(bucket, currency, values) {
    const key = currency || "USD";
    if (!bucket[key]) bucket[key] = { currency: key, budget: 0, financialSavings: 0, buyniverseSavings: 0, totalSavings: 0, outcomeShare: 0, netSavings: 0, auctions: 0, realizedAuctions: 0, liveAuctions: 0 };
    const target = bucket[key];
    ["budget", "financialSavings", "buyniverseSavings", "totalSavings", "outcomeShare", "netSavings"].forEach((field) => {
      target[field] = rounded(target[field] + (Number(values[field]) || 0));
    });
    target.auctions += 1;
    if (values.state === "realized") target.realizedAuctions += 1;
    else target.liveAuctions += 1;
  }

  function portfolio(state, options = {}) {
    const source = state || {};
    const rate = Number(source.procurementAnalytics?.commercialModel?.gainShareRate ?? options.successFeeRate ?? 40);
    const successFeeBasis = source.procurementAnalytics?.commercialModel?.successFeeBasis === "buyniverse" ? "buyniverse" : "total";
    const events = Array.isArray(source.sourcingEvents) ? source.sourcingEvents : [];
    const models = (Array.isArray(source.auctions) ? source.auctions : []).map((auctionRecord) =>
      auction(auctionRecord, events.find((event) => event.id === auctionRecord.eventId || event.id === auctionRecord.id), { successFeeRate: rate, successFeeBasis }),
    );
    const byCurrency = {};
    models.forEach((model) => addCurrency(byCurrency, model.currency, model));
    const currencies = Object.values(byCurrency);
    const primary = currencies.sort((left, right) => right.totalSavings - left.totalSavings)[0] || {
      currency: options.currency || "USD", budget: 0, financialSavings: 0, buyniverseSavings: 0, totalSavings: 0, outcomeShare: 0, netSavings: 0, auctions: 0, realizedAuctions: 0, liveAuctions: 0,
    };
    primary.successFeeRate = Math.min(100, Math.max(0, rate || 0));
    primary.successFeeBasis = successFeeBasis;
    const jobs = (Array.isArray(source.jobs) ? source.jobs : []).map(job);
    const products = (Array.isArray(source.products) ? source.products : []).map(product);

    return {
      successFeeRate: Math.min(100, Math.max(0, rate || 0)),
      successFeeBasis,
      auctions: models,
      byCurrency,
      primary,
      modules: {
        procurement: { active: models.filter((model) => model.state === "live").length, totalSavings: primary.totalSavings, financialSavings: primary.financialSavings, buyniverseSavings: primary.buyniverseSavings },
        talent: { active: (source.jobs || []).filter((item) => ["OPEN", "IN_PROGRESS"].includes(item.status)).length, financialSavings: rounded(jobs.reduce((sum, model) => sum + model.savings, 0)) },
        projects: { active: (source.contracts || []).filter((item) => !["Closed", "Completed", "Cancelled"].includes(item.status)).length },
        services: { active: (source.gigs || []).length },
        products: { active: products.filter((model) => model.hasComparableOffers).length, savingsPerUnit: rounded(products.reduce((sum, model) => sum + model.savingsPerUnit, 0)) },
      },
    };
  }

  global.BuyniverseCommercialMetrics = { auction, job, product, portfolio };
})(window);
