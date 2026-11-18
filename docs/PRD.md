# Documento de requisitos (PRD)

## 01 Resumen
- **Nombre:** Salón Eventos (plantilla). Demo: "Salón Aurora".
- **Frase:** La web de tu salón con un cotizador que arma el presupuesto solo y te lo manda por WhatsApp.
- **Descripción:** Sitio listo para salones de fiestas, quintas y party halls. El cliente elige espacio, fecha, turno, invitados y adicionales, ve el total al instante y lo envía por WhatsApp o seña con Mercado Pago. Todo se configura en un solo archivo (`config.js`).

## 02 Problema
- El dueño contesta una y otra vez "¿cuánto sale para 60 personas un sábado a la noche?".
- Cada consulta mal contestada o tarde es una fecha que se va a otro salón (una fecha de sábado vale cientos de miles de pesos).

## 03 Objetivo
- Que un salón nuevo quede online con sus precios en menos de 1 día de trabajo.
- Que la consulta llegue armada: fecha, turno, invitados, adicionales y total.

## 04 Usuarios
- Dueño o encargado del salón (recibe las consultas, carga precios a través nuestro).
- Cliente final que organiza un cumpleaños, 15, casamiento o evento de empresa.

## 05 Funcionalidades (versión 1)
- **Portada:** marca, hero, "por qué elegirnos", galería con filtros y modal, ubicación, Instagram.
- **N espacios:** cada uno con mínimo y máximo de invitados, turnos con horario y precio, fotos.
- **Cotizador en vivo:** fecha (detecta fin de semana y feriados), turno, invitados, adicionales por categoría.
- **Tipos de precio:** por persona, alquiler fijo, fijo, por cantidad, distinto por turno, incluido, a consultar.
- **Reglas:** recargo de fin de semana (%), mínimo a cobrar, combos con precio especial.
- **Fechas ocupadas:** calendario propio que muestra los días tomados y no deja elegirlos.
- **WhatsApp:** envío del presupuesto armado con un clic.
- **Seña con Mercado Pago:** porcentaje configurable; el monto se recalcula en el servidor.
- **Plan de pagos:** seña + N cuotas (informativo).
- **3 temas:** claro (quinta), oscuro (party hall), elegante (casamientos).
- **Franja "Demo · tu marca acá":** se apaga con un ajuste.

## 06 Fuera de alcance (por ahora)
- Bot de WhatsApp y CRM de consultas (módulo pago futuro).
- Fechas ocupadas desde Google Sheets o el panel central (hoy se cargan en `config.js`).
- Panel para que el dueño edite precios solo.
- Login de clientes, reservas confirmadas automáticamente.

## 07 Modelo de negocio
- Puesta en marcha: USD 120–200 por única vez (marca, fotos, precios y dominio).
- Mantenimiento: USD 10–15 por mes (hosting, cambios de precios y fechas, soporte).
- Extra futuro Bot + CRM: +USD 15–25 por mes.

## 08 Métricas de éxito
- 3 salones pagos en los primeros 3 meses.
- Que cada salón reciba al menos 5 presupuestos armados por WhatsApp por mes.
