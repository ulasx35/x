"""Season 2, episode 1 voice-over as recorded (phonetic spelling) and as captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

S = lambda x: (x, x)
SCENES = [
    ("hook", [
        ("Biri Gogıla, en iyi diş kliniği yazdı.", "Biri Google'a, en iyi diş kliniği yazdı."),
        S("Bir saniye bile geçmeden, on sonuç çıktı."),
        ("Peki Gogıl, milyonlarca site arasından bu on siteyi nasıl seçti?", "Peki Google, milyonlarca site arasından bu on siteyi nasıl seçti?"),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        S("İkinci sezon, birinci bölüm: şehrin rehberi."),
    ]),
    ("bridge", [
        S("Geçen sezon sitenizi kurduk."),
        ("Bu sezon, onu Gogılda öne çıkaracağız.", "Bu sezon, onu Google'da öne çıkaracağız."),
    ]),
    ("guide", [
        ("Gogılı, şehrin her binasını tanıyan bir rehber gibi düşünün.", "Google'ı, şehrin her binasını tanıyan bir rehber gibi düşünün."),
        S("Ona ne sorarsanız sorun, size en uygun adresleri gösterir."),
        S("Bunu da üç adımda yapar."),
    ]),
    ("crawl", [
        S("Birinci adım, gezmek."),
        ("Gogılın gezginleri internette durmadan dolaşır.", "Google'ın gezginleri internette durmadan dolaşır."),
        S("Bir sayfadan diğerine, bağlantıları izleyerek giderler."),
        S("Hiçbir bağlantının gelmediği bir sayfayı, gezgin kolay kolay bulamaz."),
    ]),
    ("index", [
        S("İkinci adım, kaydetmek."),
        ("Gezgin her sayfada ne yazdığını okur ve Gogılın dev kayıt defterine ekler.", "Gezgin her sayfada ne yazdığını okur ve Google'ın dev kayıt defterine ekler."),
        ("Siz arama yaptığınızda Gogıl bütün internete bakmaz, bu deftere bakar.", "Siz arama yaptığınızda Google bütün internete bakmaz, bu deftere bakar."),
        S("Defterde olmayan sayfa, aramada da çıkmaz."),
    ]),
    ("rank", [
        S("Üçüncü adım, sıralamak."),
        ("Gogıl, aramaya en iyi cevap veren sayfaları öne koyar: konuya uygun, güvenilir, hızlı ve telefonda rahat okunan sayfaları.",
         "Google, aramaya en iyi cevap veren sayfaları öne koyar: konuya uygun, güvenilir, hızlı ve telefonda rahat okunan sayfaları."),
        S("İlk sayfa, şehrin ana caddesidir."),
        S("İkinci sayfaya ise neredeyse kimse gitmez."),
    ]),
    ("check", [
        S("Siteniz defterde mi?"),
        ("Gogılın arama kutusuna site yazın, iki nokta koyun ve sitenizin adresini ekleyin.", "Google'ın arama kutusuna site yazın, iki nokta koyun ve sitenizin adresini ekleyin."),
        S("Çıkan sonuçlar, defterdeki sayfalarınızdır."),
    ]),
    ("recap", [
        S("Kısacası: Gezgin bulur, defter kaydeder, rehber sıralar."),
        ("Es i o, sitenizi bu üç adımda öne çıkarmaktır.", "SEO, sitenizi bu üç adımda öne çıkarmaktır."),
    ]),
    ("outro", [
        S("Bu kartı kaydedin!"),
        ("Sıradaki bölümde: müşteriniz Gogıla hangi kelimeleri yazıyor?", "Sıradaki bölümde: müşteriniz Google'a hangi kelimeleri yazıyor?"),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]
