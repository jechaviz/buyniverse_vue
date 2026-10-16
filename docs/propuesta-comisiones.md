# Propuesta: comisión por ahorro con escalera de compromiso

Estado: **propuesta para decidir**. Ningún número de este documento está implementado en producción.

## Problema
Hoy Buyniverse cobra 40% del ahorro total, por operación, sin importar cuántas compras haga la empresa. Eso es fácil de explicar, pero castiga justo a los compradores que más vuelven, y no da ningún incentivo para que compren más dentro de Buyniverse. Además, el ingreso depende de que cada compra tenga un ahorro grande.

## La propuesta: tres planes, y la comisión del proveedor
**1. Libre (hoy, sin cambios).** 40% del ahorro medido. Para quien no quiere comprometer volumen.

**2. Compromiso anual (recomendado).**
- 25% del ahorro, con un mínimo de USD 300 por operación.
- La empresa se compromete a **12 compras al año**. La tasa aplica desde la primera compra.
- Si no cumple el compromiso al cierre del año, el año siguiente vuelve a 40%. No es retroactivo.
- **Comisión al proveedor de 2% del monto adjudicado**, cobrada solo cuando hay adjudicación. Es la fuente que sostiene el descuento al comprador.

**3. Empresa (suscripción).** Cuota mensual más 15% del ahorro, para grupos con varias sucursales o compras recurrentes. *El precio de la cuota es una decisión tuya.*

### Reglas comunes
- El ahorro se mide con el mismo motor que hoy: presupuesto, mejor primera oferta y oferta final.
- **Sin ahorro, sin cobro.** La comisión del comprador nunca supera el ahorro.
- **La tasa se fija al adjudicar** y queda guardada en la operación (ya existe `commercialSettlement`, que hace eso con la tasa actual).
- La calculadora pública y el panel muestran la tasa vigente del plan.

## Por qué no una escalera solo por número de compras
Probé una escalera automática (40% → 30% → 22% → 15% según compras completadas), y no alcanza: una empresa mediana tendría que hacer **+88% de compras** para que Buyniverse cobre lo mismo que hoy. Para una corporativa serían **+144%**. Solo baja el ingreso.

## Números (supuestos explícitos)
Supuestos: ahorro de 20% del presupuesto, por lo que el monto adjudicado es 4 veces el ahorro; comisión del proveedor de 2% del adjudicado (equivale a 8 puntos del ahorro).

| Empresa | Compras/año | Ahorro por compra | Hoy (40%) | Compromiso (25% + 2% proveedor) | Escalera automática |
|---|---|---|---|---|---|
| Pequeña | 6 | 4,000 | 9,600 | 7,920 (−18%) | 8,400 (−13%) |
| Mediana | 24 | 12,000 | 115,200 | 95,040 (−18%) | 76,560 (−34%) |
| Corporativa | 80 | 25,000 | 800,000 | 660,000 (−18%) | 371,250 (−54%) |

**Punto de equilibrio del plan de compromiso:** la empresa necesita **+21% a +33% de compras** para que Buyniverse cobre lo mismo que hoy. Es la apuesta del plan: el comprador compra más porque le sale más barato y el proceso ya está en la plataforma.

## Riesgos y cómo se mitigan
- **Inflar el presupuesto para hacer ver un ahorro grande.** El presupuesto se valida contra la primera oferta del mercado y no se cobra sobre un ahorro que no aparece en las ofertas reales.
- **Los proveedores no aceptan la comisión del 2%.** Probar con un grupo piloto antes de cobrarla a todos; si no se acepta, el plan de compromiso necesita +21% a +33% de compras, y no conviene lanzarlo sin la comisión del proveedor.
- **Pérdida de ingreso en compradores grandes.** El plan de compromiso es el que los retiene; la escalera automática no.

## Publicidad en Facebook
- Mensaje permitido: "Calcula cuánto te quedaría después de la comisión", con la calculadora como destino.
- **No prometer porcentajes de ahorro garantizados.** Los ahorros que se citen deben ser una estimación de la calculadora o un resultado real de una compra.
- La demo nunca alimenta publicidad (ya está así en la sección de Marketing).
- Revisar con el área legal antes de lanzar anuncios que mencionen ahorro o comisiones, porque las políticas de anuncios de Meta son estrictas con ese tipo de promesas.

## Lo que necesito que decidas
1. **Precio de la cuota del plan Empresa.**
2. **Comisión al proveedor:** ¿sí, y en cuánto? (la propuesta usa 2%).
3. **Compromiso:** ¿12 compras al año es el número correcto, y qué pasa si no se cumple?
4. **Piloto:** ¿con cuántas empresas y en qué categoría empezamos?

## Implementación después de aprobar
- Plan de la operación guardado en `commercialSettlement` al adjudicar (reutiliza el mecanismo de tasa bloqueada).
- Tabla de planes en configuración, no en código, para poder cambiar precios sin desplegar.
- Pruebas: la calculadora pública, el panel y el cierre de operación deben usar la misma tasa.
