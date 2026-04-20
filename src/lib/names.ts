const adj = [
  'Dusmīgais','Izmisušais','Sašutušais','Nogurušais','Apbēdinātais',
  'Sabojātais','Pārbiedētais','Nelaimīgais','Apmuļķotais','Nomāktais',
  'Sakaitinātais','Pievilts','Izkaitinātais','Noskumušais','Apmānītais',
  'Izbijies','Sadusmots','Paklupušais','Apnikušais','Izmocītais'
];
const nouns = [
  'Bebrs','Alnis','Stārķis','Vāvere','Zaķis','Lācis','Lapsa',
  'Vilks','Āpsis','Zoss','Dzeņis','Ežs','Stirna','Ūdrs',
  'Susurs','Kaķis','Suns','Vārna','Zivtiņa','Zirgs'
];

export function generateAnonName(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return `${adj[h % adj.length]} ${nouns[(h >> 6) % nouns.length]}`;
}
