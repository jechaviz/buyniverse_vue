/**
 * The demo's virtual people at work. In the demo only, suppliers' teams and the buyer's own team play out a live
 * round (bids, chat, clarifying questions, emails) and then the order that follows (the two companies' teams
 * talk to each other and hand each other tasks). Nothing leaves the browser: emails are rows in `simulatedMail`
 * addressed to yopmail.com mailboxes, shown in the demo's mailbox and never sent.
 *
 * The script is app/lib/demo-cast.js; the people are in app/data/demo.js. castTick() advances everything by the
 * time that passed (scaled by the demo speed) and is safe to call as often as you like.
 */
(function (global) {
  "use strict";

  function createCastActions(state, ui, helpers) {
    var S = function () { return global.BuyniverseCastScript; };
    var uid = function (prefix) { return global.ProcurementCommon && global.ProcurementCommon.uid ? global.ProcurementCommon.uid(prefix) : prefix + "-" + Math.random().toString(36).slice(2, 9); };
    var settings = function () {
      if (!state.demoCast) state.demoCast = { speed: 1, paused: false, orders: [] };
      if (!Array.isArray(state.demoCast.orders)) state.demoCast.orders = [];
      return state.demoCast;
    };
    var mailbox = function () { if (!Array.isArray(state.simulatedMail)) state.simulatedMail = []; return state.simulatedMail; };
    var taskList = function () { if (!Array.isArray(state.orderTasks)) state.orderTasks = []; return state.orderTasks; };
    var user = function (id) { return state.users.filter(function (u) { return u.id === id; })[0] || null; };
    var supplierMember = function (supplierId, role) { return state.users.filter(function (u) { return u.virtual && u.supplierProfileId === supplierId && u.team && u.team.role === role; })[0] || null; };
    var buyerMember = function (role) { return state.users.filter(function (u) { return u.virtual && u.team && u.team.side === "buyer" && u.team.role === role; })[0] || null; };
    var first = function (u) { return u ? String(u.name).split(" ")[0] : ""; };
    var localeOf = function (store) { return store && store.locale && store.locale.value === "en" ? "en" : "es"; };
    var money = function (store, amount, currency) { return store && store.money ? store.money(amount, currency) : String(Math.round(amount)) + " " + (currency || ""); };
    var rand = function (seed) { return S().hash(String(seed)); };

    /** Posts a message in a conversation as a virtual person (the thread is the real one the page shows). */
    function say(store, contextType, contextId, userId, body, opts) {
      opts = opts || {};
      var context = store.communicationContext && store.communicationContext(contextType, contextId);
      if (!context || !body) return null;
      var conversation = state.conversations.filter(function (c) { return c.contextType === context.type && c.contextId === context.id; })[0];
      if (!conversation) {
        conversation = { id: uid("convo"), contextType: context.type, contextId: context.id, jobId: null, subject: context.title, participants: context.participants, messages: [] };
        state.conversations.push(conversation);
        conversation = state.conversations[state.conversations.length - 1];
      } else conversation.participants = context.participants;
      var message = { id: uid("msg"), senderId: userId, text: body, subject: "", kind: "message", channel: "internal", at: new Date().toISOString(), simulated: true };
      conversation.messages.push(message);
      conversation.messages = conversation.messages.slice(-500);
      var viewer = store.currentUser && store.currentUser.value;
      if (opts.notify && viewer && viewer.id !== userId && context.participants.indexOf(viewer.id) >= 0 && store.addNotification) {
        var author = user(userId);
        store.addNotification({ userId: viewer.id, title: opts.title || "New message", text: (author ? author.name + ": " : "") + body.slice(0, 76), link: context.link, icon: opts.icon || "fa-comments" });
      }
      return message;
    }

    /** A simulated email: kept in the demo's mailbox, never sent. `to` is a list of users. */
    function mail(store, contextType, contextId, from, to, subject, body, kind) {
      var fromUser = typeof from === "string" ? null : from;
      var row = {
        id: uid("mail"), at: new Date().toISOString(), contextType: contextType, contextId: contextId, kind: kind || "message",
        from: { name: fromUser ? fromUser.name : String(from), email: fromUser ? fromUser.email : "no-reply@buyniverse.demo", company: fromUser ? fromUser.companyName : "Buyniverse" },
        to: to.filter(Boolean).map(function (u) { return { name: u.name, email: u.email, company: u.companyName }; }), subject: subject, body: body, read: false,
      };
      var list = mailbox();
      list.unshift(row);
      if (list.length > 400) list.length = 400;
      return row;
    }

    // ---- Live round -----------------------------------------------------------------------------------
    // Seconds between a supplier's bids, and how many steps (the auction's minimum bid decrement) each bid drops. A six-minute
    // round settles around 10-15% under the opening price, with the stubborn ones still bidding at the end.
    var PACE = { steady: [22, 40], aggressive: [12, 26], cautious: [32, 55], bluffer: [45, 80], sniper: [4, 8] };
    var STEPS = { steady: [1, 2], aggressive: [1, 3], cautious: [1, 1], bluffer: [1, 1], sniper: [2, 3] };

    function castAuction(store, auction, now) {
      var cfg = settings();
      var cast = auction.cast;
      if (!cast) cast = auction.cast = { clock: 0, last: now, next: {}, retired: {}, greeted: {}, asked: {}, answered: {}, reacted: {}, seen: {}, mailed: {}, counter: 0, leader: auction.leadingSupplierId || null, timeUp: false, begun: false };
      var dt = Math.max(0, Math.min(5, (now - cast.last) / 1000));
      cast.last = now;
      if (cfg.paused) return;
      cast.clock += dt * Math.max(0.25, Number(cfg.speed) || 1);
      var loc = localeOf(store), script = S();
      var event = store.sourcingEvent ? store.sourcingEvent(auction.eventId) : null;
      var owner = user(auction.hostId || (event && event.ownerId));
      var people = (auction.participants || []).map(function (p) { return { p: p, lead: supplierMember(p.supplierId, "sales"), tech: supplierMember(p.supplierId, "technical") }; }).filter(function (x) { return x.lead; });
      if (!people.length) return;
      var closeAt = Date.parse(auction.closingAt || auction.endAt);
      var remaining = (closeAt - now) / 1000;
      var running = String(auction.status).toLowerCase() === "running";

      // Opening: every supplier receives its invitation; caps are set once.
      if (!cast.begun) {
        cast.begun = true;
        people.forEach(function (x, i) {
          if (!Number.isFinite(Number(x.p.cap)) || Number(x.p.cap) <= Number(auction.floor)) x.p.cap = Math.round(Number(auction.startingPrice) * (0.8 + rand(auction.id + x.p.supplierId + "cap") * 0.12));
          x.p.cap = Math.max(Number(auction.floor), x.p.cap);
          var v = { title: auction.title, first: first(x.lead), buyer: owner ? owner.companyName || owner.name : "Innovate Inc.", minutes: Math.max(1, Math.round((closeAt - Date.parse(auction.startedAt || new Date(now).toISOString())) / 60000)) };
          var m = script.MAIL.invitation(v);
          mail(store, "auction", auction.id, m.from, [x.lead], script.say(m.subject, loc), script.say(m.body, loc), "invitation");
          cast.greeted[x.p.supplierId] = 3 + rand(auction.id + x.p.supplierId + "g") * 34 + i;
        });
        // Three of them will have questions for the buyer.
        people.slice().sort(function (a, b) { return rand(auction.id + a.p.supplierId + "q") - rand(auction.id + b.p.supplierId + "q"); }).slice(0, 3).forEach(function (x, i) {
          cast.asked[x.p.supplierId] = { at: 14 + i * 34 + rand(auction.id + x.p.supplierId + "qa") * 18, q: (Math.floor(rand(auction.id + "topic") * 7) + i * 2) % script.QUESTIONS.length, done: false };
        });
      }

      if (!running) { finishAuction(store, auction, cast, people, owner, loc, now); return; }
      if (remaining <= 0) { finishAuction(store, auction, cast, people, owner, loc, now); return; }

      // Greetings.
      people.forEach(function (x) {
        var at = cast.greeted[x.p.supplierId];
        if (typeof at === "number" && cast.clock >= at) { cast.greeted[x.p.supplierId] = true; say(store, "auction", auction.id, x.lead.id, script.say(script.pickFrom(script.GREETINGS, auction.id + x.p.supplierId), loc)); }
      });

      // Clarifying questions to the buyer, by chat and by email; the buyer's own team answers if the person watching does not.
      people.forEach(function (x) {
        var ask = cast.asked[x.p.supplierId];
        if (!ask || ask.done || cast.clock < ask.at) return;
        ask.done = true; ask.doneAt = cast.clock; ask.doneAtIso = new Date().toISOString();
        var q = script.QUESTIONS[ask.q], body = script.say(q, loc), who = x.tech || x.lead;
        say(store, "auction", auction.id, who.id, body, { notify: true, title: "A supplier asked a question", icon: "fa-circle-question" });
        var m = script.MAIL.question({ title: auction.title, buyerFirst: first(owner), text: body, fromName: who.name, company: who.companyName });
        mail(store, "auction", auction.id, who, [owner], script.say(m.subject, loc), script.say(m.body, loc), "question");
        ask.topic = q.topic;
      });
      people.forEach(function (x) {
        var ask = cast.asked[x.p.supplierId];
        if (!ask || !ask.done || ask.answeredBy || cast.clock < ask.doneAt + 40) return;
        var requester = buyerMember("requester");
        // If the person watching already wrote something in the channel since the question, they have it covered.
        var conversation = state.conversations.filter(function (c) { return c.contextType === "auction" && c.contextId === auction.id; })[0];
        var human = conversation && conversation.messages.some(function (msg) { return !msg.simulated && msg.at > (ask.doneAtIso || "") && msg.senderId === (owner && owner.id); });
        ask.answeredBy = human ? "owner" : "team";
        if (human || !requester) return;
        say(store, "auction", auction.id, requester.id, script.say(script.ANSWERS[ask.topic], loc));
        var m = script.MAIL.answer({ title: auction.title, text: script.say(script.ANSWERS[ask.topic], loc), fromName: requester.name, company: requester.companyName });
        mail(store, "auction", auction.id, requester, [(supplierMember(x.p.supplierId, "technical") || x.lead)], script.say(m.subject, loc), script.say(m.body, loc), "answer");
        x.p.answered = true;
        // The supplier acknowledges a little later.
        cast.answered[x.p.supplierId] = cast.clock + 6;
      });
      people.forEach(function (x) {
        var at = cast.answered[x.p.supplierId];
        if (typeof at === "number" && cast.clock >= at) {
          cast.answered[x.p.supplierId] = true;
          var ask = cast.asked[x.p.supplierId];
          say(store, "auction", auction.id, (x.tech || x.lead).id, script.say(script.SUPPLIER_REPLIES[ask && ask.topic] || script.SUPPLIER_REPLIES.thanks, loc));
        }
      });

      // The person watching writes in the channel: the most relevant suppliers answer, and an announcement reaches everyone by email.
      var conversation2 = state.conversations.filter(function (c) { return c.contextType === "auction" && c.contextId === auction.id; })[0];
      (conversation2 ? conversation2.messages : []).forEach(function (msg) {
        if (msg.simulated || cast.seen[msg.id] || (owner && msg.senderId !== owner.id && user(msg.senderId) && user(msg.senderId).virtual)) return;
        cast.seen[msg.id] = true;
        var topic = script.topicOf(msg.text);
        var order = people.slice().sort(function (a, b) { return rand(msg.id + a.p.supplierId) - rand(msg.id + b.p.supplierId); });
        var responders = msg.kind === "announcement" ? order : order.slice(0, topic === "fallback" ? 1 : 2);
        responders.forEach(function (x, i) {
          cast.reacted[msg.id + x.p.supplierId] = { at: cast.clock + 4 + i * 5 + rand(msg.id + x.p.supplierId + "d") * 5, topic: msg.kind === "announcement" ? "announce" : topic, who: x };
        });
        if (msg.kind === "announcement") people.forEach(function (x) {
          var m = script.MAIL.question({ title: auction.title, buyerFirst: first(x.lead), text: msg.text, fromName: owner ? owner.name : "Buyer", company: owner ? owner.companyName : "" });
          mail(store, "auction", auction.id, owner || "Buyer", [x.lead], loc === "en" ? "New clarification: " + auction.title : "Nueva aclaración: " + auction.title, msg.text, "clarification");
        });
      });
      Object.keys(cast.reacted).forEach(function (key) {
        var r = cast.reacted[key];
        if (!r || r === true || cast.clock < r.at) return;
        cast.reacted[key] = true;
        var line = r.topic === "announce" ? { es: "Anotado, gracias por el aviso.", en: "Noted, thanks for the notice." } : script.SUPPLIER_REPLIES[r.topic] || script.SUPPLIER_REPLIES.fallback;
        say(store, "auction", auction.id, (r.who.tech && (r.topic === "warranty" || r.topic === "install") ? r.who.tech : r.who.lead).id, script.say(line, loc));
      });

      // Bids.
      var step = Math.max(1, Number(auction.minStep) || 1);
      var leaderNow = auction.leadingSupplierId || null;
      if (leaderNow !== cast.leader) {
        var previous = people.filter(function (x) { return x.p.supplierId === cast.leader; })[0];
        cast.leader = leaderNow;
        if (previous && !cast.retired[previous.p.supplierId] && rand(auction.id + previous.p.supplierId + cast.counter) < 0.4) {
          cast.counter++;
          say(store, "auction", auction.id, previous.lead.id, script.say(script.pickFrom(script.OUTBID, auction.id + cast.counter), loc));
          if (!cast.mailed[previous.p.supplierId] || cast.clock - cast.mailed[previous.p.supplierId] > 60) {
            cast.mailed[previous.p.supplierId] = cast.clock;
            var out = script.MAIL.outbid({ title: auction.title, first: first(previous.lead), last: money(store, previous.p.lastBid || auction.startingPrice, auction.currency) });
            mail(store, "auction", auction.id, out.from, [previous.lead], script.say(out.subject, loc), script.say(out.body, loc), "outbid");
          }
        }
      }
      people.forEach(function (x) {
        var id = x.p.supplierId, style = (x.lead.team && x.lead.team.style) || "steady";
        if (x.p.disqualified || cast.retired[id]) return;
        if (typeof cast.next[id] !== "number") cast.next[id] = 6 + rand(auction.id + id + "first") * 20;
        if (cast.clock < cast.next[id]) return;
        if (auction.leadingSupplierId === id) { cast.next[id] = cast.clock + 4; return; }
        if (style === "sniper" && remaining > 50) { cast.next[id] = cast.clock + 3; return; }
        var range = STEPS[style] || STEPS.steady, pace = PACE[style] || PACE.steady;
        var k = range[0] + Math.floor(rand(auction.id + id + "k" + cast.counter++) * (range[1] - range[0] + 1));
        if (style === "bluffer" && !x.p.bidCount) k = 8;
        var current = Number(auction.currentBid), cap = Number(x.p.cap), target = Math.max(cap, current - k * step);
        var buffer = style === "cautious" ? 2 * step : 0;
        if (target > current - step || target < cap || current - step < cap + buffer) {
          // Nothing left to give: the supplier steps out and says so once.
          if (current - step < cap) { cast.retired[id] = true; say(store, "auction", auction.id, x.lead.id, script.say(script.RETIRE, loc)); }
          else cast.next[id] = cast.clock + 8;
          return;
        }
        var placed = store.simulateLiveAuctionBid ? store.simulateLiveAuctionBid(auction, id, Math.round(target)) : null;
        cast.next[id] = cast.clock + (style === "sniper" ? 3 + rand(auction.id + id + "s" + cast.counter) * 4 : pace[0] + rand(auction.id + id + "n" + cast.counter) * (pace[1] - pace[0]));
        if (!placed) cast.next[id] = cast.clock + 6;
      });
    }

    function finishAuction(store, auction, cast, people, owner, loc, now) {
      if (cast.timeUp) return;
      cast.timeUp = true;
      var script = S();
      people.forEach(function (x, i) {
        var won = auction.leadingSupplierId === x.p.supplierId;
        var m = script.MAIL.closing({ title: auction.title, first: first(x.lead), won: won, last: money(store, x.p.lastBid || auction.currentBid, auction.currency) });
        mail(store, "auction", auction.id, m.from, [x.lead], script.say(m.subject, loc), script.say(m.body, loc), "closing");
        if (i < 2 || won) say(store, "auction", auction.id, x.lead.id, script.say(script.CLOSING, loc));
      });
    }

    // ---- An order ---------------------------------------------------------------------------------------
    function resolveRole(order, by) {
      var parts = String(by).split("."), side = parts[0], role = parts[1];
      if (side === "supplier") return supplierMember(order.supplierId, role);
      if (role === "owner") return user(order.buyerId) || null;
      return buyerMember(role);
    }
    function orderTask(order, key) { return taskList().filter(function (t) { return t.orderId === order.id && t.key === key; })[0] || null; }
    function openTask(store, order, def, loc, extra) {
      if (orderTask(order, def.key)) return orderTask(order, def.key);
      var owner = resolveRole(order, def.side + "." + def.role);
      var task = {
        id: uid("task"), orderId: order.id, key: def.key, title: S().say(def.title, loc), detail: "", side: def.side, role: def.role, ownerId: owner ? owner.id : null,
        status: def.state === "done" ? "done" : "todo", createdBy: (extra && extra.by) || null, createdAt: new Date().toISOString(),
        due: new Date(Date.now() + (def.dueDays || 2) * 86400000).toISOString(), doneAt: def.state === "done" ? new Date().toISOString() : null, simulated: true,
      };
      taskList().push(task);
      return task;
    }

    function castOrder(store, order, now) {
      var cfg = settings();
      var cast = order.cast;
      if (!cast) cast = order.cast = { clock: 0, last: now, fired: {}, taskDoneAt: {}, begun: false };
      var dt = Math.max(0, Math.min(5, (now - cast.last) / 1000));
      cast.last = now;
      if (cfg.paused) return;
      cast.clock += dt * Math.max(0.25, Number(cfg.speed) || 1);
      var loc = localeOf(store), script = S();
      var supplier = state.suppliers.filter(function (s) { return s.id === order.supplierId; })[0];
      var buyer = user(order.buyerId);
      var vars = { po: order.id, supplier: supplier ? supplier.name : "", buyer: buyer ? buyer.companyName || buyer.name : "", eta: store.date && order.eta ? store.date(order.eta) : String(order.eta || "").slice(0, 10) };
      script.ORDER_STEPS.forEach(function (step) {
        if (cast.fired[step.id]) return;
        var after = step.after || [];
        if (!after.every(function (id) { return cast.fired[id]; })) return;
        var ready = (step.at || 0);
        var stamp = function (t) { return Number(t) || 0; };
        after.forEach(function (id) { ready = Math.max(ready, stamp(cast.fired[id]) + (step.delay || 0)); });
        if (step.whenDone) {
          var allDone = step.whenDone.every(function (key) { var t = orderTask(order, key); return t && t.status === "done"; });
          if (!allDone) return;
          step.whenDone.forEach(function (key) { ready = Math.max(ready, stamp(cast.taskDoneAt[key]) + (step.delay || 0)); });
        }
        if (cast.clock < ready) return;
        if (step.unlessDone && step.unlessDone.every(function (key) { var t = orderTask(order, key); return t && t.status === "done"; })) { cast.fired[step.id] = cast.clock; return; }
        cast.fired[step.id] = cast.clock || 0.001;
        var who = resolveRole(order, step.by);
        if (!who) return;
        var v = Object.assign({ first: first(who) }, vars);
        if (step.task) openTask(store, order, Object.assign({ dueDays: 1 }, step.task), loc);
        say(store, "order", order.id, who.id, script.say(step.say, loc, v), { notify: step.by.indexOf("buyer.owner") < 0 });
        (step.finish || []).forEach(function (key) { var t = orderTask(order, key); if (t && t.status !== "done") { t.status = "done"; t.doneAt = new Date().toISOString(); cast.taskDoneAt[key] = cast.clock; } });
        if (step.open) openTask(store, order, step.open, loc);
        if (step.user) { var viewer = buyer || (store.currentUser && store.currentUser.value); var ut = openTask(store, order, Object.assign({}, step.user, { dueDays: 1 }), loc); if (ut && viewer) ut.ownerId = viewer.id; if (store.addNotification && viewer) store.addNotification({ userId: viewer.id, title: "A task is waiting for you", text: ut.title, link: "/procurement/execution?order=" + order.id + "&tab=team", icon: "fa-list-check" }); }
        if (step.mail) {
          var to = resolveRole(order, step.mail.to);
          var m = script.MAIL.order({ fromName: who.name, company: who.companyName, subject: script.say(step.mail.subject, "es", v), subjectEn: script.say(step.mail.subject, "en", v), text: script.say(step.mail.text, "es", v), textEn: script.say(step.mail.text, "en", v) });
          mail(store, "order", order.id, who, [to], script.say(m.subject, loc), script.say(m.body, loc), "order");
        }
      });
      // Tasks the person watching hands to a supplier's team: acknowledged, started, then done.
      taskList().forEach(function (task) {
        if (task.orderId !== order.id || task.simulated || task.status === "done") return;
        var owner = user(task.ownerId);
        if (!owner || !owner.virtual) return;
        var cue = task.cue || (task.cue = { at: cast.clock + 12 + rand(task.id) * 14, stage: 0 });
        if (cast.clock < cue.at) return;
        if (cue.stage === 0) { cue.stage = 1; cue.at = cast.clock + 30 + rand(task.id + "s") * 40; task.status = "doing"; say(store, "order", order.id, owner.id, script.say({ es: "Recibido, " + first(buyer) + ". Tomamos la tarea \"" + task.title + "\" y la tenemos lista pronto.", en: "Received, " + first(buyer) + ". We take the task \"" + task.title + "\" and will have it ready soon." }, loc), { notify: true, icon: "fa-list-check" }); }
        else if (cue.stage === 1) { cue.stage = 2; task.status = "done"; task.doneAt = new Date().toISOString(); say(store, "order", order.id, owner.id, script.say({ es: "Listo: \"" + task.title + "\" quedó resuelta. Les compartimos el comprobante por correo.", en: "Done: \"" + task.title + "\" is resolved. We are sharing the proof by email." }, loc), { notify: true, icon: "fa-circle-check" });
          mail(store, "order", order.id, owner, [buyer], (loc === "en" ? "Done: " : "Listo: ") + task.title, (loc === "en" ? "Task completed: " : "Tarea completada: ") + task.title + "\n\n" + owner.name + "\n" + owner.companyName, "order"); }
      });
      // A task the person finishes: the other side notices.
      taskList().forEach(function (task) {
        if (task.orderId !== order.id || task.status !== "done" || !task.key || cast.taskDoneAt[task.key] != null) return;
        cast.taskDoneAt[task.key] = cast.clock;
      });
    }

    return {
      castSettings() { return settings(); },
      castSetSpeed(value) { var n = Number(value); settings().speed = [0.5, 1, 2, 4].indexOf(n) >= 0 ? n : 1; },
      castTogglePause() { var c = settings(); c.paused = !c.paused; return c.paused; },
      castMail(contextType, contextId) { return mailbox().filter(function (m) { return (!contextType || m.contextType === contextType) && (!contextId || m.contextId === contextId); }); },
      castMarkMailRead(id) { var m = mailbox().filter(function (x) { return x.id === id; })[0]; if (m) m.read = true; },

      /** The virtual people of a live round or an order, for the panel. */
      castPeople(contextType, contextId) {
        if (contextType === "auction") {
          var auction = this.auction(contextId);
          return (auction ? auction.participants : []).map(function (p) {
            var members = state.users.filter(function (u) { return u.virtual && u.supplierProfileId === p.supplierId; });
            var cast = auction.cast || {};
            return { supplierId: p.supplierId, name: p.name, members: members, style: (members.filter(function (m) { return m.team.role === "sales"; })[0] || { team: {} }).team.style || "steady", retired: Boolean(cast.retired && cast.retired[p.supplierId]), leading: auction.leadingSupplierId === p.supplierId, bids: p.bidCount || 0, lastBid: p.lastBid };
          }).filter(function (row) { return row.members.length; });
        }
        var order = this.purchaseOrder(contextId);
        if (!order) return [];
        return [
          { side: "buyer", name: (user(order.buyerId) && user(order.buyerId).companyName) || "Buyer", members: [user(order.buyerId)].filter(Boolean).concat(state.users.filter(function (u) { return u.virtual && u.team && u.team.side === "buyer"; })) },
          { side: "supplier", name: (state.suppliers.filter(function (s) { return s.id === order.supplierId; })[0] || {}).name || order.supplierId, members: state.users.filter(function (u) { return u.virtual && u.supplierProfileId === order.supplierId; }) },
        ];
      },

      orderTasks(orderId) { return taskList().filter(function (t) { return t.orderId === orderId; }); },
      /** The person adds a task for anyone on either team; a supplier's person acknowledges it and does it. */
      addOrderTask(orderId, input) {
        var order = this.purchaseOrder(orderId), viewer = this.currentUser && this.currentUser.value;
        var title = global.WebCommon && global.WebCommon.sanitizeText ? global.WebCommon.sanitizeText(input && input.title, 160).trim() : String((input && input.title) || "").slice(0, 160).trim();
        var owner = input && user(input.ownerId);
        if (!order || !viewer || title.length < 3 || !owner) { this.notice("Complete the task and who it is for", "fa-triangle-exclamation"); return null; }
        var days = Math.max(1, Math.min(60, Math.round(Number(input.days) || 3)));
        var task = { id: uid("task"), orderId: order.id, key: "", title: title, detail: "", side: owner.team && owner.team.side === "supplier" ? "supplier" : "buyer", role: owner.team ? owner.team.role : "owner", ownerId: owner.id, status: "todo", createdBy: viewer.id, createdAt: new Date().toISOString(), due: new Date(Date.now() + days * 86400000).toISOString(), doneAt: null, simulated: false };
        taskList().push(task);
        settings();
        if (settings().orders.indexOf(order.id) < 0) settings().orders.push(order.id);
        this.notice("Task added", "fa-list-check");
        return task;
      },
      setOrderTaskStatus(taskId, status) {
        var task = taskList().filter(function (t) { return t.id === taskId; })[0], viewer = this.currentUser && this.currentUser.value;
        if (!task || !viewer || ["todo", "doing", "done"].indexOf(status) < 0) return null;
        var mine = task.ownerId === viewer.id || (this.isAdmin && this.isAdmin.value) || (task.side === "buyer" && this.isDemo && this.isDemo.value);
        if (!mine) { this.notice("This task belongs to someone else", "fa-shield-halved"); return null; }
        task.status = status; task.doneAt = status === "done" ? new Date().toISOString() : null;
        return task;
      },

      /** Starts the order's teams (idempotent). The demo does it when an order is opened or won. */
      castOpenOrder(orderId) {
        var c = settings();
        if (this.isDemo && !this.isDemo.value) return false;
        if (c.orders.indexOf(orderId) < 0) c.orders.push(orderId);
        return true;
      },

      /** Advances everything by the time that has passed. Demo only. */
      castTick(now) {
        if (!this.isDemo || !this.isDemo.value) return 0;
        now = Number(now) || Date.now();
        var store = this, count = 0;
        (state.auctions || []).forEach(function (auction) {
          if (!auction.cast && !auction.demoCast) return;
          castAuction(store, auction, now); count++;
        });
        settings().orders.forEach(function (id) { var order = store.purchaseOrder(id); if (order) { castOrder(store, order, now); count++; } });
        return count;
      },

      /** Opens a live round that plays itself: a real purchase request and quote round, six virtual suppliers, a few minutes. */
      startDemoAuction(input) {
        if (!this.isDemo || !this.isDemo.value) return null;
        input = input || {};
        var Need = global.BuyniverseNeed, minutes = Math.max(2, Math.min(30, Math.round(Number(input.minutes) || 6)));
        var invited = state.suppliers.filter(function (s) { return s.marketplace && s.marketplace.category === "hardware" && supplierMember(s.id, "sales") && s.id !== "sup-1"; })
          .sort(function (a, b) { return Number(b.score) - Number(a.score); }).slice(0, 6);
        if (invited.length < 2) { this.notice("Fewer than two suppliers fit this need yet", "fa-triangle-exclamation"); return null; }
        var es = localeOf(this) === "es";
        var made = this.publishNeed({ text: input.text || (es ? "40 laptops y 40 monitores para oficinas" : "40 laptops and 40 monitors for offices"), category: "products", quantity: 80, budget: Number(input.budget) || 1850000, currency: "MXN", days: 1, mode: "auction", minutes: minutes, supplierIds: invited.map(function (s) { return s.id; }) });
        if (!made) return null;
        var request = made.request, event = made.event, auction = made.auction;
        if (made.pending) {
          // The demo approves for you so the round can start.
          this.procurementTransition(request, "Approved", "Approved by the demo");
          var launched = this.launchNeed(request);
          event = launched && launched.event; auction = launched && launched.auction;
        }
        if (!auction) return null;
        auction.demoCast = true;
        auction.autoExtend = true;
        settings();
        this.castTick(Date.now());
        this.notice(es ? "Round open: virtual suppliers are bidding" : "Round open: virtual suppliers are bidding", "fa-gavel");
        return auction;
      },
    };
  }

  var api = { createCastActions: createCastActions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BuyniverseCastActions = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
