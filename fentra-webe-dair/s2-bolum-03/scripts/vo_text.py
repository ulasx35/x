"""Season 2, episode 3 voice-over as recorded (phonetic spelling) and as captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

S = lambda x: (x, x)
SCENES = [
    ("hook", [
        S("Arama sonucunda on vitrin yan yana durur."),
        S("Müşteri her birinin iki satırına bakar ve birini seçer."),
        S("Sizin vitrininizde ne yazıyor?"),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        S("İkinci sezon, üçüncü bölüm: vitrindeki yazı."),
    ]),
    ("bridge", [
        S("Müşterinin kelimelerini bulduk."),
        S("Şimdi onları vitrine koyalım."),
    ]),
    ("what", [
        S("Arama sonucunda sitenizden iki şey görünür: mavi başlık ve altındaki kısa açıklama."),
        S("Bu ikisi, sitenizin vitrinidir."),
        S("Müşteri içeri girmeden önce, yalnızca vitrine bakar."),
    ]),
    ("bad", [
        S("Birçok sitenin başlığında sadece anasayfa yazar."),
        S("Açıklama ise ya boştur, ya da sayfadan rastgele bir cümledir."),
        S("Böyle bir vitrinin önünden, müşteri durmadan geçer."),
    ]),
    ("titl", [
        S("İyi bir başlık, ne yaptığınızı ve nerede olduğunuzu söyler."),
        ("Örneğin: Karşıyakada evden eve nakliyat, sigortalı ve asansörlü.", "Örneğin: Karşıyaka'da evden eve nakliyat, sigortalı ve asansörlü."),
        S("En önemli kelimeyi başa koyun ve yaklaşık altmış karakterde bitirin."),
        S("Daha uzunsa, sonu kesilir."),
    ]),
    ("desc", [
        S("Açıklama ise vitrindeki küçük nottur."),
        S("Müşteriye sizi neden seçmesi gerektiğini söyleyin: ücretsiz keşif, aynı gün taşıma, ya da tek telefonla randevu."),
        S("Yaklaşık yüz elli karakter yeterlidir."),
        ("Gogıl bazen bu notu kendisi yazar, ama iyi bir not yazarsanız çoğu zaman sizinkini gösterir.", "Google bazen bu notu kendisi yazar, ama iyi bir not yazarsanız çoğu zaman sizinkini gösterir."),
    ]),
    ("pages", [
        S("Her sayfanın başlığı ve açıklaması farklı olsun."),
        S("Bunları, sitenizin yönetim panelinde sayfa ayarlarından değiştirebilirsiniz."),
    ]),
    ("recap", [
        S("Kısacası: Başlık müşteriyi durdurur, açıklama içeri davet eder."),
    ]),
    ("outro", [
        S("Bu kartı kaydedin!"),
        S("Sıradaki bölümde: müşteri içeri girince ne bulacak, yani dükkanın içi."),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]
