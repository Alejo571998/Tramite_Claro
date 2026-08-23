// src/lib/fallbackResponses.ts
// Generado 2026-08-22T04:12:48.941Z — gemini-3.5-flash validado.
// Botón manual "Ver resultado" (no auto) — ver App.tsx
import type { TramiteTraducido } from "../types/tramite";
export const FALLBACK_RESPONSES: Record<string, TramiteTraducido> = {
  "monotributo": {
    "resumen": "Dos veces al año tenés que revisar si tus números (lo que facturaste, gastaste de luz o pagaste de alquiler en los últimos 12 meses) siguen coincidiendo con tu categoría de Monotributo. Si cambiaron, te tenés que recategorizar en febrero o agosto para quedar en la categoría que te corresponde. Si todo sigue igual, no tenés que hacer nada.",
    "organismo": "ARCA",
    "urgencia": "alta",
    "checklist": [
      {
        "paso": "Hacé cuentas de los últimos 12 meses",
        "detalle": "Revisá tus ingresos brutos, la energía eléctrica consumida, los alquileres devengados y la superficie afectada a tu actividad para ver si tenés que cambiar de categoría."
      },
      {
        "paso": "Ingresá al portal",
        "detalle": "Entrá a la web de Monotributo con tu CUIT y Clave Fiscal."
      },
      {
        "paso": "Seleccioná la opción de recategorización",
        "detalle": "Buscá y elegí la opción \"Recategorizarme\"."
      },
      {
        "paso": "Revisá y confirmá los datos",
        "detalle": "Chequeá los datos de facturación que el sistema ya tiene precargados. Corregí si hay errores o confirmá la información para finalizar."
      },
      {
        "paso": "Descargá tu nueva credencial",
        "detalle": "Emití la nueva credencial de pago para empezar a pagar el monto que corresponde a tu nueva categoría."
      }
    ],
    "alertas": [
      {
        "texto": "Si no te recategorizás estando obligado a hacerlo, ARCA te puede recategorizar de oficio usando tus movimientos bancarios o de tarjeta, y además te pueden aplicar sanciones.",
        "severidad": "critico"
      },
      {
        "texto": "Si ARCA te recategoriza de oficio, te va a llegar una notificación a tu Domicilio Fiscal Electrónico dentro de los 10 días hábiles administrativos posteriores al vencimiento.",
        "severidad": "importante"
      }
    ],
    "plazo": "Durante los meses de febrero y agosto de cada año."
  },
  "habilitacion": {
    "resumen": "Es el trámite obligatorio para poder abrir legalmente cualquier local comercial, industrial o de servicios en el municipio. Tenés que hacerlo antes de empezar a trabajar, porque las inscripciones en ARCA/AFIP o Provincia no alcanzan por sí solas para habilitarte a abrir las puertas.",
    "organismo": "Municipalidad",
    "urgencia": "alta",
    "checklist": [
      {
        "paso": "Pedir la factibilidad de suelo",
        "detalle": "Antes que nada, tenés que ir a la Dirección de Planeamiento para pedir el Certificado de factibilidad de uso de suelo. Esto sirve para confirmar que en la zona de tu local está permitido el rubro que querés poner."
      },
      {
        "paso": "Juntar los papeles del inmueble",
        "detalle": "Necesitás el contrato de alquiler vigente o el título de propiedad del local, además de pedir un Libre Deuda municipal de la propiedad."
      },
      {
        "paso": "Preparar los planos y seguridad",
        "detalle": "Conseguí el plano del local con las medidas de las superficies. Si tu actividad lo requiere, tiene que estar visado por un profesional matriculado. También necesitás el Certificado de Bomberos vigente para tu rubro."
      },
      {
        "paso": "Tener tus papeles impositivos al día",
        "detalle": "Prepará la constancia de CUIT de ARCA (ex AFIP) y la inscripción en Ingresos Brutos."
      },
      {
        "paso": "Presentar la solicitud",
        "detalle": "Completá y firmá el formulario de habilitación, y presentalo junto con toda la documentación en la Dirección de Habilitaciones para iniciar el expediente."
      },
      {
        "paso": "Pasar la inspección",
        "detalle": "Los inspectores van a ir a tu local a revisar las condiciones de seguridad, higiene y accesibilidad. Si encuentran algo para corregir, te van a dar un plazo para solucionarlo antes de rechazar el trámite."
      },
      {
        "paso": "Colgar el certificado",
        "detalle": "Una vez que aprueben todo, te van a dar el Certificado de Habilitación. Es obligatorio que lo pongas en un lugar bien visible dentro del local."
      }
    ],
    "alertas": [
      {
        "texto": "No abras antes de tiempo: si iniciás la actividad comercial sin tener la habilitación aprobada te pueden clausurar el local y cobrar multas pesadas, por más que el trámite ya esté en curso.",
        "severidad": "critico"
      }
    ],
    "plazo": ""
  },
  "dni": {
    "resumen": "Trámite para renovar tu DNI, ya sea porque se venció, lo perdiste, te lo robaron, se dañó o si tenés que cambiar algún dato personal como el domicilio.",
    "organismo": "RENAPER",
    "urgencia": "media",
    "checklist": [
      {
        "paso": "Sacar turno online",
        "detalle": "Pedí un turno previo de forma obligatoria a través de la web de RENAPER o desde la aplicación Mi Argentina."
      },
      {
        "paso": "Preparar la documentación personal",
        "detalle": "Buscá tu DNI anterior. Si te lo robaron o lo perdiste, tenés que presentar la denuncia policial correspondiente. Si vas a cambiar datos, llevá el documento que lo certifique."
      },
      {
        "paso": "Acompañar a los menores de edad",
        "detalle": "Si el DNI a renovar es de un menor, tiene que ir sí o sí acompañado por el padre, la madre o el representante legal, quien también debe llevar su propio DNI para identificarse."
      },
      {
        "paso": "Asistir al turno y abonar el arancel",
        "detalle": "Presentate el día asignado. Tené en cuenta que si la renovación es por pérdida o rotura tiene costo, y que podés elegir pagar un extra para el trámite exprés de entrega rápida."
      }
    ],
    "alertas": [
      {
        "texto": "No uses el DNI vencido para hacer trámites bancarios, gestiones migratorias o trámites administrativos públicos, ya que te lo van a rebotar.",
        "severidad": "importante"
      },
      {
        "texto": "La entrega por correo postal puede demorarse más de lo común si hacés el trámite justo antes de las vacaciones de verano o en vísperas de elecciones.",
        "severidad": "info"
      }
    ],
    "plazo": ""
  },
  "auh": {
    "resumen": "La Asignación Universal por Hijo (AUH) es una ayuda económica mensual de ANSES para quienes están desocupados, trabajan en negro o son monotributistas sociales. Te corresponde por cada hijo menor de 18 años a tu cargo (o sin límite de edad si tiene una discapacidad) hasta un máximo de 5 chicos.",
    "organismo": "ANSES",
    "urgencia": "media",
    "checklist": [
      {
        "paso": "Verificá que cumplís con los requisitos básicos",
        "detalle": "Tenés que ser argentino (o extranjero con al menos 2 años de residencia legal) y no estar cobrando jubilación, pensión, SUAF ni seguro de desempleo."
      },
      {
        "paso": "Juntá los documentos de la familia",
        "detalle": "Buscá el DNI tuyo y el de cada uno de tus hijos. Asegurate de tener las libretas de vacunación al día y, para los chicos de 5 años o más, los certificados de escolaridad."
      },
      {
        "paso": "Iniciá el trámite en ANSES",
        "detalle": "Podés gestionarlo por internet a través de la web oficial de ANSES o sacar un turno para ir a presentarte en una oficina de atención física."
      },
      {
        "paso": "Presentá la libreta todos los años",
        "detalle": "Para que no te suspendan el pago del 20% acumulado, tenés que presentar el certificado de vacunas y de escuela antes de que termine cada ciclo lectivo."
      }
    ],
    "alertas": [
      {
        "texto": "Todos los meses ANSES te va a retener el 20% del total de la asignación. Solo te lo van a pagar junto a fin de año si presentás la libreta de salud y educación antes de que termine el ciclo lectivo. Si te dejás estar y no la presentás, perdés esa plata.",
        "severidad": "critico"
      }
    ],
    "plazo": "La documentación de salud y escolaridad se debe presentar antes de que finalice el ciclo lectivo de cada año."
  }
} as Record<string, TramiteTraducido>;
