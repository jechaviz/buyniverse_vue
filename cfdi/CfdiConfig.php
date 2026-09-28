<?php
declare(strict_types=1);
namespace Buyniverse\Cfdi;

require_once __DIR__ . '/PacProviders.php';

/**
 * Picks the PAC from the runtime configuration:
 *   'cfdi' => ['provider'=>'sw', 'sw'=>['environment'=>'test|production', 'token'=>...]]
 * The simulator is allowed only in demo mode, so production can never emit a
 * CFDI without fiscal validity. Returns null when invoicing is not configured.
 */
function cfdi_pac(array $config, string $mode): ?PacProvider {
    $cfdi = is_array($config['cfdi'] ?? null) ? $config['cfdi'] : [];
    $provider = strtolower((string) ($cfdi['provider'] ?? ''));
    if ($provider === 'sw') {
        $sw = new SwPacProvider(is_array($cfdi['sw'] ?? null) ? $cfdi['sw'] : []);
        return $sw->configured() ? $sw : null;
    }
    if ($provider === 'mock' && $mode === 'demo') return new MockPacProvider();
    return null;
}

/** Timezone for CFDI dates (the SAT expects local Mexican time, up to 72 hours back). */
function cfdi_now(array $config): string {
    $zone = (string) (($config['cfdi']['timezone'] ?? null) ?: 'America/Mexico_City');
    return (new \DateTime('now', new \DateTimeZone($zone)))->format('Y-m-d\TH:i:s');
}
