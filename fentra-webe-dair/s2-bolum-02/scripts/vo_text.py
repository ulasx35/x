"""Season 2, episode 2 voice-over as recorded (phonetic spelling) and as captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

S = lambda x: (x, x)
SCENES = [
    ("hook", [
        S("Sitenizde, kurumsal lojistik çözümleri yazıyor."),
        ("Müşteriniz ise Gogıla, evden eve nakliyat yazıyor.", "Müşteriniz ise Google'a, evden eve nakliyat yazıyor."),
        S("Aynı işi anlatıyorsunuz, ama aynı dili konuşmuyorsunuz."),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        S("İkinci sezon, ikinci bölüm: müşterinin kelimeleri."),
    ]),
    ("bridge", [
        S("Geçen bölümde rehberi tanıdık."),
        S("Şimdi ona doğru kelimeleri verelim."),
    ]),
    ("what", [
        ("Anahtar kelime, müşterinin Gogıla yazdığı kelimelerdir.", "Anahtar kelime, müşterinin Google'a yazdığı kelimelerdir."),
        S("Rehber, bu kelimeleri defterdeki sayfalarla eşleştirir."),
        S("Sayfanızda müşterinin kelimeleri yoksa, rehber sizi o aramada kolay kolay öne çıkarmaz."),
    ]),
    ("lang", [
        S("O yüzden kendi sektör dilinizle değil, müşterinin diliyle yazın."),
        S("Siz implant dersiniz, müşteri eksik diş tedavisi yazar."),
    ]),
    ("find", [
        S("Peki müşteri ne yazıyor?"),
        ("En kolay yol, Gogılın kendisi.", "En kolay yol, Google'ın kendisi."),
        S("Arama kutusuna işinizi yazmaya başlayın ve çıkan önerilere bakın."),
        S("Sayfanın en altındaki benzer aramalar da size ipucu verir."),
        S("Bir de müşterilerinize sorun: Bizi nasıl aradınız?"),
    ]),
    ("long", [
        S("Tek kelimelik aramalarda rakip çoktur."),
        S("Yalnızca nakliyat yazan kişi, belki sadece bakınıyor."),
        ("Ama Karşıyakada evden eve nakliyat fiyatı yazan kişi, taşınmak üzere.", "Ama Karşıyaka'da evden eve nakliyat fiyatı yazan kişi, taşınmak üzere."),
        S("Uzun aramalarda kişi azdır, ama karar vermeye çok yakındır."),
    ]),
    ("page", [
        S("Her sayfaya tek bir konu verin."),
        S("Evden eve nakliyat bir sayfa, ofis taşıma başka bir sayfa olsun."),
        S("Kelimeyi sayfanın başlığında, ilk cümlesinde ve metninde doğal bir şekilde kullanın."),
        S("Aynı kelimeyi yirmi kere tekrar etmek işe yaramaz, rehber bunu fark eder."),
    ]),
    ("recap", [
        S("Kısacası: Anahtar kelime, müşterinin dilidir."),
        S("Müşteri nasıl arıyorsa, sayfanız da öyle konuşsun."),
    ]),
    ("outro", [
        S("Bu kartı kaydedin!"),
        S("Sıradaki bölümde: arama sonucunda görünen o iki satır, yani vitrindeki yazı."),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]
