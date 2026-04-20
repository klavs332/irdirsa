import { createClient } from '@libsql/client';
import { join } from 'path';

const db = createClient({ url: `file:${join(process.cwd(), 'dirsa.db')}` });

const posts = [
  // 💼 DARBS
  {
    content: 'Priekšnieks atsūtīja "ātru jautājumu" e-pastu ar 47 lappušu PDF pielikumu. Sanāksme sāksies pēc 10 minūtēm. "Lūdzu izlasi pirms tam."',
    tag: 'darbs',
    username: 'Nogurušais Bebrs',
    media_url: '',
    media_type: '',
  },
  {
    content: 'Aizgāju uz darbu slims jo šī mēneša beigās projekta termiņš. Tagad visi kolēģi slimi un priekšnieks prasa kāpēc projekts kavējas. Es esmu cēlonis.',
    tag: 'darbs',
    username: 'Izmisušais Alnis',
    media_url: 'https://picsum.photos/seed/office-sick/800/500',
    media_type: 'image',
  },
  {
    content: 'Darba intervijā jautāja kur redzu sevi pēc 5 gadiem. Atbildēju "šeit". Tagad strādāju šeit jau 9 gadus. Vairs neviens nejautā.',
    tag: 'darbs',
    username: 'Apnikušais Zaķis',
    media_url: '',
    media_type: '',
  },

  // 💔 ATTIECĪBAS
  {
    content: 'Partneris pateica ka esam "pauzē". Google Maps rāda ka viņa atrašanās vieta ir Jāņa dzīvoklī. Jānis ir mans labākais draugs. Bija.',
    tag: 'attiecības',
    username: 'Pievilts Lācis',
    media_url: '',
    media_type: '',
  },
  {
    content: 'Kopā mazgājām traukus pirmajā kopdzīves mēnesī. Tagad viņš saka "mēs vienmēr tos mazgājam kopā" bet "mēs" nozīmē es. 4 gadi.',
    tag: 'attiecības',
    username: 'Sakaitinātā Lapsa',
    media_url: 'https://picsum.photos/seed/dishes-sink/800/500',
    media_type: 'image',
  },
  {
    content: 'Ex atsūtīja "mēs varam palikt draugi" ziņu. Pēc 3 dienām uzaicināja uz viņas saderināšanos. Ar citu. Piedalījos kā fotogrāfs.',
    tag: 'attiecības',
    username: 'Noskumušais Ežs',
    media_url: '',
    media_type: '',
  },

  // 💸 NAUDA
  {
    content: 'Nopirku akcijas par "izdevīgu cenu". Nākamajā dienā uzņēmums paziņoja par bankrotu. Šobrīd mans portfolio ir teorētisks mākslas darbs.',
    tag: 'nauda',
    username: 'Apmānītais Stārķis',
    media_url: 'https://picsum.photos/seed/stock-crash/800/500',
    media_type: 'image',
  },
  {
    content: 'Bankā teica ka manā kontā ir pietiekami lai ņemtu kredītu. Kredītu vajadzēja tāpēc ka nebija naudas. Tagad ir vēl mazāk naudas plus procenti.',
    tag: 'nauda',
    username: 'Izmocītais Susurs',
    media_url: '',
    media_type: '',
  },
  {
    content: 'Rīgas centra kafejnīcā pasūtīju kafeju un croissant. Rēķins: 8.50€. Apsēdos uz soliņa un sapratu ka apēdu nedēļas brokastis vienā reizē.',
    tag: 'nauda',
    username: 'Sadusmotā Vāvere',
    media_url: '',
    media_type: '',
  },

  // 🏥 VESELĪBA
  {
    content: 'Iešu pie ārsta tiklīdz dabūšu talonu. Talonu dabūju pēc 3 mēnešiem. Pa to laiku izārstējos pats. Ārsts saka "izskatās labi, atnāc pēc pusgada".',
    tag: 'veselība',
    username: 'Paklupušais Vilks',
    media_url: '',
    media_type: '',
  },
  {
    content: 'Google simptomus - vai nu vīruss vai sepse vai vēzis. Ģimenes ārsts iesaka dzert vairāk ūdens un atpūsties. Maksāja 15€.',
    tag: 'veselība',
    username: 'Nomāktais Āpsis',
    media_url: 'https://picsum.photos/seed/doctor-waiting/800/500',
    media_type: 'image',
  },
  {
    content: 'Zobu ārsts pārbaudes laikā teica "viss kārtībā, tiekamies pēc gada". Nākamajā dienā lūza zobs. Eiro par pārbaudi, 300€ par lūzumu.',
    tag: 'veselība',
    username: 'Izbijusies Zoss',
    media_url: '',
    media_type: '',
  },

  // 📋 BIROKRĀTIJA
  {
    content: 'Dzimšanas apliecības kopijai vajag pases kopiju. Pases iegūšanai vajag dzimšanas apliecību. PMLP darbiniece skatījās man acīs un neizskaidroja kā izkļūt no šī loka.',
    tag: 'birokrātija',
    username: 'Sašutušais Dzeņis',
    media_url: '',
    media_type: '',
  },
  {
    content: 'VSAA teica ka dokuments nav derīgs jo nav pareizi aizpildīts. Formu aizpildīja viņu darbiniece pirms 6 mēnešiem. Jāiesniedz viss no jauna.',
    tag: 'birokrātija',
    username: 'Apbēdinātais Kaķis',
    media_url: 'https://picsum.photos/seed/bureaucracy-papers/800/500',
    media_type: 'image',
  },
  {
    content: 'VID atsūtīja brīdinājumu par neapmaksātu nodokli 0.03€ apmērā no 2019. gada. Soda nauda - 47€. Administratīvās izmaksas - 15€. Iesūtīju monētu aploksnē.',
    tag: 'birokrātija',
    username: 'Izkaitinātais Stirna',
    media_url: '',
    media_type: '',
  },

  // 🇱🇻 LATVIJA™
  {
    content: 'Ceļš uz darbu parasti 20 minūtes. Rīgas dome nolēma remontēt 4 tiltus vienlaikus plus bedres Brīvības ielā. Šobrīd 1 stunda 50 minūtes. Maršruts caur Jūrmalu.',
    tag: 'Latvija™',
    username: 'Dusmīgais Suns',
    media_url: 'https://picsum.photos/seed/road-repair-riga/800/500',
    media_type: 'image',
  },
  {
    content: 'Novembris. +3°C, slapjdraņķis un vējš. Kolēģis atnāk bez cepures un šalli. "Vēl nav īsts aukstums," saka. Šodien viņam temperatūra 39.',
    tag: 'Latvija™',
    username: 'Apmuļķotais Zirgs',
    media_url: '',
    media_type: '',
  },
  {
    content: 'Valsts svētkos visa ģimene sapulcējas lai kopīgi čīkstētu par politiķiem, cenām un to, ka "visi aizbrauc uz ārzemēm". Pusē galda ir cilvēki kas dzīvo Vācijā.',
    tag: 'Latvija™',
    username: 'Nelaimīgais Ūdrs',
    media_url: '',
    media_type: '',
  },

  // 🚗 TRANSPORTS
  {
    content: 'Sabiedriskais transports kavējas 40 minūtes. Piebrauc divi autobusi vienlaikus. Abi pilni. Trešais autobuss nebrauca vispār - šoferis slims.',
    tag: 'transports',
    username: 'Pārbiedētā Zivtiņa',
    media_url: '',
    media_type: '',
  },
  {
    content: 'Parkošanās centra stāvvietā - 3.50€ stundā. Soda nauda par 10 minūtēm uz ietves - 50€. Tagad maksāju un saprotu kāpēc visi parkojās uz ietvēm.',
    tag: 'transports',
    username: 'Sabojātais Vārna',
    media_url: 'https://picsum.photos/seed/parking-fine/800/500',
    media_type: 'image',
  },
  {
    content: 'Nolēmu braukt ar elektroroleru uz darbu lai "būtu zaļāk". Lietuss sākās pusceļā. Akumulators izsīka otrajā pusceļā. Pie darba atnācu kājām, slapjš un novēlojies.',
    tag: 'transports',
    username: 'Izmisušais Lācis',
    media_url: '',
    media_type: '',
  },

  // 🤷 CITS
  {
    content: 'Pasūtīju picu. Piegādātājs atnāca pie kaimiņa. Kaimiņš apēda manu picu un teica "es domāju ka tā ir dāvana". Pica bija ar anšoviem - viņam nepatīk anšovi.',
    tag: 'cits',
    username: 'Sašutušais Zaķis',
    media_url: 'https://picsum.photos/seed/pizza-delivery/800/500',
    media_type: 'image',
  },
  {
    content: 'Iestatīju modinātāju 6:30. Pamodos 6:29. Nolēmu pagulēt vēl minūti. Pamodos 9:17. Sanāksme bija 9:00.',
    tag: 'cits',
    username: 'Apnikušais Lapsa',
    media_url: '',
    media_type: '',
  },
  {
    content: 'Nopirku jaunu datoru lai "viss būtu ātrāks". Pavadīju nedēļu pārinstalējot programmas un konfigurējot iestatījumus. Tagad darbojas lēnāk nekā vecais.',
    tag: 'cits',
    username: 'Pievilts Bebrs',
    media_url: '',
    media_type: '',
  },
];

async function seed() {
  console.log('Ievieto mock postus...');

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      tag TEXT DEFAULT '',
      username TEXT DEFAULT 'anonīms',
      user_id INTEGER,
      media_url TEXT DEFAULT '',
      media_type TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const post of posts) {
    await db.execute({
      sql: `INSERT INTO posts (content, tag, username, user_id, media_url, media_type, created_at)
            VALUES (?, ?, ?, NULL, ?, ?, datetime('now', '-' || ? || ' hours'))`,
      args: [
        post.content,
        post.tag,
        post.username,
        post.media_url,
        post.media_type,
        String(Math.floor(Math.random() * 48)),
      ],
    });
  }

  console.log(`Ievietoti ${posts.length} posti!`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
