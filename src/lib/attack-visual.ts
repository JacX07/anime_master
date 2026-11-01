export type AttackVisual = "melee" | "slash" | "magic" | "gun";

/** Explicit visual style for every SSR/UR basic attack in the roster. */
export const ATTACK_VISUALS: Record<number, AttackVisual> = {
  1: "melee", // Spike Spiegel
  2: "gun", // Faye Valentine
  5: "slash", // Ichigo Kurosaki
  6: "slash", // Rukia Kuchiki
  11: "magic", // Edward Elric
  12: "melee", // Alphonse Elric
  13: "magic", // Sasuke Uchiha
  14: "magic", // Itachi Uchiha
  17: "magic", // Naruto Uzumaki
  27: "melee", // Killua Zoldyck
  28: "magic", // Kurapika
  30: "melee", // Gon Freecss
  31: "magic", // Hisoka Morow
  40: "melee", // Luffy Monkey
  58: "melee", // Chrollo Lucilfer
  61: "magic", // Robin Nico
  62: "slash", // Zoro Roronoa
  68: "magic", // Roy Mustang
  71: "melee", // L Lawliet
  75: "magic", // Ryuk
  80: "magic", // Light Yagami
  85: "slash", // Kakashi Hatake
  86: "magic", // Rei Ayanami
  89: "magic", // Shinji Ikari
  94: "magic", // Asuka Langley Souryuu
  207: "magic", // Tooru Honda
  209: "melee", // Kyou Souma
  210: "slash", // Kisuke Urahara
  246: "melee", // Gokuu Son
  305: "melee", // Sanji
  309: "melee", // Chopper Tony Tony
  417: "magic", // Lelouch Lamperouge
  422: "slash", // Guts
  424: "slash", // Griffith
  434: "melee", // Eikichi Onizuka
  458: "gun", // Revy
  497: "slash", // Artoria Pendragon
  498: "magic", // Rin Toosaka
  500: "magic", // Sakura Matou
  507: "magic", // Howl
  672: "slash", // Gintoki Sakata
  702: "melee", // Nana Oosaki
  718: "melee", // Kenzou Tenma
  719: "melee", // Johan Liebert
  723: "magic", // Nami
  724: "magic", // Usopp
  835: "magic", // Misa Amane
  908: "slash", // Yoruichi Shihouin
  913: "melee", // Vegeta
  1086: "slash", // Sousuke Aizen
  1111: "magic", // C.C.
  1259: "gun", // Misato Katsuragi
  1662: "magic", // Gaara
  2007: "magic", // Shikamaru Nara
  2072: "magic", // Ace Portgas
  2075: "melee", // Kamina
  2219: "magic", // Lain Iwakura
  2257: "magic", // Simon
  2423: "magic", // Jiraiya
  2514: "magic", // Gilgamesh
  3096: "magic", // Wolfgang Grimmer
  4003: "melee", // Joutarou Kuujou
  4004: "melee", // Dio Brando
  5189: "slash", // Erza Scarlet
  6356: "magic", // Joseph Joestar
  7373: "magic", // Holo
  8455: "gun", // Death the Kid
  10010: "gun", // Kiritsugu Emiya
  10138: "slash", // Thorfinn Karlsefni
  10529: "melee", // Giorno Giovanna
  11222: "magic", // Jolyne Kuujou
  11772: "magic", // Gyro Zeppeli
  12055: "magic", // Yoshikage Kira
  12064: "melee", // Taiga Aisaka
  12659: "magic", // Rohan Kishibe
  13020: "slash", // Askeladd
  13045: "melee", // Bruno Bucciarati
  13085: "melee", // Jousuke Higashikata
  13580: "gun", // Ash Lynx
  13767: "slash", // Law Trafalgar
  19492: "magic", // Johnny Joestar
  21044: "melee", // Rei Kiriyama
  22036: "magic", // Koyomi Araragi
  22037: "melee", // Hitagi Senjougahara
  22055: "magic", // Tsubasa Hanekawa
  23277: "magic", // Meruem
  23602: "magic", // Shinobu Oshino
  34470: "melee", // Kurisu Makise
  35252: "melee", // Rintarou Okabe
  36765: "slash", // Kazuto Kirigaya
  36828: "slash", // Asuna Yuuki
  38005: "magic", // Homura Akemi
  40881: "slash", // Mikasa Ackerman
  40882: "magic", // Eren Yeager
  45627: "slash", // Levi
  45887: "gun", // Sasha Blouse
  46484: "melee", // Reiner Braun
  46494: "magic", // Armin Arlert
  46496: "slash", // Erwin Smith
  55131: "melee", // Houtarou Oreki
  63351: "slash", // Akame
  64769: "melee", // Shouyou Hinata
  64771: "melee", // Tobio Kageyama
  65239: "magic", // Esdeath
  65643: "melee", // Koro-sensei
  65645: "melee", // Nagisa Shiota
  65865: "magic", // Rikka Takanashi
  66171: "melee", // Kyouko Hori
  66173: "melee", // Izumi Miyamura
  67065: "melee", // Hachiman Hikigaya
  67067: "melee", // Yukino Yukinoshita
  67327: "melee", // Yuu Nishinoya
  67329: "melee", // Kei Tsukishima
  69411: "melee", // Kaori Miyazono
  70069: "magic", // Kurumi Tokisaki
  71121: "slash", // Hange Zoe
  71267: "melee", // Kenma Kozume
  71269: "melee", // Tetsurou Kuroo
  71611: "melee", // Tooru Oikawa
  71933: "magic", // Karma Akabane
  73935: "melee", // Saitama
  75216: "melee", // Souma Yukihira
  77605: "magic", // Ban
  80243: "melee", // Shouko Nishimiya
  80491: "melee", // Shouya Ishida
  81929: "magic", // Tatsumaki
  83797: "slash", // Ryuuko Matoi
  84677: "slash", // Yato
  87275: "magic", // Ken Kaneki
  87277: "magic", // Touka Kirishima
  88348: "magic", // Rudeus Greyrat
  88349: "slash", // Eris Boreas Greyrat
  88350: "magic", // Roxy Migurdia
  88412: "slash", // Juuzou Suzuya
  88572: "magic", // Emilia
  88573: "melee", // Subaru Natsuki
  88575: "magic", // Rem
  88889: "slash", // Raphtalia
  88892: "magic", // Katsuki Bakugou
  88937: "melee", // Koutarou Bokuto
  89028: "melee", // Izuku Midoriya
  89198: "melee", // Osamu Dazai
  89201: "melee", // Ranpo Edogawa
  89220: "magic", // Shouto Todoroki
  89224: "melee", // Toshinori Yagi
  89225: "magic", // Shouta Aizawa
  89243: "melee", // Eijirou Kirishima
  89334: "melee", // Arataka Reigen
  89361: "magic", // Megumin
  89362: "magic", // Aqua
  89364: "melee", // Kazuma Satou
  89616: "magic", // Shigeo Kageyama
  89853: "magic", // Chuuya Nakahara
  90107: "magic", // Kusuo Saiki
  90169: "melee", // Violet Evergarden
  120649: "melee", // Kaguya Shinomiya
  121052: "magic", // Tanya Degurechaff
  121101: "melee", // Miyuki Shirogane
  121102: "melee", // Yuu Ishigami
  121103: "melee", // Chika Fujiwara
  121104: "melee", // Ai Hayasaka
  121700: "melee", // Norman
  121724: "melee", // Ray
  121889: "melee", // Yumeko Jabami
  121956: "melee", // Shouko Komi
  123212: "melee", // Kiyotaka Ayanokouji
  123285: "slash", // Asta
  123385: "magic", // Phosphophyllite
  123962: "magic", // Rimuru Tempest
  124142: "melee", // Senkuu Ishigami
  124381: "melee", // Zero Two
  124382: "melee", // Ichigo
  124440: "slash", // Yami Sukehiro
  125168: "melee", // Legoshi
  125659: "melee", // Gabi Braun
  125886: "melee", // Miko Iino
  126071: "slash", // Tanjirou Kamado
  126372: "melee", // Nino Nakano
  126373: "melee", // Miku Nakano
  126375: "melee", // Itsuki Nakano
  126635: "magic", // Megumi Fushiguro
  126824: "melee", // Maomao
  127212: "melee", // Yuuji Itadori
  127221: "melee", // Sakuta Azusagawa
  127222: "melee", // Mai Sakurajima
  127518: "magic", // Nezuko Kamado
  127691: "magic", // Satoru Gojou
  128106: "melee", // Chizuru Ichinose
  128651: "magic", // Hanako
  129130: "slash", // Inosuke Hashibira
  129131: "slash", // Zenitsu Agatsuma
  129133: "slash", // Kyoujurou Rengoku
  129571: "slash", // Yuuta Okkotsu
  129928: "magic", // Jin-U Seong
  130050: "slash", // Giyuu Tomioka
  130102: "slash", // Denji
  130848: "magic", // Benimaru Shinmon
  133676: "melee", // Marin Kitagawa
  133699: "magic", // Suguru Getou
  133700: "slash", // Nobara Kugisaki
  133701: "magic", // Sukuna
  133704: "slash", // Kento Nanami
  134167: "slash", // Maki Zenin
  136070: "slash", // Shinobu Kochou
  136071: "slash", // Tengen Uzui
  136072: "slash", // Mitsuri Kanroji
  136837: "slash", // Cid Kagenou
  137079: "melee", // Power
  137080: "magic", // Makima
  137081: "slash", // Aki Hayakawa
  137975: "melee", // Aoi Toudou
  138100: "melee", // Anya Forger
  138101: "gun", // Loid Forger
  138102: "melee", // Yor Forger
  141060: "gun", // Shinei Nouzen
  141061: "gun", // Vladilena Milizé
  145341: "melee", // Manjirou Sano
  145344: "melee", // Chifuyu Matsuno
  145345: "melee", // Ken Ryuuguji
  148740: "magic", // Reze
  154224: "melee", // Mami Nanami
  157115: "melee", // Toge Inumaki
  162213: "melee", // Meguru Bachira
  162722: "slash", // Touji Fushiguro
  168774: "melee", // Nazuna Nanakusa
  172759: "melee", // Ai Hoshino
  174873: "gun", // Kurena Kukumila
  176754: "magic", // Frieren
  183965: "magic", // Fern
  188783: "melee", // Kana Arima
  218648: "melee", // Hina Chouno
  222594: "melee", // Momo Ayase
  257562: "melee", // Hitori Gotou
  260329: "gun", // Chisato Nishikigi
  261674: "melee", // Nijika Ijichi
  284157: "gun", // Lucy
};

export type AttackWeapon = "katana" | "greatsword" | "iai";

/** Iaï swordsmen: Zoro (UR) and Kenpachi (SR, outside the basic-attack roster). */
const IAI = new Set([62, 909]);

/** Unknown IDs keep the existing melee fallback. */
export function attackVisual(id: number): AttackVisual {
  return ATTACK_VISUALS[id] ?? (IAI.has(id) ? "slash" : "melee");
}

export function attackWeapon(id: number): AttackWeapon {
  return id === 422 ? "greatsword" : IAI.has(id) ? "iai" : "katana";
}
