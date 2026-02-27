import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { strongEntries, verseStrongMaps, bibleVerses } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const NEW_STRONG_ENTRIES = [
  { id: "H1", language: "he", lemma: "\u05D0\u05B8\u05D1", transliteration: "ab", pronunciation: "awb", definition: "father", extendedDefinition: "A primitive word; father, in a literal and immediate, or figurative and remote application.", kjvUsage: "chief, (fore-)father(-less), patrimony, principal", derivation: "A primitive word" },
  { id: "H120", language: "he", lemma: "\u05D0\u05B8\u05D3\u05B8\u05DD", transliteration: "adam", pronunciation: "aw-dawm", definition: "man, mankind, human", extendedDefinition: "From H119; ruddy i.e. a human being (an individual or the species, mankind, etc.).", kjvUsage: "another, hypocrite, common sort, low, man (mean, of low degree), person", derivation: "From H119" },
  { id: "H157", language: "he", lemma: "\u05D0\u05B8\u05D4\u05B7\u05D1", transliteration: "ahab", pronunciation: "aw-hab", definition: "to love", extendedDefinition: "A primitive root; to have affection for (sexually or otherwise).", kjvUsage: "beloved, friend, love(-d, -ly, -r)", derivation: "A primitive root" },
  { id: "H216", language: "he", lemma: "\u05D0\u05D5\u05E8", transliteration: "owr", pronunciation: "ore", definition: "light, daylight", extendedDefinition: "From H215; illumination or (concrete) luminary (in every sense, including lightning, happiness, etc.).", kjvUsage: "bright, clear, day, light (-ning), morning, sun", derivation: "From H215" },
  { id: "H559", language: "he", lemma: "\u05D0\u05B8\u05DE\u05B7\u05E8", transliteration: "amar", pronunciation: "aw-mar", definition: "to say, speak, utter", extendedDefinition: "A primitive root; to say (used with great latitude).", kjvUsage: "answer, appoint, avouch, bid, boast self, call, certify, challenge, charge, command, commune, consider, declare, demand, desire, determine, expressly, indeed, intend, name, plainly, promise, publish, report, require, say, speak (against, of), still, suppose, talk, tell, term, that is, think, use [speech], utter, verily", derivation: "A primitive root" },
  { id: "H853", language: "he", lemma: "\u05D0\u05B5\u05EA", transliteration: "eth", pronunciation: "ayth", definition: "sign of the definite direct object", extendedDefinition: "Apparent contracted from H226 in the demonstrative sense of entity; properly, self (but generally used to point out more definitely the object of a verb or preposition).", kjvUsage: "(untranslatable particle marking a direct object)", derivation: "From H226" },
  { id: "H1285", language: "he", lemma: "\u05D1\u05E8\u05D9\u05EA", transliteration: "beriyth", pronunciation: "ber-eeth", definition: "covenant, alliance, pledge", extendedDefinition: "From H1262 (in the sense of cutting); a compact (because made by passing between pieces of flesh).", kjvUsage: "confederacy, covenant, league", derivation: "From H1262" },
  { id: "H1696", language: "he", lemma: "\u05D3\u05B8\u05D1\u05B7\u05E8", transliteration: "dabar", pronunciation: "daw-bar", definition: "to speak, declare, talk", extendedDefinition: "A primitive root; perhaps properly, to arrange; but used figuratively (of words), to speak.", kjvUsage: "answer, appoint, bid, command, commune, declare, destroy, give, name, promise, pronounce, rehearse, say, speak, be spokesman, subdue, talk, teach, tell, think, use entreaties, utter, well, work", derivation: "A primitive root" },
  { id: "H1697", language: "he", lemma: "\u05D3\u05B8\u05D1\u05B8\u05E8", transliteration: "dabar", pronunciation: "daw-baw", definition: "word, matter, thing", extendedDefinition: "From H1696; a word; by implication, a matter (as spoken of) or thing; adverbially, a cause.", kjvUsage: "act, advice, affair, answer, any such (thing), because of, book, business, care, case, cause, certain rate, chronicles, commandment, communion, concern(-ing), confer, counsel, dearth, decree, deed, disease, due, duty, effect, eloquent, errand, evil favoured-ness, glory, harm, hurt, iniquity, judgment, language, lying, manner, matter, message, (no) thing, oracle, ought, parts, pertaining, please, portion, power, promise, provision, purpose, question, rate, reason, report, request, (as hast) said, sake, saying, sentence, sign, so, some (uncleanness), somewhat to say, song, speech, spoken, talk, task, that, there done, thing (concerning), thought, thus, tidings, what(-soever), wherewith, which, word, work", derivation: "From H1696" },
  { id: "H2421", language: "he", lemma: "\u05D7\u05B8\u05D9\u05B8\u05D4", transliteration: "chayah", pronunciation: "khaw-yaw", definition: "to live, have life, remain alive", extendedDefinition: "A primitive root; to live, whether literally or figuratively; causatively, to revive.", kjvUsage: "keep (leave, make) alive, certainly, give (promise) life, (let, suffer to) live, nourish up, preserve (alive), quicken, recover, repair, restore (to life), revive, save (alive, life, lives), be whole", derivation: "A primitive root" },
  { id: "H2617", language: "he", lemma: "\u05D7\u05B6\u05E1\u05B6\u05D3", transliteration: "chesed", pronunciation: "kheh-sed", definition: "lovingkindness, mercy, steadfast love", extendedDefinition: "From H2616; kindness; by implication (towards God) piety: rarely (by opposition) reproof, or (subjectively) beauty.", kjvUsage: "favour, good deed(-liness, -ness), kindly, (loving-)kindness, merciful (kindness), mercy, pity, reproach, wicked thing", derivation: "From H2616" },
  { id: "H3045", language: "he", lemma: "\u05D9\u05B8\u05D3\u05B7\u05E2", transliteration: "yada", pronunciation: "yaw-dah", definition: "to know, perceive, understand", extendedDefinition: "A primitive root; to know (properly, to ascertain by seeing); used in a great variety of senses.", kjvUsage: "acknowledge, acquaintance(-ted with), advise, answer, appoint, assuredly, be aware, can(-not), certainly, comprehend, consider, declare, be diligent, discern, discover, endued with, familiar friend, famous, feel, can have, be ignorant, instruct, kinsfolk, kinsman, (cause to let, make) know(-ing, self), (come to give, have, take) knowledge, have (knowledge), (be, make, make to be, make self) known, be learned, lie by man, mark, perceive, privy to, prognosticator, regard, have respect, skilful, shew, can (man of) skill, be sure, of a surety, teach, (can) tell, understand, have (understanding), will be, wist, wit, wot", derivation: "A primitive root" },
  { id: "H3444", language: "he", lemma: "\u05D9\u05B0\u05E9\u05C1\u05D5\u05BC\u05E2\u05B8\u05D4", transliteration: "yeshuah", pronunciation: "yesh-oo-aw", definition: "salvation, deliverance", extendedDefinition: "Feminine passive participle of H3467; something saved, i.e. (abstractly) deliverance; hence, aid, victory, prosperity.", kjvUsage: "deliverance, health, help(-ing), salvation, save, saving (health), welfare", derivation: "From H3467" },
  { id: "H3820", language: "he", lemma: "\u05DC\u05B5\u05D1", transliteration: "leb", pronunciation: "labe", definition: "heart, mind, inner man", extendedDefinition: "A form of H3824; the heart; also used (figuratively) very widely for the feelings, the will and even the intellect.", kjvUsage: "care for, comfortably, consent, considered, courag(-eous), friend(-ly), (broken-, hard-, merry-, stiff-, stout-)heart(-ed), heed, mind, regarded, understanding, well-wisher, willingly, wisdom", derivation: "A form of H3824" },
  { id: "H4397", language: "he", lemma: "\u05DE\u05B7\u05DC\u05B0\u05D0\u05B8\u05DA", transliteration: "malak", pronunciation: "mal-awk", definition: "messenger, angel", extendedDefinition: "From an unused root meaning to despatch as a deputy; a messenger; specifically, of God, i.e. an angel (also a prophet, priest or teacher).", kjvUsage: "ambassador, angel, king, messenger", derivation: "From an unused root" },
  { id: "H4428", language: "he", lemma: "\u05DE\u05B6\u05DC\u05B6\u05DA", transliteration: "melek", pronunciation: "meh-lek", definition: "king, ruler", extendedDefinition: "From H4427; a king.", kjvUsage: "king, royal", derivation: "From H4427" },
  { id: "H4941", language: "he", lemma: "\u05DE\u05B4\u05E9\u05C1\u05B0\u05E4\u05B8\u05BC\u05D8", transliteration: "mishpat", pronunciation: "mish-pawt", definition: "judgment, justice, ordinance", extendedDefinition: "From H8199; properly, a verdict (favorable or unfavorable) pronounced judicially, especially a sentence or formal decree.", kjvUsage: "adversary, ceremony, charge, crime, custom, desert, determination, discretion, disposing, due (order, right), fashion, form, to be judged, judgment, just(-ice, -ly), (manner of) law(-ful), manner, measure, (due) order, ordinance, right, sentence, usest, worthy, wrong", derivation: "From H8199" },
  { id: "H5315", language: "he", lemma: "\u05E0\u05B6\u05E4\u05B6\u05E9\u05C1", transliteration: "nephesh", pronunciation: "neh-fesh", definition: "soul, self, life, person", extendedDefinition: "From H5314; properly, a breathing creature, i.e. animal of (abstractly) vitality; used very widely in a literal, accommodated or figurative sense (bodily or mental).", kjvUsage: "any, appetite, beast, body, breath, creature, dead(-ly), desire, fish, ghost, greedy, he, heart(-y), (hath, jeopardy of) life, lust, man, me, mind, mortally, one, own, person, pleasure, (her-, him-, my-, thy-)self, them (your)-selves, slay, soul, tablet, they, thing, will, would have it", derivation: "From H5314" },
  { id: "H6213", language: "he", lemma: "\u05E2\u05B8\u05E9\u05B8\u05C2\u05D4", transliteration: "asah", pronunciation: "aw-saw", definition: "to do, make, accomplish", extendedDefinition: "A primitive root; to do or make, in the broadest sense and widest application.", kjvUsage: "accomplish, advance, appoint, apt, be at, become, bear, bestow, bring forth, bruise, be busy, certainly, have the charge of, commit, deal (with), deck, dispose, do, (ready) dress(-ed), (put in) execute(-ion), exercise, fashion, feast, (fight-)ing man, finish, fit, fly, follow, fulfil, furnish, gather, get, go about, govern, grant, great, hinder, hold (a feast), indeed, be industrious, journey, keep, labour, maintain, make, be meet, observe, be occupied, offer, officer, pare, bring (come) to pass, perform, practise, prepare, procure, provide, put, requite, sacrifice, serve, set, shew, sin, spend, surely, take, thoroughly, trim, very, vex, be (warr-)ior, work(-man), yield, use", derivation: "A primitive root" },
  { id: "H6662", language: "he", lemma: "\u05E6\u05B7\u05D3\u05B4\u05BC\u05D9\u05E7", transliteration: "tsaddiyq", pronunciation: "tsad-deek", definition: "just, righteous, lawful", extendedDefinition: "From H6663; just.", kjvUsage: "just, lawful, righteous (man)", derivation: "From H6663" },
  { id: "H6666", language: "he", lemma: "\u05E6\u05B0\u05D3\u05B8\u05E7\u05B8\u05D4", transliteration: "tsedaqah", pronunciation: "tsed-aw-kaw", definition: "righteousness, justice", extendedDefinition: "From H6663; rightness (abstractly), subjectively (rectitude), objectively (justice), morally (virtue) or figuratively (prosperity).", kjvUsage: "justice, moderately, right(-eous) (act, -ly, -ness)", derivation: "From H6663" },
  { id: "H7307", language: "he", lemma: "\u05E8\u05D5\u05BC\u05D7\u05B7", transliteration: "ruach", pronunciation: "roo-akh", definition: "wind, breath, spirit", extendedDefinition: "From H7306; wind; by resemblance breath, i.e. a sensible (or even violent) exhalation; figuratively, life, anger, unsubstantiality; by extension, a region of the sky; by resemblance spirit, but only of a rational being.", kjvUsage: "air, anger, blast, breath, cool, courage, mind, quarter, side, spirit(-ual), tempest, vain, (whirl-)wind(-y)", derivation: "From H7306" },
  { id: "H7965", language: "he", lemma: "\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD", transliteration: "shalom", pronunciation: "shaw-lome", definition: "peace, completeness, welfare", extendedDefinition: "From H7999; safe, i.e. (figuratively) well, happy, friendly; also (abstractly) welfare, i.e. health, prosperity, peace.", kjvUsage: "do, familiar, fare, favour, friend, great, (good) health, (perfect, such as be at) peace(-able, -ably), prosper(-ity, -ous), rest, safe(-ty), salute, welfare, (all is, be) well, wholly", derivation: "From H7999" },
  { id: "H8085", language: "he", lemma: "\u05E9\u05C1\u05B8\u05DE\u05B7\u05E2", transliteration: "shama", pronunciation: "shaw-mah", definition: "to hear, listen, obey", extendedDefinition: "A primitive root; to hear intelligently (often with implication of attention, obedience, etc.).", kjvUsage: "attentively, call (gather) together, carefully, certainly, consent, consider, be content, declare, diligently, discern, give ear, (cause to, let, make to) hear(-ken, tell), indeed, listen, make (a) noise, (be) obedient, obey, perceive, (make a) proclaim(-ation), publish, regard, report, shew (forth), (make a) sound, surely, tell, understand, whosoever (heareth), witness", derivation: "A primitive root" },
  { id: "H8104", language: "he", lemma: "\u05E9\u05C1\u05B8\u05DE\u05B7\u05E8", transliteration: "shamar", pronunciation: "shaw-mar", definition: "to keep, watch, preserve", extendedDefinition: "A primitive root; properly, to hedge about (as with thorns), i.e. guard; generally, to protect, attend to, etc.", kjvUsage: "beward, be circumspect, take heed (to self), keep(-er, self), mark, look narrowly, observe, preserve, regard, reserve, save (self), sure, (that lay) wait (for), watch(-man)", derivation: "A primitive root" },
  { id: "H2377", language: "he", lemma: "\u05D7\u05B8\u05D6\u05D5\u05B9\u05DF", transliteration: "chazon", pronunciation: "khaw-zone", definition: "vision, revelation", extendedDefinition: "From H2372; a sight (mentally), i.e. a dream, revelation, or oracle.", kjvUsage: "vision", derivation: "From H2372" },
  { id: "H6635", language: "he", lemma: "\u05E6\u05B8\u05D1\u05B8\u05D0", transliteration: "tsaba", pronunciation: "tsaw-baw", definition: "host, army, warfare", extendedDefinition: "From H6633; a mass of persons (or figuratively, things), especially reg. organized for war (an army); by implication, a campaign, literally or figuratively.", kjvUsage: "appointed time, army, battle, company, host, service, soldiers, waiting upon, war(-fare)", derivation: "From H6633" },
  { id: "H7161", language: "he", lemma: "\u05E7\u05B6\u05E8\u05B6\u05DF", transliteration: "qeren", pronunciation: "keh-ren", definition: "horn, strength, power", extendedDefinition: "From H7160; a horn (as projecting); by implication, a flask, cornet; by resemblance an elephant's tooth, a corner (of the altar), a peak (of a mountain), a ray (of light); figuratively, power.", kjvUsage: "hill, horn", derivation: "From H7160" },
  { id: "H1431", language: "he", lemma: "\u05D2\u05B8\u05D3\u05B7\u05DC", transliteration: "gadal", pronunciation: "gaw-dal", definition: "to grow, become great, magnify", extendedDefinition: "A primitive root; properly, to twist, i.e. to be (causatively make) large (in various senses, as in body, mind, estate or honor).", kjvUsage: "advance, boast, bring up, exceed, excellent, be(-come, do, give, make, wax), great(-er, come to...estate, things), grow(up), increase, lift up, magnify(-ifical), be much set by, nourish (up), pass, promote, proudly (spoken), tower", derivation: "A primitive root" },
  { id: "H5307", language: "he", lemma: "\u05E0\u05B8\u05E4\u05B7\u05DC", transliteration: "naphal", pronunciation: "naw-fal", definition: "to fall, lie, be cast down", extendedDefinition: "A primitive root; to fall, in a great variety of applications.", kjvUsage: "be accepted, cast (down, self, lots, out), cease, die, divide (by lot), (let) fail, (cause to, let, make, ready to) fall (away, down, -en, -ing), fell(-ing), fugitive, have (inheritance), inferior, be judged, lay (along), (cause to) lie down, light (down), be (cast) lost, lying, overthrow, overwhelm, perish, present(-ed, -ing), (make to) rot, slay, smite out, surely, throw down", derivation: "A primitive root" },
  { id: "H3556", language: "he", lemma: "\u05DB\u05BC\u05D5\u05B9\u05DB\u05B8\u05D1", transliteration: "kokab", pronunciation: "ko-kawb", definition: "star", extendedDefinition: "Probably from the same as H3522 (in the sense of rolling) or H3554 (in the sense of blazing); a star (as round or as shining); figuratively, a prince.", kjvUsage: "star(-gazer)", derivation: "Probably from H3522" },
  { id: "H4720", language: "he", lemma: "\u05DE\u05B4\u05E7\u05B0\u05D3\u05B8\u05E9\u05C1", transliteration: "miqdash", pronunciation: "mik-dawsh", definition: "sanctuary, holy place", extendedDefinition: "From H6942; a consecrated thing or place, especially, a palace, sanctuary (whether of Jehovah or of idols) or asylum.", kjvUsage: "chapel, hallowed part, holy place, sanctuary", derivation: "From H6942" },
  { id: "H8451", language: "he", lemma: "\u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4", transliteration: "towrah", pronunciation: "to-raw", definition: "law, instruction, teaching", extendedDefinition: "From H3384; a precept or statute, especially the Decalogue or Pentateuch.", kjvUsage: "law", derivation: "From H3384" },
  { id: "H5769", language: "he", lemma: "\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD", transliteration: "owlam", pronunciation: "o-lawm", definition: "eternity, everlasting, forever", extendedDefinition: "From H5956; properly, concealed, i.e. the vanishing point; generally, time out of mind (past or future), i.e. (practically) eternity.", kjvUsage: "alway(-s), ancient (time), any more, continuance, eternal, (for, (n-))ever(-lasting, -more, of old), lasting, long (time), (of) old (time), perpetual, at any time, (beginning of the) world (without end)", derivation: "From H5956" },
  { id: "G32", language: "gr", lemma: "\u03B1\u03B3\u03B3\u03B5\u03BB\u03BF\u03C2", transliteration: "aggelos", pronunciation: "ang-el-os", definition: "messenger, angel", extendedDefinition: "From aggello (probably derived from G71; to bring tidings); a messenger; especially an angel; by implication, a pastor.", kjvUsage: "angel, messenger", derivation: "From aggello" },
  { id: "G225", language: "gr", lemma: "\u03B1\u03BB\u03B7\u03B8\u03B5\u03B9\u03B1", transliteration: "aletheia", pronunciation: "al-ay-thi-a", definition: "truth, reality", extendedDefinition: "From G227; truth.", kjvUsage: "true, truly, truth, verity", derivation: "From G227" },
  { id: "G266", language: "gr", lemma: "\u03B1\u03BC\u03B1\u03C1\u03C4\u03B9\u03B1", transliteration: "hamartia", pronunciation: "ham-ar-tee-ah", definition: "sin, offense, missing the mark", extendedDefinition: "From G264; a sin (properly abstract).", kjvUsage: "offence, sin(-ful)", derivation: "From G264" },
  { id: "G386", language: "gr", lemma: "\u03B1\u03BD\u03B1\u03C3\u03C4\u03B1\u03C3\u03B9\u03C2", transliteration: "anastasis", pronunciation: "an-as-tas-is", definition: "resurrection, rising again", extendedDefinition: "From G450; a standing up again, i.e. (literally) a resurrection from death.", kjvUsage: "raised to life again, resurrection, rise from the dead, that should rise, rising again", derivation: "From G450" },
  { id: "G746", language: "gr", lemma: "\u03B1\u03C1\u03C7\u03B7", transliteration: "arche", pronunciation: "ar-khay", definition: "beginning, origin, ruler", extendedDefinition: "From G756; (properly abstract) a commencement, or (concretely) chief (in various applications of order, time, place, or rank).", kjvUsage: "beginning, corner, (at the, the) first (estate), magistrate, power, principality, principle, rule", derivation: "From G756" },
  { id: "G932", language: "gr", lemma: "\u03B2\u03B1\u03C3\u03B9\u03BB\u03B5\u03B9\u03B1", transliteration: "basileia", pronunciation: "bas-il-i-ah", definition: "kingdom, reign, royal power", extendedDefinition: "From G935; properly, royalty, i.e. (abstractly) rule, or (concretely) a realm (literally or figuratively).", kjvUsage: "kingdom, reign", derivation: "From G935" },
  { id: "G1342", language: "gr", lemma: "\u03B4\u03B9\u03BA\u03B1\u03B9\u03BF\u03C2", transliteration: "dikaios", pronunciation: "dik-ah-yos", definition: "righteous, just, upright", extendedDefinition: "From G1349; equitable (in character or act); by implication, innocent, holy.", kjvUsage: "just, meet, right(-eous)", derivation: "From G1349" },
  { id: "G1343", language: "gr", lemma: "\u03B4\u03B9\u03BA\u03B1\u03B9\u03BF\u03C3\u03C5\u03BD\u03B7", transliteration: "dikaiosune", pronunciation: "dik-ah-yos-oo-nay", definition: "righteousness, justice", extendedDefinition: "From G1342; equity (of character or act); specially (Christian) justification.", kjvUsage: "righteousness", derivation: "From G1342" },
  { id: "G1680", language: "gr", lemma: "\u03B5\u03BB\u03C0\u03B9\u03C2", transliteration: "elpis", pronunciation: "el-pece", definition: "hope, expectation", extendedDefinition: "From a primary elpo (to anticipate, usually with pleasure); expectation or confidence.", kjvUsage: "faith, hope", derivation: "From elpo" },
  { id: "G1849", language: "gr", lemma: "\u03B5\u03BE\u03BF\u03C5\u03C3\u03B9\u03B1", transliteration: "exousia", pronunciation: "ex-oo-see-ah", definition: "authority, power, right", extendedDefinition: "From G1832 (in the sense of ability); privilege, i.e. (subjectively) force, capacity, competency, freedom, or (objectively) mastery, delegated influence.", kjvUsage: "authority, jurisdiction, liberty, power, right, strength", derivation: "From G1832" },
  { id: "G2424", language: "gr", lemma: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", transliteration: "Iesous", pronunciation: "ee-ay-sooce", definition: "Jesus, Joshua", extendedDefinition: "Of Hebrew origin (H3091); Jesus (i.e. Jehoshua), the name of our Lord and two (three) other Israelites.", kjvUsage: "Jesus", derivation: "Of Hebrew origin (H3091)" },
  { id: "G2962", language: "gr", lemma: "\u03BA\u03C5\u03C1\u03B9\u03BF\u03C2", transliteration: "kurios", pronunciation: "koo-ree-os", definition: "lord, master, sir", extendedDefinition: "From kuros (supremacy); supreme in authority, i.e. (as noun) controller; by implication, Master (as a respectful title).", kjvUsage: "God, Lord, master, Sir", derivation: "From kuros" },
  { id: "G3551", language: "gr", lemma: "\u03BD\u03BF\u03BC\u03BF\u03C2", transliteration: "nomos", pronunciation: "nom-os", definition: "law, custom, principle", extendedDefinition: "From a primary nemo (to parcel out, especially food or grazing to animals); law (through the idea of prescriptive usage).", kjvUsage: "law", derivation: "From nemo" },
  { id: "G3772", language: "gr", lemma: "\u03BF\u03C5\u03C1\u03B1\u03BD\u03BF\u03C2", transliteration: "ouranos", pronunciation: "oo-ran-os", definition: "heaven, sky", extendedDefinition: "Perhaps from the same as G3735 (through the idea of elevation); the sky; by extension, heaven (as the abode of God).", kjvUsage: "air, heaven(-ly), sky", derivation: "Perhaps from G3735" },
  { id: "G4102", language: "gr", lemma: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", transliteration: "pistis", pronunciation: "pis-tis", definition: "faith, belief, trust, fidelity", extendedDefinition: "From G3982; persuasion, i.e. credence; moral conviction (of religious truth, or the truthfulness of God or a religious teacher), especially reliance upon Christ for salvation.", kjvUsage: "assurance, belief, believe, faith, fidelity", derivation: "From G3982" },
  { id: "G4561", language: "gr", lemma: "\u03C3\u03B1\u03C1\u03BE", transliteration: "sarx", pronunciation: "sarx", definition: "flesh, body, human nature", extendedDefinition: "Probably from the base of G4563; flesh (as stripped of the skin).", kjvUsage: "carnal(-ly, -ly minded), flesh(-ly)", derivation: "Probably from G4563" },
  { id: "G4592", language: "gr", lemma: "\u03C3\u03B7\u03BC\u03B5\u03B9\u03BF\u03BD", transliteration: "semeion", pronunciation: "say-mi-on", definition: "sign, miracle, token", extendedDefinition: "Neuter of a presumed derivative of the base of G4591; an indication, especially ceremonially or supernaturally.", kjvUsage: "miracle, sign, token, wonder", derivation: "From G4591" },
  { id: "G4982", language: "gr", lemma: "\u03C3\u03C9\u03B6\u03C9", transliteration: "sozo", pronunciation: "sode-zo", definition: "to save, deliver, protect, heal", extendedDefinition: "From a primary sos (contraction for obsolete saos, safe); to save, i.e. deliver or protect.", kjvUsage: "heal, preserve, save (self), do well, be (make) whole", derivation: "From sos" },
  { id: "G5547", language: "gr", lemma: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", transliteration: "Christos", pronunciation: "khris-tos", definition: "Christ, Anointed One, Messiah", extendedDefinition: "From G5548; anointed, i.e. the Messiah, an epithet of Jesus.", kjvUsage: "Christ", derivation: "From G5548" },
  { id: "G1411", language: "gr", lemma: "\u03B4\u03C5\u03BD\u03B1\u03BC\u03B9\u03C2", transliteration: "dunamis", pronunciation: "doo-nam-is", definition: "power, ability, mighty work, miracle", extendedDefinition: "From G1410; force (literally or figuratively); specially, miraculous power (usually by implication, a miracle itself).", kjvUsage: "ability, abundance, meaning, might(-ily, -y, -y deed), (worker of) miracle(-s), power, strength, violence, mighty (wonderful) work", derivation: "From G1410" },
  { id: "G2288", language: "gr", lemma: "\u03B8\u03B1\u03BD\u03B1\u03C4\u03BF\u03C2", transliteration: "thanatos", pronunciation: "than-at-os", definition: "death", extendedDefinition: "From G2348; (properly, an adjective used as a noun) death (literally or figuratively).", kjvUsage: "deadly, (be...) death", derivation: "From G2348" },
  { id: "G2588", language: "gr", lemma: "\u03BA\u03B1\u03C1\u03B4\u03B9\u03B1", transliteration: "kardia", pronunciation: "kar-dee-ah", definition: "heart, mind, inner self", extendedDefinition: "Prolonged from a primary kar (Latin cor, heart); the heart, i.e. (figuratively) the thoughts or feelings (mind); also (by analogy) the middle.", kjvUsage: "(broken-)heart(-ed)", derivation: "From kar" },
  { id: "G1515", language: "gr", lemma: "\u03B5\u03B9\u03C1\u03B7\u03BD\u03B7", transliteration: "eirene", pronunciation: "i-ray-nay", definition: "peace, harmony, rest", extendedDefinition: "Probably from a primary verb eiro (to join); peace (literally or figuratively); by implication, prosperity.", kjvUsage: "one, peace, quietness, rest, set at one again", derivation: "From eiro" },
  { id: "G2631", language: "gr", lemma: "\u03BA\u03B1\u03C4\u03B1\u03BA\u03C1\u03B9\u03BC\u03B1", transliteration: "katakrima", pronunciation: "kat-ak-ree-mah", definition: "condemnation, sentence", extendedDefinition: "From G2632; an adverse sentence (the verdict).", kjvUsage: "condemnation", derivation: "From G2632" },
  { id: "G40", language: "gr", lemma: "\u03B1\u03B3\u03B9\u03BF\u03C2", transliteration: "hagios", pronunciation: "hag-ee-os", definition: "holy, sacred, set apart", extendedDefinition: "From hagos (an awful thing); sacred (physically, pure, morally blameless or religious, ceremonially, consecrated).", kjvUsage: "(most) holy (one, thing), saint", derivation: "From hagos" },
  { id: "G3340", language: "gr", lemma: "\u03BC\u03B5\u03C4\u03B1\u03BD\u03BF\u03B5\u03C9", transliteration: "metanoeo", pronunciation: "met-an-o-eh-o", definition: "to repent, change one's mind", extendedDefinition: "From G3326 and G3539; to think differently, i.e. reconsider (morally, feel compunction).", kjvUsage: "repent", derivation: "From G3326 and G3539" },
  { id: "G129", language: "gr", lemma: "\u03B1\u03B9\u03BC\u03B1", transliteration: "haima", pronunciation: "hah-ee-mah", definition: "blood", extendedDefinition: "Of uncertain derivation; blood, literally (of men or animals), figuratively (the juice of grapes) or specially (the atoning blood of Christ); by implication, bloodshed, also kindred.", kjvUsage: "blood", derivation: "Of uncertain derivation" },
  { id: "G1656", language: "gr", lemma: "\u03B5\u03BB\u03B5\u03BF\u03C2", transliteration: "eleos", pronunciation: "el-eh-os", definition: "mercy, compassion, pity", extendedDefinition: "Of uncertain affinity; compassion (human or divine, especially active).", kjvUsage: "mercy, pity, compassion", derivation: "Of uncertain affinity" },
  { id: "G286", language: "gr", lemma: "\u03B1\u03BC\u03BD\u03BF\u03C2", transliteration: "amnos", pronunciation: "am-nos", definition: "a lamb", extendedDefinition: "Apparently a primary word; a lamb.", kjvUsage: "lamb", derivation: "Apparently a primary word" },
  { id: "G3956", language: "gr", lemma: "\u03C0\u03B1\u03C2", transliteration: "pas", pronunciation: "pas", definition: "all, every, whole", extendedDefinition: "Including all the forms of declension; apparently a primary word; all, any, every, the whole.", kjvUsage: "all (manner of, means), alway(-s), any (one), every (one, way), as many as, thoroughly, whatsoever, whole, whosoever", derivation: "Apparently a primary word" },
  { id: "G3962", language: "gr", lemma: "\u03C0\u03B1\u03C4\u03B7\u03C1", transliteration: "pater", pronunciation: "pat-ayr", definition: "father", extendedDefinition: "Apparently a primary word; a father (literally or figuratively, near or more remote).", kjvUsage: "father, parent", derivation: "Apparently a primary word" },
];

const NEW_VERSE_MAPPINGS = [
  { bookId: 1, chapter: 1, verse: 2, mappings: [
    { strongId: "H776", wordPosition: 1, originalWord: "\u05D0\u05E8\u05E5", translatedWord: "earth" },
    { strongId: "H7307", wordPosition: 2, originalWord: "\u05E8\u05D5\u05BC\u05D7\u05B7", translatedWord: "Spirit" },
    { strongId: "H430", wordPosition: 3, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
  ]},
  { bookId: 1, chapter: 1, verse: 3, mappings: [
    { strongId: "H559", wordPosition: 1, originalWord: "\u05D0\u05B8\u05DE\u05B7\u05E8", translatedWord: "said" },
    { strongId: "H430", wordPosition: 2, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H216", wordPosition: 3, originalWord: "\u05D0\u05D5\u05E8", translatedWord: "light" },
  ]},
  { bookId: 1, chapter: 1, verse: 26, mappings: [
    { strongId: "H559", wordPosition: 1, originalWord: "\u05D0\u05B8\u05DE\u05B7\u05E8", translatedWord: "said" },
    { strongId: "H430", wordPosition: 2, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H6213", wordPosition: 3, originalWord: "\u05E2\u05B8\u05E9\u05B8\u05C2\u05D4", translatedWord: "make" },
    { strongId: "H120", wordPosition: 4, originalWord: "\u05D0\u05B8\u05D3\u05B8\u05DD", translatedWord: "man" },
  ]},
  { bookId: 1, chapter: 1, verse: 27, mappings: [
    { strongId: "H1254", wordPosition: 1, originalWord: "\u05D1\u05E8\u05D0", translatedWord: "created" },
    { strongId: "H430", wordPosition: 2, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H120", wordPosition: 3, originalWord: "\u05D0\u05B8\u05D3\u05B8\u05DD", translatedWord: "man" },
  ]},
  { bookId: 1, chapter: 1, verse: 31, mappings: [
    { strongId: "H430", wordPosition: 1, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H6213", wordPosition: 2, originalWord: "\u05E2\u05B8\u05E9\u05B8\u05C2\u05D4", translatedWord: "made" },
  ]},
  { bookId: 2, chapter: 20, verse: 1, mappings: [
    { strongId: "H430", wordPosition: 1, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H1696", wordPosition: 2, originalWord: "\u05D3\u05B8\u05D1\u05B7\u05E8", translatedWord: "spake" },
    { strongId: "H1697", wordPosition: 3, originalWord: "\u05D3\u05B8\u05D1\u05B8\u05E8", translatedWord: "words" },
    { strongId: "H559", wordPosition: 4, originalWord: "\u05D0\u05B8\u05DE\u05B7\u05E8", translatedWord: "saying" },
  ]},
  { bookId: 2, chapter: 20, verse: 6, mappings: [
    { strongId: "H2617", wordPosition: 1, originalWord: "\u05D7\u05B6\u05E1\u05B6\u05D3", translatedWord: "mercy" },
    { strongId: "H157", wordPosition: 2, originalWord: "\u05D0\u05B8\u05D4\u05B7\u05D1", translatedWord: "love" },
    { strongId: "H8104", wordPosition: 3, originalWord: "\u05E9\u05C1\u05B8\u05DE\u05B7\u05E8", translatedWord: "keep" },
  ]},
  { bookId: 5, chapter: 6, verse: 4, mappings: [
    { strongId: "H8085", wordPosition: 1, originalWord: "\u05E9\u05C1\u05B8\u05DE\u05B7\u05E2", translatedWord: "Hear" },
    { strongId: "H3068", wordPosition: 2, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H430", wordPosition: 3, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
  ]},
  { bookId: 5, chapter: 6, verse: 5, mappings: [
    { strongId: "H157", wordPosition: 1, originalWord: "\u05D0\u05B8\u05D4\u05B7\u05D1", translatedWord: "love" },
    { strongId: "H3068", wordPosition: 2, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H430", wordPosition: 3, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H3820", wordPosition: 4, originalWord: "\u05DC\u05B5\u05D1", translatedWord: "heart" },
    { strongId: "H5315", wordPosition: 5, originalWord: "\u05E0\u05B6\u05E4\u05B6\u05E9\u05C1", translatedWord: "soul" },
  ]},
  { bookId: 19, chapter: 23, verse: 2, mappings: [
    { strongId: "H7462", wordPosition: 1, originalWord: "\u05E8\u05E2\u05D4", translatedWord: "pastures" },
    { strongId: "H7965", wordPosition: 2, originalWord: "\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD", translatedWord: "still" },
    { strongId: "H5315", wordPosition: 3, originalWord: "\u05E0\u05B6\u05E4\u05B6\u05E9\u05C1", translatedWord: "soul" },
  ]},
  { bookId: 19, chapter: 23, verse: 3, mappings: [
    { strongId: "H5315", wordPosition: 1, originalWord: "\u05E0\u05B6\u05E4\u05B6\u05E9\u05C1", translatedWord: "soul" },
    { strongId: "H6666", wordPosition: 2, originalWord: "\u05E6\u05B0\u05D3\u05B8\u05E7\u05B8\u05D4", translatedWord: "righteousness" },
  ]},
  { bookId: 19, chapter: 23, verse: 4, mappings: [
    { strongId: "H3068", wordPosition: 1, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H7965", wordPosition: 2, originalWord: "\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD", translatedWord: "comfort" },
  ]},
  { bookId: 19, chapter: 23, verse: 6, mappings: [
    { strongId: "H2617", wordPosition: 1, originalWord: "\u05D7\u05B6\u05E1\u05B6\u05D3", translatedWord: "mercy" },
    { strongId: "H3068", wordPosition: 2, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H5769", wordPosition: 3, originalWord: "\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD", translatedWord: "ever" },
  ]},
  { bookId: 19, chapter: 119, verse: 105, mappings: [
    { strongId: "H1697", wordPosition: 1, originalWord: "\u05D3\u05B8\u05D1\u05B8\u05E8", translatedWord: "word" },
    { strongId: "H216", wordPosition: 2, originalWord: "\u05D0\u05D5\u05E8", translatedWord: "light" },
  ]},
  { bookId: 19, chapter: 51, verse: 10, mappings: [
    { strongId: "H1254", wordPosition: 1, originalWord: "\u05D1\u05E8\u05D0", translatedWord: "Create" },
    { strongId: "H3820", wordPosition: 2, originalWord: "\u05DC\u05B5\u05D1", translatedWord: "heart" },
    { strongId: "H430", wordPosition: 3, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H7307", wordPosition: 4, originalWord: "\u05E8\u05D5\u05BC\u05D7\u05B7", translatedWord: "spirit" },
  ]},
  { bookId: 23, chapter: 53, verse: 5, mappings: [
    { strongId: "H7965", wordPosition: 1, originalWord: "\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD", translatedWord: "peace" },
    { strongId: "H2421", wordPosition: 2, originalWord: "\u05D7\u05B8\u05D9\u05B8\u05D4", translatedWord: "healed" },
  ]},
  { bookId: 23, chapter: 53, verse: 6, mappings: [
    { strongId: "H3068", wordPosition: 1, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
  ]},
  { bookId: 23, chapter: 40, verse: 31, mappings: [
    { strongId: "H3068", wordPosition: 1, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H2421", wordPosition: 2, originalWord: "\u05D7\u05B8\u05D9\u05B8\u05D4", translatedWord: "renew" },
  ]},
  { bookId: 24, chapter: 29, verse: 11, mappings: [
    { strongId: "H3045", wordPosition: 1, originalWord: "\u05D9\u05B8\u05D3\u05B7\u05E2", translatedWord: "know" },
    { strongId: "H7965", wordPosition: 2, originalWord: "\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD", translatedWord: "peace" },
    { strongId: "H3068", wordPosition: 3, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
  ]},
  { bookId: 27, chapter: 8, verse: 10, mappings: [
    { strongId: "H1431", wordPosition: 1, originalWord: "\u05D2\u05B8\u05D3\u05B7\u05DC", translatedWord: "great" },
    { strongId: "H6635", wordPosition: 2, originalWord: "\u05E6\u05B8\u05D1\u05B8\u05D0", translatedWord: "host" },
    { strongId: "H3556", wordPosition: 3, originalWord: "\u05DB\u05BC\u05D5\u05B9\u05DB\u05B8\u05D1", translatedWord: "stars" },
    { strongId: "H5307", wordPosition: 4, originalWord: "\u05E0\u05B8\u05E4\u05B7\u05DC", translatedWord: "cast down" },
    { strongId: "H7161", wordPosition: 5, originalWord: "\u05E7\u05B6\u05E8\u05B6\u05DF", translatedWord: "horn" },
  ]},
  { bookId: 27, chapter: 8, verse: 11, mappings: [
    { strongId: "H1431", wordPosition: 1, originalWord: "\u05D2\u05B8\u05D3\u05B7\u05DC", translatedWord: "magnified" },
    { strongId: "H4720", wordPosition: 2, originalWord: "\u05DE\u05B4\u05E7\u05B0\u05D3\u05B8\u05E9\u05C1", translatedWord: "sanctuary" },
    { strongId: "H6635", wordPosition: 3, originalWord: "\u05E6\u05B8\u05D1\u05B8\u05D0", translatedWord: "host" },
  ]},
  { bookId: 27, chapter: 8, verse: 13, mappings: [
    { strongId: "H2377", wordPosition: 1, originalWord: "\u05D7\u05B8\u05D6\u05D5\u05B9\u05DF", translatedWord: "vision" },
    { strongId: "H4720", wordPosition: 2, originalWord: "\u05DE\u05B4\u05E7\u05B0\u05D3\u05B8\u05E9\u05C1", translatedWord: "sanctuary" },
    { strongId: "H6635", wordPosition: 3, originalWord: "\u05E6\u05B8\u05D1\u05B8\u05D0", translatedWord: "host" },
  ]},
  { bookId: 27, chapter: 8, verse: 14, mappings: [
    { strongId: "H4720", wordPosition: 1, originalWord: "\u05DE\u05B4\u05E7\u05B0\u05D3\u05B8\u05E9\u05C1", translatedWord: "sanctuary" },
    { strongId: "H6662", wordPosition: 2, originalWord: "\u05E6\u05B7\u05D3\u05B4\u05BC\u05D9\u05E7", translatedWord: "cleansed" },
  ]},
  { bookId: 27, chapter: 7, verse: 13, mappings: [
    { strongId: "H2377", wordPosition: 1, originalWord: "\u05D7\u05B8\u05D6\u05D5\u05B9\u05DF", translatedWord: "visions" },
    { strongId: "H120", wordPosition: 2, originalWord: "\u05D0\u05B8\u05D3\u05B8\u05DD", translatedWord: "man" },
  ]},
  { bookId: 27, chapter: 7, verse: 14, mappings: [
    { strongId: "H4428", wordPosition: 1, originalWord: "\u05DE\u05B6\u05DC\u05B6\u05DA", translatedWord: "dominion" },
    { strongId: "H5769", wordPosition: 2, originalWord: "\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD", translatedWord: "everlasting" },
  ]},
  { bookId: 27, chapter: 9, verse: 25, mappings: [
    { strongId: "H3045", wordPosition: 1, originalWord: "\u05D9\u05B8\u05D3\u05B7\u05E2", translatedWord: "Know" },
  ]},
  { bookId: 27, chapter: 2, verse: 44, mappings: [
    { strongId: "H430", wordPosition: 1, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H4428", wordPosition: 2, originalWord: "\u05DE\u05B6\u05DC\u05B6\u05DA", translatedWord: "kingdom" },
    { strongId: "H5769", wordPosition: 3, originalWord: "\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD", translatedWord: "never" },
  ]},
  { bookId: 40, chapter: 28, verse: 18, mappings: [
    { strongId: "G1849", wordPosition: 1, originalWord: "\u03B5\u03BE\u03BF\u03C5\u03C3\u03B9\u03B1", translatedWord: "power" },
    { strongId: "G3772", wordPosition: 2, originalWord: "\u03BF\u03C5\u03C1\u03B1\u03BD\u03BF\u03C2", translatedWord: "heaven" },
  ]},
  { bookId: 40, chapter: 28, verse: 19, mappings: [
    { strongId: "G3956", wordPosition: 1, originalWord: "\u03C0\u03B1\u03C2", translatedWord: "all" },
    { strongId: "G3551", wordPosition: 2, originalWord: "\u03BD\u03BF\u03BC\u03BF\u03C2", translatedWord: "nations" },
  ]},
  { bookId: 40, chapter: 6, verse: 33, mappings: [
    { strongId: "G932", wordPosition: 1, originalWord: "\u03B2\u03B1\u03C3\u03B9\u03BB\u03B5\u03B9\u03B1", translatedWord: "kingdom" },
    { strongId: "G2316", wordPosition: 2, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G1343", wordPosition: 3, originalWord: "\u03B4\u03B9\u03BA\u03B1\u03B9\u03BF\u03C3\u03C5\u03BD\u03B7", translatedWord: "righteousness" },
  ]},
  { bookId: 43, chapter: 1, verse: 14, mappings: [
    { strongId: "G3056", wordPosition: 1, originalWord: "\u03BB\u03CC\u03B3\u03BF\u03C2", translatedWord: "Word" },
    { strongId: "G4561", wordPosition: 2, originalWord: "\u03C3\u03B1\u03C1\u03BE", translatedWord: "flesh" },
    { strongId: "G5485", wordPosition: 3, originalWord: "\u03C7\u03AC\u03C1\u03B9\u03C2", translatedWord: "grace" },
    { strongId: "G225", wordPosition: 4, originalWord: "\u03B1\u03BB\u03B7\u03B8\u03B5\u03B9\u03B1", translatedWord: "truth" },
  ]},
  { bookId: 43, chapter: 3, verse: 3, mappings: [
    { strongId: "G2424", wordPosition: 1, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G932", wordPosition: 2, originalWord: "\u03B2\u03B1\u03C3\u03B9\u03BB\u03B5\u03B9\u03B1", translatedWord: "kingdom" },
    { strongId: "G2316", wordPosition: 3, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
  ]},
  { bookId: 43, chapter: 3, verse: 5, mappings: [
    { strongId: "G4151", wordPosition: 1, originalWord: "\u03C0\u03BD\u03B5\u1FE6\u03BC\u03B1", translatedWord: "Spirit" },
    { strongId: "G932", wordPosition: 2, originalWord: "\u03B2\u03B1\u03C3\u03B9\u03BB\u03B5\u03B9\u03B1", translatedWord: "kingdom" },
    { strongId: "G2316", wordPosition: 3, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
  ]},
  { bookId: 43, chapter: 14, verse: 6, mappings: [
    { strongId: "G2424", wordPosition: 1, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G225", wordPosition: 2, originalWord: "\u03B1\u03BB\u03B7\u03B8\u03B5\u03B9\u03B1", translatedWord: "truth" },
    { strongId: "G2222", wordPosition: 3, originalWord: "\u03B6\u03C9\u03AE", translatedWord: "life" },
    { strongId: "G3962", wordPosition: 4, originalWord: "\u03C0\u03B1\u03C4\u03B7\u03C1", translatedWord: "Father" },
  ]},
  { bookId: 43, chapter: 1, verse: 29, mappings: [
    { strongId: "G286", wordPosition: 1, originalWord: "\u03B1\u03BC\u03BD\u03BF\u03C2", translatedWord: "Lamb" },
    { strongId: "G2316", wordPosition: 2, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G266", wordPosition: 3, originalWord: "\u03B1\u03BC\u03B1\u03C1\u03C4\u03B9\u03B1", translatedWord: "sin" },
    { strongId: "G2889", wordPosition: 4, originalWord: "\u03BA\u03CC\u03C3\u03BC\u03BF\u03C2", translatedWord: "world" },
  ]},
  { bookId: 44, chapter: 2, verse: 38, mappings: [
    { strongId: "G3340", wordPosition: 1, originalWord: "\u03BC\u03B5\u03C4\u03B1\u03BD\u03BF\u03B5\u03C9", translatedWord: "Repent" },
    { strongId: "G2424", wordPosition: 2, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G5547", wordPosition: 3, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
    { strongId: "G40", wordPosition: 4, originalWord: "\u03B1\u03B3\u03B9\u03BF\u03C2", translatedWord: "Holy" },
    { strongId: "G4151", wordPosition: 5, originalWord: "\u03C0\u03BD\u03B5\u1FE6\u03BC\u03B1", translatedWord: "Ghost" },
  ]},
  { bookId: 45, chapter: 1, verse: 16, mappings: [
    { strongId: "G1411", wordPosition: 1, originalWord: "\u03B4\u03C5\u03BD\u03B1\u03BC\u03B9\u03C2", translatedWord: "power" },
    { strongId: "G2316", wordPosition: 2, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G4982", wordPosition: 3, originalWord: "\u03C3\u03C9\u03B6\u03C9", translatedWord: "salvation" },
    { strongId: "G4100", wordPosition: 4, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B5\u03CD\u03C9", translatedWord: "believeth" },
  ]},
  { bookId: 45, chapter: 3, verse: 23, mappings: [
    { strongId: "G266", wordPosition: 1, originalWord: "\u03B1\u03BC\u03B1\u03C1\u03C4\u03B9\u03B1", translatedWord: "sinned" },
  ]},
  { bookId: 45, chapter: 3, verse: 24, mappings: [
    { strongId: "G1343", wordPosition: 1, originalWord: "\u03B4\u03B9\u03BA\u03B1\u03B9\u03BF\u03C3\u03C5\u03BD\u03B7", translatedWord: "justified" },
    { strongId: "G5485", wordPosition: 2, originalWord: "\u03C7\u03AC\u03C1\u03B9\u03C2", translatedWord: "grace" },
    { strongId: "G5547", wordPosition: 3, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
    { strongId: "G2424", wordPosition: 4, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
  ]},
  { bookId: 45, chapter: 5, verse: 1, mappings: [
    { strongId: "G1343", wordPosition: 1, originalWord: "\u03B4\u03B9\u03BA\u03B1\u03B9\u03BF\u03C3\u03C5\u03BD\u03B7", translatedWord: "justified" },
    { strongId: "G4102", wordPosition: 2, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", translatedWord: "faith" },
    { strongId: "G1515", wordPosition: 3, originalWord: "\u03B5\u03B9\u03C1\u03B7\u03BD\u03B7", translatedWord: "peace" },
    { strongId: "G2316", wordPosition: 4, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G2962", wordPosition: 5, originalWord: "\u03BA\u03C5\u03C1\u03B9\u03BF\u03C2", translatedWord: "Lord" },
    { strongId: "G2424", wordPosition: 6, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G5547", wordPosition: 7, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
  ]},
  { bookId: 45, chapter: 5, verse: 8, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G26", wordPosition: 2, originalWord: "\u03B1\u03B3\u03AC\u03C0\u03B7", translatedWord: "love" },
    { strongId: "G266", wordPosition: 3, originalWord: "\u03B1\u03BC\u03B1\u03C1\u03C4\u03B9\u03B1", translatedWord: "sinners" },
    { strongId: "G5547", wordPosition: 4, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
  ]},
  { bookId: 45, chapter: 6, verse: 23, mappings: [
    { strongId: "G266", wordPosition: 1, originalWord: "\u03B1\u03BC\u03B1\u03C1\u03C4\u03B9\u03B1", translatedWord: "sin" },
    { strongId: "G2288", wordPosition: 2, originalWord: "\u03B8\u03B1\u03BD\u03B1\u03C4\u03BF\u03C2", translatedWord: "death" },
    { strongId: "G5485", wordPosition: 3, originalWord: "\u03C7\u03AC\u03C1\u03B9\u03C2", translatedWord: "gift" },
    { strongId: "G2316", wordPosition: 4, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G166", wordPosition: 5, originalWord: "\u03B1\u03B9\u03CE\u03BD\u03B9\u03BF\u03C2", translatedWord: "eternal" },
    { strongId: "G2222", wordPosition: 6, originalWord: "\u03B6\u03C9\u03AE", translatedWord: "life" },
    { strongId: "G5547", wordPosition: 7, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
    { strongId: "G2424", wordPosition: 8, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G2962", wordPosition: 9, originalWord: "\u03BA\u03C5\u03C1\u03B9\u03BF\u03C2", translatedWord: "Lord" },
  ]},
  { bookId: 45, chapter: 8, verse: 1, mappings: [
    { strongId: "G2631", wordPosition: 1, originalWord: "\u03BA\u03B1\u03C4\u03B1\u03BA\u03C1\u03B9\u03BC\u03B1", translatedWord: "condemnation" },
    { strongId: "G5547", wordPosition: 2, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
    { strongId: "G2424", wordPosition: 3, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G4561", wordPosition: 4, originalWord: "\u03C3\u03B1\u03C1\u03BE", translatedWord: "flesh" },
    { strongId: "G4151", wordPosition: 5, originalWord: "\u03C0\u03BD\u03B5\u1FE6\u03BC\u03B1", translatedWord: "Spirit" },
  ]},
  { bookId: 45, chapter: 8, verse: 28, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G26", wordPosition: 2, originalWord: "\u03B1\u03B3\u03AC\u03C0\u03B7", translatedWord: "love" },
  ]},
  { bookId: 45, chapter: 10, verse: 9, mappings: [
    { strongId: "G2962", wordPosition: 1, originalWord: "\u03BA\u03C5\u03C1\u03B9\u03BF\u03C2", translatedWord: "Lord" },
    { strongId: "G2424", wordPosition: 2, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G2316", wordPosition: 3, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G4982", wordPosition: 4, originalWord: "\u03C3\u03C9\u03B6\u03C9", translatedWord: "saved" },
    { strongId: "G2588", wordPosition: 5, originalWord: "\u03BA\u03B1\u03C1\u03B4\u03B9\u03B1", translatedWord: "heart" },
    { strongId: "G4102", wordPosition: 6, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", translatedWord: "believest" },
  ]},
  { bookId: 46, chapter: 13, verse: 13, mappings: [
    { strongId: "G4102", wordPosition: 1, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", translatedWord: "faith" },
    { strongId: "G1680", wordPosition: 2, originalWord: "\u03B5\u03BB\u03C0\u03B9\u03C2", translatedWord: "hope" },
    { strongId: "G26", wordPosition: 3, originalWord: "\u03B1\u03B3\u03AC\u03C0\u03B7", translatedWord: "charity" },
  ]},
  { bookId: 48, chapter: 5, verse: 22, mappings: [
    { strongId: "G4151", wordPosition: 1, originalWord: "\u03C0\u03BD\u03B5\u1FE6\u03BC\u03B1", translatedWord: "Spirit" },
    { strongId: "G26", wordPosition: 2, originalWord: "\u03B1\u03B3\u03AC\u03C0\u03B7", translatedWord: "love" },
    { strongId: "G1515", wordPosition: 3, originalWord: "\u03B5\u03B9\u03C1\u03B7\u03BD\u03B7", translatedWord: "peace" },
    { strongId: "G4102", wordPosition: 4, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", translatedWord: "faith" },
  ]},
  { bookId: 49, chapter: 2, verse: 8, mappings: [
    { strongId: "G5485", wordPosition: 1, originalWord: "\u03C7\u03AC\u03C1\u03B9\u03C2", translatedWord: "grace" },
    { strongId: "G4982", wordPosition: 2, originalWord: "\u03C3\u03C9\u03B6\u03C9", translatedWord: "saved" },
    { strongId: "G4102", wordPosition: 3, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", translatedWord: "faith" },
    { strongId: "G2316", wordPosition: 4, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
  ]},
  { bookId: 49, chapter: 6, verse: 11, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G1411", wordPosition: 2, originalWord: "\u03B4\u03C5\u03BD\u03B1\u03BC\u03B9\u03C2", translatedWord: "power" },
  ]},
  { bookId: 50, chapter: 4, verse: 13, mappings: [
    { strongId: "G5547", wordPosition: 1, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
    { strongId: "G1411", wordPosition: 2, originalWord: "\u03B4\u03C5\u03BD\u03B1\u03BC\u03B9\u03C2", translatedWord: "strengtheneth" },
  ]},
  { bookId: 55, chapter: 3, verse: 16, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G4151", wordPosition: 2, originalWord: "\u03C0\u03BD\u03B5\u1FE6\u03BC\u03B1", translatedWord: "inspiration" },
  ]},
  { bookId: 58, chapter: 11, verse: 1, mappings: [
    { strongId: "G4102", wordPosition: 1, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", translatedWord: "faith" },
    { strongId: "G1680", wordPosition: 2, originalWord: "\u03B5\u03BB\u03C0\u03B9\u03C2", translatedWord: "hoped" },
  ]},
  { bookId: 58, chapter: 4, verse: 12, mappings: [
    { strongId: "G3056", wordPosition: 1, originalWord: "\u03BB\u03CC\u03B3\u03BF\u03C2", translatedWord: "word" },
    { strongId: "G2316", wordPosition: 2, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G4151", wordPosition: 3, originalWord: "\u03C0\u03BD\u03B5\u1FE6\u03BC\u03B1", translatedWord: "spirit" },
    { strongId: "G2588", wordPosition: 4, originalWord: "\u03BA\u03B1\u03C1\u03B4\u03B9\u03B1", translatedWord: "heart" },
  ]},
  { bookId: 59, chapter: 1, verse: 5, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G4102", wordPosition: 2, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B9\u03C2", translatedWord: "faith" },
  ]},
  { bookId: 60, chapter: 1, verse: 3, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G1656", wordPosition: 2, originalWord: "\u03B5\u03BB\u03B5\u03BF\u03C2", translatedWord: "mercy" },
    { strongId: "G1680", wordPosition: 3, originalWord: "\u03B5\u03BB\u03C0\u03B9\u03C2", translatedWord: "hope" },
    { strongId: "G386", wordPosition: 4, originalWord: "\u03B1\u03BD\u03B1\u03C3\u03C4\u03B1\u03C3\u03B9\u03C2", translatedWord: "resurrection" },
    { strongId: "G2424", wordPosition: 5, originalWord: "\u0399\u03B7\u03C3\u03BF\u03C5\u03C2", translatedWord: "Jesus" },
    { strongId: "G5547", wordPosition: 6, originalWord: "\u03C7\u03C1\u03B9\u03C3\u03C4\u03BF\u03C2", translatedWord: "Christ" },
  ]},
  { bookId: 62, chapter: 4, verse: 8, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G26", wordPosition: 2, originalWord: "\u03B1\u03B3\u03AC\u03C0\u03B7", translatedWord: "love" },
  ]},
  { bookId: 66, chapter: 1, verse: 8, mappings: [
    { strongId: "G746", wordPosition: 1, originalWord: "\u03B1\u03C1\u03C7\u03B7", translatedWord: "beginning" },
    { strongId: "G2962", wordPosition: 2, originalWord: "\u03BA\u03C5\u03C1\u03B9\u03BF\u03C2", translatedWord: "Lord" },
    { strongId: "G2316", wordPosition: 3, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G1411", wordPosition: 4, originalWord: "\u03B4\u03C5\u03BD\u03B1\u03BC\u03B9\u03C2", translatedWord: "Almighty" },
  ]},
  { bookId: 66, chapter: 21, verse: 4, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G2288", wordPosition: 2, originalWord: "\u03B8\u03B1\u03BD\u03B1\u03C4\u03BF\u03C2", translatedWord: "death" },
    { strongId: "G1515", wordPosition: 3, originalWord: "\u03B5\u03B9\u03C1\u03B7\u03BD\u03B7", translatedWord: "sorrow" },
  ]},
  { bookId: 66, chapter: 22, verse: 13, mappings: [
    { strongId: "G746", wordPosition: 1, originalWord: "\u03B1\u03C1\u03C7\u03B7", translatedWord: "beginning" },
    { strongId: "G166", wordPosition: 2, originalWord: "\u03B1\u03B9\u03CE\u03BD\u03B9\u03BF\u03C2", translatedWord: "end" },
  ]},
  { bookId: 33, chapter: 6, verse: 8, mappings: [
    { strongId: "H3068", wordPosition: 1, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H4941", wordPosition: 2, originalWord: "\u05DE\u05B4\u05E9\u05C1\u05B0\u05E4\u05B8\u05BC\u05D8", translatedWord: "justly" },
    { strongId: "H2617", wordPosition: 3, originalWord: "\u05D7\u05B6\u05E1\u05B6\u05D3", translatedWord: "mercy" },
    { strongId: "H430", wordPosition: 4, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
  ]},
  { bookId: 35, chapter: 2, verse: 4, mappings: [
    { strongId: "H2377", wordPosition: 1, originalWord: "\u05D7\u05B8\u05D6\u05D5\u05B9\u05DF", translatedWord: "vision" },
    { strongId: "H6662", wordPosition: 2, originalWord: "\u05E6\u05B7\u05D3\u05B4\u05BC\u05D9\u05E7", translatedWord: "just" },
    { strongId: "H2421", wordPosition: 3, originalWord: "\u05D7\u05B8\u05D9\u05B8\u05D4", translatedWord: "live" },
  ]},
  { bookId: 20, chapter: 3, verse: 5, mappings: [
    { strongId: "H3068", wordPosition: 1, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H3820", wordPosition: 2, originalWord: "\u05DC\u05B5\u05D1", translatedWord: "heart" },
  ]},
  { bookId: 20, chapter: 3, verse: 6, mappings: [
    { strongId: "H3045", wordPosition: 1, originalWord: "\u05D9\u05B8\u05D3\u05B7\u05E2", translatedWord: "acknowledge" },
  ]},
  { bookId: 23, chapter: 9, verse: 6, mappings: [
    { strongId: "H4428", wordPosition: 1, originalWord: "\u05DE\u05B6\u05DC\u05B6\u05DA", translatedWord: "Prince" },
    { strongId: "H7965", wordPosition: 2, originalWord: "\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD", translatedWord: "Peace" },
    { strongId: "H1", wordPosition: 3, originalWord: "\u05D0\u05B8\u05D1", translatedWord: "Father" },
    { strongId: "H5769", wordPosition: 4, originalWord: "\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD", translatedWord: "everlasting" },
    { strongId: "H430", wordPosition: 5, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
  ]},
];

async function seedExpanded() {
  console.log("Seeding expanded Strong's Concordance entries...");
  let entryCount = 0;
  for (const entry of NEW_STRONG_ENTRIES) {
    await db.insert(strongEntries).values(entry).onConflictDoNothing();
    entryCount++;
  }
  console.log(`  ${entryCount} new Strong's entries processed`);

  console.log("Seeding expanded verse-Strong's mappings...");
  let mapCount = 0;
  let skipped = 0;
  for (const vm of NEW_VERSE_MAPPINGS) {
    const verseRecord = await db
      .select()
      .from(bibleVerses)
      .where(
        and(
          eq(bibleVerses.bookId, vm.bookId),
          eq(bibleVerses.chapter, vm.chapter),
          eq(bibleVerses.verse, vm.verse),
          eq(bibleVerses.translationId, "KJV")
        )
      )
      .limit(1);

    if (!verseRecord.length) {
      console.warn(`  Verse not found: book=${vm.bookId} ch=${vm.chapter} v=${vm.verse}`);
      skipped++;
      continue;
    }

    for (const m of vm.mappings) {
      await db.insert(verseStrongMaps).values({
        verseId: verseRecord[0].id,
        strongId: m.strongId,
        wordPosition: m.wordPosition,
        originalWord: m.originalWord,
        translatedWord: m.translatedWord,
      }).onConflictDoNothing();
      mapCount++;
    }
  }
  console.log(`  ${mapCount} word mappings inserted (${skipped} verses skipped)`);

  console.log("\nExpanded Strong's seed complete!");
  await pool.end();
}

seedExpanded().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
