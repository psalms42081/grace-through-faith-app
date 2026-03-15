const genesisImg = require("@/assets/bible-books/genesis.png");
const exodusImg = require("@/assets/bible-books/exodus.png");
const leviticusImg = require("@/assets/bible-books/leviticus.png");
const numbersImg = require("@/assets/bible-books/numbers.png");
const deuteronomyImg = require("@/assets/bible-books/deuteronomy.png");
const joshuaImg = require("@/assets/bible-books/joshua.png");
const judgesImg = require("@/assets/bible-books/judges.png");
const ruthImg = require("@/assets/bible-books/ruth.png");
const samuel1Img = require("@/assets/bible-books/1samuel.png");
const samuel2Img = require("@/assets/bible-books/2samuel.png");
const kings1Img = require("@/assets/bible-books/1kings.png");
const kings2Img = require("@/assets/bible-books/2kings.png");
const chronicles1Img = require("@/assets/bible-books/1chronicles.png");
const chronicles2Img = require("@/assets/bible-books/2chronicles.png");
const ezraImg = require("@/assets/bible-books/ezra.png");
const nehemiahImg = require("@/assets/bible-books/nehemiah.png");
const estherImg = require("@/assets/bible-books/esther.png");
const jobImg = require("@/assets/bible-books/job.png");
const psalmsImg = require("@/assets/bible-books/psalms.png");
const proverbsImg = require("@/assets/bible-books/proverbs.png");
const ecclesiastesImg = require("@/assets/bible-books/ecclesiastes.png");
const songImg = require("@/assets/bible-books/songofsolomon.png");
const isaiahImg = require("@/assets/bible-books/isaiah.png");
const jeremiahImg = require("@/assets/bible-books/jeremiah.png");
const lamentationsImg = require("@/assets/bible-books/lamentations.png");
const ezekielImg = require("@/assets/bible-books/ezekiel.png");
const danielImg = require("@/assets/bible-books/daniel.png");
const hoseaImg = require("@/assets/bible-books/hosea.png");
const joelImg = require("@/assets/bible-books/joel.png");
const amosImg = require("@/assets/bible-books/amos.png");
const obadiahImg = require("@/assets/bible-books/obadiah.png");
const jonahImg = require("@/assets/bible-books/jonah.png");
const micahImg = require("@/assets/bible-books/micah.png");
const nahumImg = require("@/assets/bible-books/nahum.png");
const habakkukImg = require("@/assets/bible-books/habakkuk.png");
const zephaniahImg = require("@/assets/bible-books/zephaniah.png");
const haggaiImg = require("@/assets/bible-books/haggai.png");
const zechariahImg = require("@/assets/bible-books/zechariah.png");
const malachiImg = require("@/assets/bible-books/malachi.png");
const matthewImg = require("@/assets/bible-books/matthew.png");
const markImg = require("@/assets/bible-books/mark.png");
const lukeImg = require("@/assets/bible-books/luke.png");
const johnImg = require("@/assets/bible-books/john.png");
const actsImg = require("@/assets/bible-books/acts.png");
const romansImg = require("@/assets/bible-books/romans.png");
const corinthians1Img = require("@/assets/bible-books/1corinthians.png");
const corinthians2Img = require("@/assets/bible-books/2corinthians.png");
const galatiansImg = require("@/assets/bible-books/galatians.png");
const ephesiansImg = require("@/assets/bible-books/ephesians.png");
const philippiansImg = require("@/assets/bible-books/philippians.png");
const colossiansImg = require("@/assets/bible-books/colossians.png");
const thessalonians1Img = require("@/assets/bible-books/1thessalonians.png");
const thessalonians2Img = require("@/assets/bible-books/2thessalonians.png");
const timothy1Img = require("@/assets/bible-books/1timothy.png");
const timothy2Img = require("@/assets/bible-books/2timothy.png");
const titusImg = require("@/assets/bible-books/titus.png");
const philemonImg = require("@/assets/bible-books/philemon.png");
const hebrewsImg = require("@/assets/bible-books/hebrews.png");
const jamesImg = require("@/assets/bible-books/james.png");
const peter1Img = require("@/assets/bible-books/1peter.png");
const peter2Img = require("@/assets/bible-books/2peter.png");
const john1Img = require("@/assets/bible-books/1john.png");
const john2Img = require("@/assets/bible-books/2john.png");
const john3Img = require("@/assets/bible-books/3john.png");
const judeImg = require("@/assets/bible-books/jude.png");
const revelationImg = require("@/assets/bible-books/revelation.png");

export type BookImageSource = ReturnType<typeof require>;

const BOOK_IMAGES: Record<string, BookImageSource> = {
  genesis: genesisImg,
  exodus: exodusImg,
  leviticus: leviticusImg,
  numbers: numbersImg,
  deuteronomy: deuteronomyImg,
  joshua: joshuaImg,
  judges: judgesImg,
  ruth: ruthImg,
  "1 samuel": samuel1Img,
  "2 samuel": samuel2Img,
  "1 kings": kings1Img,
  "2 kings": kings2Img,
  "1 chronicles": chronicles1Img,
  "2 chronicles": chronicles2Img,
  ezra: ezraImg,
  nehemiah: nehemiahImg,
  esther: estherImg,
  job: jobImg,
  psalms: psalmsImg,
  proverbs: proverbsImg,
  ecclesiastes: ecclesiastesImg,
  "song of solomon": songImg,
  isaiah: isaiahImg,
  jeremiah: jeremiahImg,
  lamentations: lamentationsImg,
  ezekiel: ezekielImg,
  daniel: danielImg,
  hosea: hoseaImg,
  joel: joelImg,
  amos: amosImg,
  obadiah: obadiahImg,
  jonah: jonahImg,
  micah: micahImg,
  nahum: nahumImg,
  habakkuk: habakkukImg,
  zephaniah: zephaniahImg,
  haggai: haggaiImg,
  zechariah: zechariahImg,
  malachi: malachiImg,
  matthew: matthewImg,
  mark: markImg,
  luke: lukeImg,
  john: johnImg,
  acts: actsImg,
  romans: romansImg,
  "1 corinthians": corinthians1Img,
  "2 corinthians": corinthians2Img,
  galatians: galatiansImg,
  ephesians: ephesiansImg,
  philippians: philippiansImg,
  colossians: colossiansImg,
  "1 thessalonians": thessalonians1Img,
  "2 thessalonians": thessalonians2Img,
  "1 timothy": timothy1Img,
  "2 timothy": timothy2Img,
  titus: titusImg,
  philemon: philemonImg,
  hebrews: hebrewsImg,
  james: jamesImg,
  "1 peter": peter1Img,
  "2 peter": peter2Img,
  "1 john": john1Img,
  "2 john": john2Img,
  "3 john": john3Img,
  jude: judeImg,
  revelation: revelationImg,
};

const ALIASES: Record<string, string> = {
  "song of songs": "song of solomon",
  "songs of solomon": "song of solomon",
  psalm: "psalms",
  proverb: "proverbs",
  "revelations": "revelation",
};

export function getBookImage(bookName: string): BookImageSource | null {
  const key = bookName.trim().toLowerCase();
  if (BOOK_IMAGES[key]) return BOOK_IMAGES[key];
  const alias = ALIASES[key];
  if (alias && BOOK_IMAGES[alias]) return BOOK_IMAGES[alias];
  for (const k of Object.keys(BOOK_IMAGES)) {
    if (k.startsWith(key) || key.startsWith(k)) return BOOK_IMAGES[k];
  }
  return null;
}

export function getBookImageByBookId(bookId: string | number, bookNames?: Record<string, string>): BookImageSource | null {
  if (bookNames && bookNames[String(bookId)]) {
    return getBookImage(bookNames[String(bookId)]);
  }
  return null;
}

export default BOOK_IMAGES;
