/* Product data shared by every page. Image files are numbered from 01; positions in
   these lists start at 0, so 'sconces:0' is assets/img/fixtures/sconces-01.webp. */

export const CATEGORY = {
  sconces: { plural: 'Wall lights', singular: 'Wall light', mount: 'wall', code: 'W' },
  ceiling: { plural: 'Ceiling lights', singular: 'Ceiling light', mount: 'ceiling', code: 'C' },
  chandeliers: { plural: 'Chandeliers', singular: 'Chandelier', mount: 'pendant', code: 'H' }
};
export const CATEGORY_ORDER = ['sconces', 'ceiling', 'chandeliers'];

export const styleCatalog = {
  sconces: {
    note: 'Wall-mounted lights for bedside, hallway and accent lighting.',
    items: ['Modern cylinder', 'Pleated shade arm', 'Black cone arm', 'Clear glass bell', 'Linen shade arm', 'Outdoor lantern', 'Vertical glass tube', 'Textured glass cylinder', 'Double globe']
  },
  ceiling: {
    note: 'Flush, semi-flush, surface and statement ceiling fixtures.',
    items: ['LED flush mount', 'Square LED light', 'Round LED light', 'Drum semi-flush', 'Crystal semi-flush', 'Industrial cage', 'Modern Sputnik', 'Ring LED light', 'Modern loop light', 'Rattan semi-flush', 'Tiered drum light', 'Boho semi-flush', 'Glass globe light', 'Geometric cage', 'Globe flush mount', 'Linear LED light', 'Geometric flush', 'Mid-century light', 'Surface mount', 'Ribbed glass light', 'Modern dish light', 'Natural-fiber light', 'Adjustable spotlight', 'Crystal flush mount', 'Sculptural flush mount']
  },
  chandeliers: {
    note: 'Decorative centrepieces, from classic crystal to contemporary sculptural forms.',
    items: ['Crystal chandelier', 'Modern chandelier', 'Classic chandelier', 'Linear chandelier', 'Drum chandelier', 'Tiered chandelier', 'Cascading chandelier', 'Globe chandelier', 'Sputnik chandelier', 'Wagon-wheel chandelier', 'Mini chandelier', 'Industrial chandelier', 'Bohemian chandelier', 'Art Deco chandelier', 'Nature-inspired chandelier', 'Ring chandelier', 'Bubble chandelier', 'Disc chandelier', 'Canopy chandelier', 'Sculptural chandelier']
  }
};

export const styleNotes = {
  sconces: [
    'A clean cylindrical wall light casts a soft up-and-down glow, making it a restrained choice for hallways and bedside walls.',
    'A pleated fabric shade softens the light while the short brass arm adds a classic, warm accent beside a bed or reading chair.',
    'The angled black cone directs light downward, useful for focused bedside or task lighting with a modern contrast finish.',
    'A clear bell glass shade leaves the bulb visible and gives this brass wall fixture a light, vintage-inspired character.',
    'A tapered linen shade diffuses light gently, pairing naturally with calm bedrooms and traditional interiors.',
    'A framed lantern enclosure protects the bulb visually and suits entryways, covered porches, or transitional spaces.',
    'A slim vertical glass tube creates a minimal architectural line for mirrors, corridors, or a matched bedside pair.',
    'Textured glass scatters the light into a sparkling pattern, adding detail to a vanity wall or hospitality setting.',
    'Two opal globes spread light in opposite directions and create a balanced statement for a bedside or narrow wall.'
  ],
  ceiling: [
    'A low-profile round LED disc sits close to the ceiling and gives broad, even general illumination.',
    'A square LED panel brings a crisp geometric outline to compact rooms, corridors, or modern utility spaces.',
    'A classic round LED panel keeps the ceiling simple while providing an even, low-profile wash of light.',
    'A fabric drum shade hides the light source and softens the room with a warm semi-flush silhouette.',
    'Layered crystal drops add sparkle beneath a compact ceiling mount, suited to a small entry or dressing area.',
    'An open metal cage leaves the bulbs visible and brings an industrial character to kitchens and relaxed living spaces.',
    'Radiating exposed bulbs create a Sputnik silhouette that works well as a sculptural focal point.',
    'A single glowing ring keeps the form minimal and distributes light around a clean circular outline.',
    'Interlocking illuminated loops create a contemporary sculptural centerpiece with an integrated-light look.',
    'A woven rattan dome filters light through its natural texture for a relaxed, organic interior.',
    'A stepped drum profile adds depth while keeping the light soft and mostly directed downward.',
    'A woven shade combines a rounded profile with natural texture and a warm decorative glow.',
    'A clear globe shows the bulb and its warm filament, giving a light, vintage-inspired ceiling accent.',
    'A cubic metal frame exposes several bulbs and gives the fixture a strong architectural outline.',
    'An opal globe and compact brass mount create a simple diffused light for smaller rooms and hallways.',
    'A slim linear LED bar spreads light along its length, useful above a work surface or in a narrow passage.',
    'A faceted shade creates angular shadows and a graphic low-profile appearance on the ceiling.',
    'Multiple opal globes on brass arms provide an even, mid-century-inspired statement over a living area.',
    'A short cylindrical surface mount directs light down from a compact, architectural form.',
    'Ribbed glass catches and refracts the bulb glow, adding texture to a compact ceiling fixture.',
    'Several shallow dishes distribute light in multiple directions while keeping the fixture close to the ceiling.',
    'A woven natural-fiber dome brings a relaxed handcrafted texture and a warm pool of light.',
    'Adjustable heads let the light be aimed toward different task or accent areas in one room.',
    'A low crystal profile adds reflected sparkle while fitting beneath lower ceilings.',
    'Overlapping light loops create a contemporary graphic form and an even ambient glow.'
  ],
  chandeliers: [
    'Cascading crystal strands and candle-style lamps form a traditional centerpiece for a formal dining or reception room.',
    'A spiral of illuminated rings gives this modern chandelier a fluid, sculptural presence above a dining table.',
    'Curved arms, candle bulbs, and crystal drops give the classic silhouette a decorative, heritage-inspired look.',
    'A row of glass-shielded lights spreads illumination along a table or kitchen island.',
    'A broad drum shade frames several light points and helps soften the fixture over a dining area.',
    'Stacked circular tiers create a strong vertical profile suited to rooms with generous ceiling height.',
    'Suspended glass globes at varied heights create movement and a cascading focal point in stairwells or open rooms.',
    'Opal globes arranged around a central frame give a balanced, softly diffused mid-century look.',
    'A radial arrangement of exposed bulbs makes a bold starburst centerpiece for a living or dining room.',
    'A circular frame with evenly spaced lights suits long tables and open-plan dining areas.',
    'A compact chandelier keeps the decorative effect in smaller bedrooms, entries, or breakfast nooks.',
    'Dark metal framing and exposed bulbs give the fixture an open, workshop-inspired character.',
    'A woven shade creates a handcrafted focal point and filters light into a warm, textured pattern.',
    'Layered geometric tiers and glowing panels create a structured Art Deco-inspired centerpiece.',
    'Branching arms and leaf-like lights bring an organic, nature-inspired silhouette to a room.',
    'A suspended luminous ring gives a clean contemporary outline above a table or central seating area.',
    'Clustered glass globes create a bright, reflective form with a sense of depth and movement.',
    'Repeated flat discs build a layered arrangement with broad, gentle light distribution.',
    'A canopy of many small points creates a starry effect for high ceilings and spacious interiors.',
    'A flowing continuous form turns the light fixture into a sculptural centerpiece.'
  ]
};

// "Shop by space" pages. Each pick is "<category>:<position starting at 0>".
// photo = the room photo in assets/img/hero/ used as the page banner.
export const SPACES = {
  bedroom: {
    short: 'Bedroom',
    title: 'Bedroom lighting',
    label: 'bedroom',
    icon: 'bed',
    photo: 'bedroom',
    intro: 'Soft, low-glare light for winding down: bedside wall lights, calm ceiling pieces and shades that keep the glow gentle.',
    picks: ['sconces:1', 'sconces:4', 'sconces:2', 'sconces:0', 'sconces:8', 'sconces:6', 'ceiling:3', 'ceiling:10', 'ceiling:9', 'ceiling:11', 'ceiling:14', 'ceiling:21', 'chandeliers:10']
  },
  living: {
    short: 'Living room',
    title: 'Living room lighting',
    label: 'living room',
    icon: 'sofa',
    photo: 'living',
    intro: 'Statement pieces and layered light for the room everyone shares, from sculptural centrepieces to soft wall accents.',
    picks: ['chandeliers:1', 'chandeliers:7', 'chandeliers:8', 'chandeliers:12', 'chandeliers:14', 'chandeliers:16', 'chandeliers:19', 'ceiling:6', 'ceiling:8', 'ceiling:17', 'ceiling:20', 'ceiling:24', 'sconces:0', 'sconces:8']
  },
  dining: {
    short: 'Dining',
    title: 'Dining room lighting',
    label: 'dining room',
    icon: 'dining',
    photo: 'dining',
    intro: 'Centrepieces sized to sit above a table, with warm light that flatters food and long conversations.',
    picks: ['chandeliers:0', 'chandeliers:2', 'chandeliers:3', 'chandeliers:4', 'chandeliers:5', 'chandeliers:9', 'chandeliers:13', 'chandeliers:15', 'chandeliers:6', 'ceiling:7']
  },
  office: {
    short: 'Office',
    title: 'Home office lighting',
    label: 'home office',
    icon: 'desk',
    photo: 'office',
    intro: 'Clear, even light for focused work, with clean lines that keep the desk calm and uncluttered.',
    picks: ['ceiling:0', 'ceiling:1', 'ceiling:2', 'ceiling:15', 'ceiling:18', 'ceiling:22', 'ceiling:16', 'sconces:2', 'sconces:6']
  },
  outdoor: {
    short: 'Outdoor',
    title: 'Outdoor and balcony lighting',
    label: 'outdoor space',
    icon: 'tree',
    photo: 'balcony',
    intro: 'Ideas for balconies, porches and covered terraces. Ask us about weather-rated versions before you order.',
    picks: ['sconces:5', 'sconces:0', 'ceiling:5', 'ceiling:9', 'ceiling:21', 'ceiling:12']
  }
};
export const SPACE_ORDER = ['bedroom', 'living', 'dining', 'office', 'outdoor'];

export const FINISH = { white: 'soft ivory', black: 'matte black', brass: 'warm brass' };

const pad = n => String(n).padStart(2, '0');

export function fixtureImage(key, index, small) {
  return 'assets/img/fixtures/' + key + '-' + pad(index + 1) + (small ? '-480' : '') + '.webp';
}

// Short reference shown to customers and used in requests: W-02, C-10, H-05.
export function refCode(key, index) {
  return CATEGORY[key].code + '-' + pad(index + 1);
}

export function findFixtureByName(name) {
  for (const key of CATEGORY_ORDER) {
    const index = styleCatalog[key].items.indexOf(name);
    if (index !== -1) return { key, index };
  }
  return null;
}

export function parsePick(pick) {
  const [key, index] = String(pick).split(':');
  return styleCatalog[key] && styleCatalog[key].items[+index] !== undefined ? { key, index: +index } : null;
}
