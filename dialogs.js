// Guiones de los vecinos. Un diálogo es una lista de entradas:
//   'texto'                                  -> una línea del que habla
//   { who, text }                            -> otra persona toma la palabra
//   { ask, options: [{ label, lines?, action? }] } -> pregunta con opciones
// `action` es el nombre de algo que hace la app al terminar (abrir la tienda, empezar un combate…).

// ---------- comerciales de Páxinas Galegas ----------
// Brais vende webs. Si le dices que no, te sigue un rato por el pueblo.
const braisYes = [
  '¡¡¡SÍÍÍÍ!!! ¡Lo sabía! Tienes cara de persona que invierte en su futuro.',
  'Vale, necesito tu CIF, tu dirección fiscal, tu número de cuenta y el nombre de tu primera mascota.',
  '…Es broma lo de la mascota. Bueno, apúntamelo igual, que queda bonito en el formulario.',
  '¿Cómo que no tienes CIF? ¿Entonces a quién le hago yo la factura? ¿Al Paximón?',
  'Nada, nada, no pasa nada. Te dejo mi tarjeta. Cuando montes la empresa, me llamas. Primero a mí, ¿eh? No a Vanesa.',
  '¡Hasta luego! ¡Web, GEO y a correr!',
];
const braisNo2 = [
  'Vale. Vale. Lo respeto. De verdad que lo respeto.',
  '…',
  '¡PERO QUE SEPAS QUE EL GEO NO ESPERA A NADIE!',
  'Te sigo un ratito por si cambias de opinión, ¿vale? Tú haz como si no estuviera.',
];
const braisAsk2 = { ask: '¿Y ahora qué? ¿Te preparo el presupuesto?', options: [
  { label: 'Bueeeno, vale', lines: braisYes },
  { label: 'Que NO, pesado', lines: braisNo2, action: 'chase' },
] };
const braisAsk = { ask: 'Entonces, ¿qué me dices? ¿Te preparo el presupuesto?', options: [] };
braisAsk.options.push(
  { label: '¡Sí, venga!', lines: braisYes },
  { label: 'No, gracias', lines: [
    '¿Cómo que no? ¿Tú sabes lo que estás diciendo?',
    'Mira, no te lo tomes a mal, pero eso mismo dijo el de la ferretería en 2009.',
    '¿Y sabes dónde está ahora el de la ferretería? Exacto. Nadie lo sabe. PORQUE NO TIENE WEB.',
    'Vale, vale, te entiendo. Es una decisión importante. Te lo explico otra vez, más despacito.',
    'Una. Web. Es. Como. Tu. Tienda. Pero. En. Internet.',
    'Abierta las 24 horas. Sin pagar luz. Sin que venga nadie a pedirte cambio de cincuenta.',
    '¿Mejor así? Sí, ¿verdad? Se te ve en la cara.',
    braisAsk2,
  ] },
  { label: 'Déjame pensarlo', lines: [
    '¡Claro! Piénsalo con calma. Yo espero aquí.',
    '…',
    '…',
    '…',
    '¿Ya?',
    'Venga, que cuento hasta diez. Uno, dos… nueve, diez. Se acabó el tiempo.',
    braisAsk,
  ] },
);
export const BRAIS = [
  '¡EEEEH! ¡Tú! Sí, tú. No mires para atrás, que te estoy hablando a ti.',
  'Soy Brais, asesor comercial sénior de Páxinas Galegas. Bueno, sénior desde el martes.',
  'Oye, una pregunta muy rápida, de verdad, son dos minutos: ¿tu empresa tiene página web?',
  '¿Que no tienes empresa? Bueno, eso es un detalle. Todo el mundo acaba teniendo empresa. Mi cuñado tiene tres.',
  'Mira, te cuento. Hoy en día, si no estás en Internet, NO EXISTES. Eres como un hórreo sin maíz.',
  'Y no me vale una web cualquiera, ¿eh? La que te hizo el sobrino que «sabe de ordenadores». NO.',
  'Nosotros te hacemos una web profesional, adaptada al móvil, a la tablet, al ordenador y a la tele de la cocina si hace falta.',
  'Pero espera, que aún no te dije lo mejor. ¿Tú has oído hablar del GEO?',
  'No, no es Geografía. Ni Geología. Ni lo que estudiaba tu primo en Santiago.',
  'GEO es que cuando alguien le pregunte a una inteligencia artificial «¿dónde hay un buen fontanero en Vilagarcía?», la máquina diga TU nombre.',
  '¡TU NOMBRE! ¡Dentro de la inteligencia artificial! ¿Te lo imaginas? Yo me emociono solo de decirlo.',
  'Para eso está la Web GEO: contenidos pensados para que te entiendan Google, las IA y hasta tu abuela.',
  'Y luego está la Web Continua, que es una web que no se queda parada. Crece, se actualiza… como un Tamagotchi, pero de empresa.',
  'Porque una web sin actualizar es como un pulpo sin pimentón: técnicamente es pulpo, pero da pena.',
  '¿Me sigues? Sí, ¿no? Asiente, asiente. Eso es.',
  'Y el SEO, claro. Posicionamiento. Que cuando busquen en Google salgas tú y no el de enfrente.',
  'El de enfrente, por cierto, ya tiene web. Te lo digo por si te interesa saberlo. No es por meter presión.',
  'Bueno, un poco sí es por meter presión.',
  'Te hacemos las fotos, los textos, las pestañas de servicios, las preguntas frecuentes, los títulos… TODO.',
  '¿Que qué se pone en las preguntas frecuentes? Pues lo que te pregunten frecuentemente. Es muy intuitivo.',
  'Y si tienes el Kit Digital… ¿tienes el Kit Digital? ¿Lo pediste? ¿No? ¿Por qué no? ¿Qué te pasó?',
  'Pues deberías, porque con el Kit Digital te sale prácticamente regalado. Prácticamente.',
  'Yo no puedo decir «gratis» por temas legales. Pero lo pienso muy fuerte: G-R-A-T-I-S.',
  'Además llevamos toda la vida en esto. Empezamos con la guía de papel, ¿sabes? Las Páxinas Galegas de siempre.',
  'Tu abuela nos usaba para calzar la mesa de la cocina. ¡Ahora somos digitales! La mesa sigue coja, pero eso ya no es cosa nuestra.',
  'Bueno, que me enrollo. Resumiendo mucho, muchísimo, lo mínimo imprescindible:',
  'Web profesional, GEO, SEO, Web Continua, fotos, textos, mantenimiento, estadísticas y un comercial majísimo que soy yo.',
  braisAsk,
];
export const BRAIS_CHATTER = ['¿Tienes web?', '¡Webs, webs! ¡Webs con GEO!', '¿Y usted sale en la inteligencia artificial, señora?', '¡Kit Digital! ¡Aprovechen!', '¿Quién quiere salir primero en Google?'];
export const BRAIS_CHASE = ['¡Oye! ¡Que te dejaste mi tarjeta!', '¡¿Y si te hago un precio?!', '¡GEO! ¡G-E-O!', '¡Solo una firmita, hombre!', '¡Que el de enfrente ya tiene web!'];

// Vanesa vende todo lo demás (Perfil de Google, redes, Publiblog, Catálogo de Servicios, Omnea…)
const vaneYes = [
  '¡Ay, qué ilusión! Lo primero es hacerte una auditoría de tu presencia online.',
  'A ver… te busco en Google… … … No sales. No sales en ningún lado. En ninguno.',
  '¿Eres una persona real? ¿Existes? Ah, que eres un personaje de un videojuego. Eso explica muchas cosas.',
  'Nada, nada, esto se soluciona. Te apunto en la lista. Estás el número… cuatrocientos doce.',
  '¡Te llamo la semana que viene! O la otra. ¡Muaaa!',
];
const vaneAsk2 = { ask: '¿Ahora sí?', options: [
  { label: 'Vaaale, sí', lines: vaneYes },
  { label: 'NO. Adiós.', lines: ['Bueno, bueno. Ya me voy.', 'Pero me quedo cerquita, ¿eh? Por si acaso.', '¡Que no te dé vergüenza llamarme! ¡VANESAAAA!'], action: 'chase' },
] };
export const VANE = [
  '¡Holaaa! Perdona, ¿tienes un segundito? Solo un segundito, te lo prometo.',
  'Soy Vanesa, de Páxinas Galegas. Seguro que Brais ya te ha dado la chapa con la web, ¿no?',
  'Él es muy de webs. Yo soy más de TODO LO DEMÁS.',
  'A ver, dime una cosa: ¿tu negocio sale en Google Maps? ¿Con fotos bonitas? ¿Con reseñas de cinco estrellas?',
  'Porque te llevamos el Perfil de Empresa de Google. Te lo dejamos que brilla como la ría en agosto.',
  'Horarios, fotos, publicaciones… y cuando alguien busque «pulpería abierta ahora», ¡PUM! Sales tú.',
  'Aunque no tengas pulpería. Ya veremos cómo lo hacemos.',
  'Y luego están las redes sociales. Instagram, Facebook… Tú lo que necesitas es contenido. CON-TE-NI-DO.',
  'Nosotros te llevamos las redes: publicaciones, carruseles, textos con emojis… 🐙✨🍷 ¿Ves? Emojis. Así, sin esfuerzo.',
  '¿Y un blog? ¿Tienes blog? Con el Publiblog te escribimos noticias para tu web todos los meses.',
  'Noticias de verdad, ¿eh? «Cinco consejos para elegir un buen albariño». «Por qué tu tejado llora en invierno». Cosas que la gente lee.',
  'A Google le encantan las noticias. Le en-can-tan. Es como un perro con un hueso, pero con palabras clave.',
  '¿Y el Catálogo de Servicios? Todos tus servicios bien ordenaditos, cada uno con su ficha. Como un menú del día, pero de tu empresa.',
  'Y luego, por supuesto, está Omnea.',
  '¿Que qué es Omnea? Omnea es… a ver cómo te lo explico…',
  'Omnea es TODO. Es el principio y el fin. Es lo que necesitas y no sabías que necesitabas.',
  'Yo lo vendo muchísimo. Sin entrar en detalles técnicos, porque luego me lío, pero lo vendo muchísimo.',
  'Y si tienes dudas, te llamamos. Y si no las tienes, también te llamamos. Para que no te sientas solo.',
  '¡Ah! ¿Y el Kit Digital? ¿Te habló Brais del Kit Digital? Seguro que lo explicó fatal.',
  'El Kit Digital es una ayuda para digitalizarte. Tú te digitalizas y el Kit… te ayuda. Así de sencillo.',
  'Mira, te lo resumo en una frase: Perfil de Google, redes, Publiblog, Catálogo de Servicios, Omnea, reseñas, fotos, estadísticas y seguimiento mensual con cafecito incluido.',
  'Vale, eran varias frases. Pero con mucho cariño.',
  { ask: '¿Te hago una propuesta personalizada? Sin compromiso. Bueno, con un poquito de compromiso.', options: [
    { label: 'Vale, cuéntame', lines: vaneYes },
    { label: 'No me interesa', lines: [
      'Ay, no digas eso, que me pongo triste.',
      '¿Sabes lo que me dijo mi jefe el primer día? «Vanesa, un NO es un SÍ que todavía no lo sabe».',
      'Así que voy a hacer como que no he oído nada.',
      'Te lo repito todo otra vez, ¿vale? Desde el principio, pero en versión corta.',
      'Perfil de Google. Redes. Publiblog. Catálogo de Servicios. Omnea. Kit Digital. …Y a Brais, si lo quieres, te lo regalo.',
      vaneAsk2,
    ] },
    { label: 'Tengo prisa', lines: ['¡Uy, yo también! Por eso hablo tan rápido.', 'Vamos a hacer una cosa: te lo cuento mientras caminas. Tú anda, que yo te sigo.'], action: 'chase' },
  ] },
];
export const VANE_CHATTER = ['¿Sale tu negocio en Google Maps?', '¡Publiblog fresquito, recién escrito!', 'Omnea, ¿alguien quiere Omnea?', '¡Reseñas! ¡Tengo reseñas!', '¿Llevas tú las redes de tu empresa? Se nota…'];
export const VANE_CHASE = ['¡Espera, que no te conté lo de las reseñas!', '¡Omneaaaa!', '¡Una publicación al mes no es nada!', '¡Te mando un WhatsApp!', '¡Te dejo un folleto en el buzón!'];
// lo que contestan los vecinos cuando los comerciales intentan venderles algo
export const SALES_REPLIES = {
  maruxa: ['Xa teño web, fillo. A do meu neto.', 'Non, grazas. Eu vendo os ovos no mercado.'],
  xan: ['Eu só quero que non me toquen o hórreo.', '¿Web? ¿Para o millo?'],
  ruth: ['¡Yo quiero una web de barcos!', 'Mi madre dice que no hable con comerciales.'],
  default: ['No, gracias.', 'Déjame en paz, rapaz.', 'Ahora no, que tengo prisa.', 'Ya tengo, ya tengo.'],
};

// ---------- cafetería de Diego y Sabrina ----------
export const SABRINA = [
  '¡Épale, mi amor! Bienvenido a nuestra cafetería.',
  '¿Qué te pongo? ¿Un cafecito con leche? ¿Un bocadillo de bacon y queso, que están recién hechos?',
  { ask: '¿Quieres ver lo que tenemos?', options: [
    { label: 'Sí, a ver', action: 'shop' },
    { label: 'Solo miraba', lines: ['Tranquilo, mi vida, mira todo lo que quieras. Aquí se viene a gusto.'] },
  ] },
];
export const DIEGO = [
  'Buenas, buenas. Pase, pase, que no muerdo.',
  'Treinta años poniendo cafés y todavía hay quien me pide un descafeinado de sobre. ¡Qué tiempos!',
  'Cuando me jubile… bueno, eso digo todos los años. Sabrina no me deja.',
  { ask: '¿Le pongo algo?', options: [
    { label: 'Sí, ¿qué tienen?', action: 'shop' },
    { label: 'No, gracias', lines: ['Pues nada, aquí estamos. Como siempre. Como toda la vida.'] },
  ] },
];
export const SABRINA_CHATTER = ['¡Diego, el de la mesa dos quiere otro cortado!', '¡Chévere!', 'Ay, mi Venezuela…', '¡Recién hechos los bocatas!'];
export const DIEGO_CHATTER = ['Ya voy, ya voy…', 'Estas rodillas ya no son lo que eran.', '¿Quién ha dejado el bote vacío?', 'El año que viene me jubilo. Seguro.'];
export const CAFE_REGULAR = [
  'Yo vengo aquí desde que abrieron. Lo mejor, el bocata de bacon y queso.',
  'Si vas a pelear en la Arena, llévate un café con leche: un Paximón bien desayunado vale por dos.',
  'Y el sin lactosa espabila más. Da chakra. Es ciencia.',
];
export const SHOP_THANKS = [
  ['Sabrina', '¡Aquí tienes, mi amor! Que aproveche.'],
  ['Diego', 'Marchando. Y cuidado, que quema.'],
  ['Sabrina', '¡Chévere! Vuelve pronto, ¿oíste?'],
  ['Diego', 'Buena elección. Así desayunaba yo cuando era joven. Ayer.'],
];

// ---------- misión: la casa de Maricarmen ----------
export const DIO_NAME = 'El de DIO Express';
export const DIO_INTRO = [
  '¿Qué miras? Estoy trabajando.',
  'D.I.O Express, desalojos exprés. Si hay alguien donde no tiene que estar, lo sacamos en 24 horas.',
  'La señora de esta casa, Maricarmen, dice que la casa es suya. Mis papeles dicen otra cosa.',
  'Bueno, mis papeles son una servilleta de la cafetería. Pero pone «ESTA CASA» bien clarito.',
  { who: 'Maricarmen (desde dentro)', text: '¡Esta casa es mía desde 1974! ¡Que se vaya, o llamo a mi sobrino, que es guardia civil!' },
  '¿Y tú qué? ¿Vienes a defenderla? Muy bien. Aquí las cosas se arreglan como se arreglan en Vila Paxina.',
  'Con un duelo Paximón. Mi Ferrollo contra el Paximón que tú elijas.',
  'Si ganas, me voy y no vuelvo. Si pierdes… la casa es de D.I.O Express.',
  { ask: '¿Aceptas el duelo?', options: [
    { label: '¡Acepto!', action: 'dio_battle' },
    { label: 'Todavía no', lines: ['Ya volverás. Yo de aquí no me muevo. Cobro por horas.'] },
  ] },
];
export const DIO_CHATTER = ['¡POM! ¡POM! ¡POM!', '¡ABRA LA PUERTA, SEÑORA!', '¡D.I.O Express! ¡Desalojos en 24 horas!', 'Sé que está ahí dentro, Maricarmen…', '¡Traigo una servilleta firmada!'];
export const MARICARMEN_DOOR = [
  { who: 'Maricarmen (desde dentro)', text: '¿Quién es? ¡Si es otra vez el de DIO Express, que se vaya!' },
  { who: 'Maricarmen (desde dentro)', text: 'Ah, que no eres él. Perdona, rapaz. Es que ese hombre lleva toda la mañana aporreando la puerta.' },
  { who: 'Maricarmen (desde dentro)', text: '¿No podrías hacer algo? Dicen que en Vila Paxina todo se arregla a golpe de Paximón…' },
];
export const DIO_LOSES = [
  '¡¿QUÉ?! ¡Imposible! Mi Ferrollo nunca había perdido… bueno, desde el jueves.',
  'Vale, vale. Me voy. Pero que conste que la servilleta era un documento válido.',
  '¡D.I.O Express se retira! ¡Por hoy!',
  { who: 'Maricarmen', text: '¡Se ha ido! ¡Se ha ido de verdad! ¡Ay, rapaz, muchísimas gracias!' },
  { who: 'Maricarmen', text: 'Toma, para que te tomes un café con leche a mi salud en lo de Diego y Sabrina.' },
  { who: '', text: '(Has ganado 2 paxicoins)' },
  { who: 'Maricarmen', text: 'Si alguna vez necesitas algo, aquí tienes tu casa. Bueno, MI casa. Pero ya me entiendes.' },
];
export const DIO_WINS = [
  '¡JA! Como te dije: desalojo en 24 horas. Bueno, en 24 segundos.',
  'Maricarmen, recoja sus cosas. Esta casa es ahora de D.I.O Express.',
  { who: 'Maricarmen', text: '¡Ay, mi casa! ¡Mi casiña! Me voy a Cambados con mi prima… y con el albariño.' },
  '¡Y tú, a circular! Que esto ya es propiedad privada.',
];
export const MARICARMEN_THANKS = [
  '¡Mira quién viene! Mi héroe.',
  'Desde que se fue el de DIO Express duermo como un lirón. Como un lirón con la puerta cerrada con llave.',
  'Por cierto, dicen que en Cambados hay feria del Albariño. Yo no voy, que luego me lío.',
];
export const MARICARMEN_HOME = ['(La casa huele a caldo gallego recién hecho)', { who: 'Maricarmen', text: '¡Pasa cuando quieras, rapaz! Pero límpiate los pies, que acabo de fregar.' }];
export const DIO_OWNER = [
  'Anda, mira quién vuelve. El que perdió la casa de Maricarmen.',
  'Ahora es la sede de D.I.O Express en Vila Paxina. Muy luminosa, por cierto.',
  'Tenemos oferta: desalojos a domicilio con un 10 % de descuento. ¿Te interesa? ¿No? Tú te lo pierdes.',
];
export const DIO_OWNER_CHATTER = ['Propiedad de D.I.O Express.', 'Aquí no se aparca.', '¿Y tú qué miras?'];
export const DIO_HOUSE_DOOR = ['La puerta tiene un precinto amarillo: «PROPIEDAD DE D.I.O EXPRESS».', 'Dentro se oye una tele muy alta. Están viendo un programa de reformas.'];
export const MARICARMEN_CAMBADOS = [
  '¡Hip! Ah, eres tú… el que perdió mi casa.',
  'No pasa nada, rapaz. Ahora vivo aquí, en la feria. Tengo albariño y compañía.',
  'El de DIO Express no me dejó llevarme la tele. Pero me llevé las cortinas.',
  '¡Saúde!',
];

// ---------- estación ----------
export const STATION = {
  jefe: ['Buenos días. Soy el jefe de estación.', 'Todos los trenes circulan con retraso. Todos. Es nuestra especialidad.', '¿El de Albacete? Llega próximamente. Muy próximamente. Mire el panel.', 'No me pregunte por qué hay un tren a Albacete. Yo solo trabajo aquí.'],
  viajero: ['Llevo esperando el regional a Santiago desde las ocho.', '¿De qué día? No me acuerdo. Pero de las ocho seguro.'],
  estudiante: ['¡Voy a llegar tarde a clase! Bueno, como todos los días.', 'Dicen que el tren de Albacete llega pronto. No conozco a nadie que vaya a Albacete.'],
  albacete: ['Yo voy a Albacete.', '¿Por qué? Pues no lo sé. Pero el tren llega próximamente y no lo pienso perder.', 'Llevo aquí tres semanas. Tengo un bocadillo para el viaje. Bueno, tenía.'],
};
export const TRAIN_REACT = ['¡Ese no para aquí!', '¡Otro que pasa de largo!', '¿Ese era el mío?', '¡PARE, PARE!', '¡Era el de Albacete! Ah, no.'];
export const TAQUILLA = ['TAQUILLA · Horario de atención al público: de 9:00 a 9:05.', 'Hoy está cerrada por formación del personal.', 'Compre su billete en la máquina expendedora (fuera de servicio).'];
export const VENDING = ['Máquina expendedora: FUERA DE SERVICIO.', 'Alguien ha pegado un pósit: «Se tragó mi euro. Y mi fe en la humanidad».'];

// ---------- Cambados: Feria do Albariño ----------
export const DRUNK_CHATTER = ['¡Hip!', '¡Outra cunquiña!', 'Eu non estou borracho, estou contento.', 'Ai, lalelo, lalelo…', '¡Viva o Albariño!', '¿Onde deixei o coche?', 'Quérote moito, ¿eh? Moito.', 'Este ano a colleita vén boa…', '¡Saúde!', 'Unha máis e marcho. (Mentira)'];
export const DRUNKS = [
  ['Manolo', ['¡Ho! ¡Un amigo! ¿Ti de quen es?', 'Eu son de Cambados de toda a vida. E o meu pai. E o viño tamén.']],
  ['Pili', ['¡Qué bonito está todo! ¿Por qué da vueltas?', 'Tú no bebas mucho, ¿eh? Hazme caso a mí, que sé de lo que hablo. ¡Hip!']],
  ['Suso', ['Levo desde as once aquí. Da mañá.', 'A caseta azul pon as cuncas máis cheas. Non llo digas a ninguén.']],
  ['Charo', ['¡Ay, que me perdí de mis amigas! Bueno, ya aparecerán. O no.', '¿Tú sabías que el albariño es la uva más bonita del mundo? Pues ahora lo sabes.']],
  ['Moncho', ['Eu antes xogaba ao Paximón. Agora xogo á cunca.', 'Se ganas a cata da caseta, invítote. ¡É broma, non tes cartos!']],
  ['Fina', ['¡Viva Cambados! ¡Viva o Salnés! ¡Vivan as cuncas!', 'Mañá non me levanto. Nin pasado.']],
  ['Tucho', ['Tengo una teoría: el suelo se mueve más en la feria que en casa.', '¿Me sujetas la cunca? Que voy a atarme un zapato. …Ya no me acuerdo de qué zapato.']],
  ['Loli', ['¡Ho, qué bien vas vestido! ¿Es de marca eso?', 'Yo vine a por un albariño y ya van… ¿cuántos dedos ves aquí?']],
  ['Xosé', ['A cata faise así: miras, ulis, e… ¡pumba! Para dentro.', '¿O tren de Albacete? Iso é unha lenda.']],
  ['Rosiña', ['Ai, lalelo, lalelo, lalelo…', '¡Que non me pare a música! ¿Que non hai música? Pois eu escóitoa.']],
];
export const CASETAS = [
  { short: 'PAXIÑA', name: 'Adega Paxiña' },
  { short: 'A CUNCA', name: 'Adega A Cunca' },
  { short: 'VIÑA MOUCHA', name: 'Viña Moucha' },
  { short: 'SAÚDE!', name: 'Bodegas Saúde' },
  { short: 'O RETRANCA', name: 'Adega O Retranca' },
  { short: 'TERRAS UMIA', name: 'Terras do Umia' },
  { short: 'PAZO LOURO', name: 'Pazo Louro' },
  { short: 'O PERCEBE', name: 'Adega O Percebe' },
];
export const CASETA_HELLO = [
  '¡Benvido á feria! Temos o mellor albariño do Salnés. Palabra.',
  '¡Pasa, pasa! Aquí a cunca vai ben cheíña.',
  'Este albariño ten notas de mazá, pexego e… retranca.',
  'A primeira invita a casa. E a segunda. E todas, que é festa.',
];
