module main

import os
import net
import time
import hash.fnv1a

// ==============================================================================
// 1. DOMAIN MODELS (Upwork, Fiverr, Freelancer.com, Workana, PeoplePerHour, Contra, Foundit)
// ==============================================================================

pub struct User {
pub mut:
	id                  string
	name                string
	email               string
	user_type           string // 'Client' | 'Freelancer' | 'Admin'
	company_name        string
	headline            string
	skills              []string
	availability        string
	total_earned        f64
	avatar              string
	marketplace_modes   []string
	supplier_profile_id string
	jss                 int
	tier                string
	cert_level          int
	connects            int
}

pub struct Milestone {
pub mut:
	id       string
	title    string
	amount   f64
	status   string // 'Pending' | 'Funded' | 'Released'
	due_date string
}

pub struct ExtraAddon {
pub mut:
	id    string
	name  string
	price f64
}

pub struct Proposal {
pub mut:
	id              string
	freelancer_id   string
	bid             f64
	completion_time string
	cover_letter    string
	boosted         bool
	status          string // 'Pending' | 'Accepted' | 'Rejected'
	milestones      []Milestone
	extras          []ExtraAddon
	stage           string // 'applied' | 'shortlisted' | 'interview' | 'bafo'
	created_at      string
}

pub struct Job {
pub mut:
	id               string
	title            string
	client_id        string
	status           string // 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
	category         string
	budget           f64
	currency         string
	budget_type      string
	experience_level string
	auction_type     string // 'OPEN' | 'SEALED'
	skills           []string
	proposals        []Proposal
	contract_id      string
	due_date         string
	posted_at        string
}

pub struct EscrowContract {
pub mut:
	id          string
	source_id   string
	client_id   string
	provider_id string
	amount      f64
	status      string // 'In progress' | 'Completed' | 'Disputed'
	milestones  []Milestone
	created_at  string
}

pub struct MarketBenchmark {
pub:
	category string
	min_rate f64
	med_rate f64
	max_rate f64
	currency string
}

// ==============================================================================
// 2. INTERNAL-SIDECAR SECURITY HEADERS
// This process is intentionally bound to loopback and exposes health only.
// It has no database credentials, sessions, tenant authority or public routes.
// ==============================================================================

pub const csp_header = "default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'"
pub const hsts_header = 'max-age=63072000; includeSubDomains; preload'
pub const permissions_header = 'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()'

pub fn sanitize_csv_cell(val string) string {
	trimmed := val.trim_space()
	if trimmed.len > 0 && trimmed[0] in [`=`, `+`, `-`, `@`, `\t`, `\r`, `%`] {
		return "'" + trimmed
	}
	return trimmed
}

pub fn mask_sensitive_pii(text string) string {
	if text.len == 16 || text.len == 18 {
		prefix := text[..4]
		suffix := text[text.len - 4..]
		return '${prefix}**********${suffix}'
	}
	return text
}

pub fn generate_tx_hash(payload string) string {
	h := fnv1a.sum64_string(payload)
	return h.hex().to_upper()
}

// ==============================================================================
// 3. LIVE AUCTION, RANKING & ESCROW ENGINE
// ==============================================================================

pub struct ScoredProposal {
pub:
	proposal    Proposal
	score       int
	rank        int
	savings     f64
	match_score int
}

pub fn rank_proposals(job Job, proposals []Proposal) []ScoredProposal {
	mut scored := []ScoredProposal{}
	budget := if job.budget > 0 { job.budget } else { 1000.0 }

	for idx, p in proposals {
		bid := if p.bid > 0 { p.bid } else { budget }
		savings := budget - bid
		price_ratio := 1.0 - (bid / (budget * 1.2))
		price_score := if price_ratio > 0 { int(price_ratio * 100.0) } else { 0 }
		jss_score := 96
		match_score := 90 + ((idx * 3) % 9)
		boost_score := if p.boosted { 10 } else { 0 }

		total_score := int((f64(price_score) * 0.4) + (f64(jss_score) * 0.3) + (f64(match_score) * 0.2) + f64(boost_score))

		scored << ScoredProposal{
			proposal: p
			score: total_score
			rank: 0
			savings: savings
			match_score: match_score
		}
	}

	scored.sort_with_compare(fn (a &ScoredProposal, b &ScoredProposal) int {
		if a.score > b.score {
			return -1
		}
		if a.score < b.score {
			return 1
		}
		return 0
	})

	mut result := []ScoredProposal{}
	for i, item in scored {
		result << ScoredProposal{
			proposal: item.proposal
			score: item.score
			rank: i + 1
			savings: item.savings
			match_score: item.match_score
		}
	}
	return result
}

pub fn create_escrow_contract(job Job, proposal Proposal) EscrowContract {
	mut ms := []Milestone{}
	if proposal.milestones.len > 0 {
		for i, m in proposal.milestones {
			ms << Milestone{
				id: 'm-${i + 1}'
				title: m.title
				amount: m.amount
				status: if i == 0 { 'Funded' } else { 'Pending' }
				due_date: m.due_date
			}
		}
	} else {
		ms << Milestone{
			id: 'm-1'
			title: 'Phase 1 - Initial Delivery'
			amount: proposal.bid
			status: 'Funded'
			due_date: '2026-09-01'
		}
	}

	now := time.now()
	return EscrowContract{
		id: 'contract-${now.unix()}'
		source_id: job.id
		client_id: job.client_id
		provider_id: proposal.freelancer_id
		amount: proposal.bid
		status: 'In progress'
		milestones: ms
		created_at: now.str()
	}
}

// ==============================================================================
// 4. LOCAL-ONLY HEALTH SIDECAR
// ==============================================================================

fn json_response(status int, body string, include_body bool) string {
	status_text := match status {
		200 { 'OK' }
		404 { 'Not Found' }
		405 { 'Method Not Allowed' }
		else { 'Internal Server Error' }
	}
	allow_header := if status == 405 { 'Allow: GET, HEAD\r\n' } else { '' }
	payload := if include_body { body } else { '' }
	return 'HTTP/1.1 ${status} ${status_text}\r\n' +
		'Content-Type: application/json; charset=utf-8\r\n' +
		'Content-Length: ${body.len}\r\n' +
		'Content-Security-Policy: ${csp_header}\r\n' +
		'Strict-Transport-Security: ${hsts_header}\r\n' +
		'X-Content-Type-Options: nosniff\r\n' +
		'X-Frame-Options: DENY\r\n' +
		'Referrer-Policy: no-referrer\r\n' +
		'Permissions-Policy: ${permissions_header}\r\n' +
		'Cross-Origin-Opener-Policy: same-origin\r\n' +
		'Cross-Origin-Resource-Policy: same-origin\r\n' +
		'X-Robots-Tag: noindex, nofollow\r\n' +
		'Cache-Control: no-store, max-age=0\r\n' +
		allow_header + 'Connection: close\r\n\r\n' + payload
}

fn handle_connection(mut conn net.TcpConn) {
	defer {
		conn.close() or {}
	}
	mut buf := []u8{len: 4096}
	n := conn.read(mut buf) or { return }
	if n <= 0 {
		return
	}
	req := buf[..n].bytestr()
	lines := req.split_into_lines()
	if lines.len == 0 {
		return
	}
	first_line := lines[0].split(' ')
	if first_line.len < 2 {
		return
	}
	method := first_line[0]
	path := first_line[1].split('?')[0]
	mut status := 200
	mut body := ''
	if method != 'GET' && method != 'HEAD' {
		status = 405
		body = '{"error":"method_not_allowed"}'
	} else if path == '/healthz' {
		body = '{"status":"healthy","service":"buyniverse-v-sidecar","authority":"none"}'
	} else {
		status = 404
		body = '{"error":"not_found"}'
	}
	conn.write_string(json_response(status, body, method != 'HEAD')) or {}
}

fn configured_port() int {
	value := (os.getenv_opt('BUYNIVERSE_V_PORT') or { '8080' }).int()
	return if value >= 1024 && value <= 65535 { value } else { 8080 }
}

fn verify_domain_logic() bool {
	job := Job{id: 'verify-job', client_id: 'verify-client', budget: 1000.0}
	higher_bid := Proposal{id: 'proposal-higher', freelancer_id: 'supplier-a', bid: 900.0}
	lower_bid := Proposal{id: 'proposal-lower', freelancer_id: 'supplier-b', bid: 700.0}
	ranked := rank_proposals(job, [higher_bid, lower_bid])
	if ranked.len != 2 || ranked[0].proposal.id != 'proposal-lower' || ranked[0].rank != 1 || ranked[0].savings != 300.0 {
		return false
	}
	contract := create_escrow_contract(job, lower_bid)
	return contract.amount == lower_bid.bid && contract.milestones.len == 1 && contract.milestones[0].status == 'Funded'
}

fn main() {
	cmd := if os.args.len > 1 { os.args[1] } else { 'serve' }

	match cmd {
		'serve' {
			port := configured_port()
			mut listener := net.listen_tcp(.ip, '127.0.0.1:${port}') or {
				eprintln('Failed to bind to port ${port}: ${err}')
				return
			}
			println('Buyniverse internal V sidecar on http://127.0.0.1:${port}')
			for {
				mut conn := listener.accept() or { continue }
				handle_connection(mut conn)
			}
		}
		'verify' {
			if verify_domain_logic() {
				println('V domain verification passed')
			} else {
				eprintln('V domain verification failed')
				exit(1)
			}
		}
		else {
			println('Usage: buyniverse [serve|verify]')
		}
	}
}
