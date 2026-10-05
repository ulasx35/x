"""Episode 5 voice-over as recorded (phonetic spelling) and as captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

S = lambda x: (x, x)
SCENES = [
    ("hook", [
        S("Bir sabah sitenizi açtınız."),
        S("Sayfalar yok, ürünler yok, yıllarca yazdığınız her şey gitmiş."),
        S("Yedeğiniz var mı?"),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        S("Beşinci bölüm: yedek anahtar."),
    ]),
    ("bridge", [
        S("Siteniz hazır, hızlı ve güvende."),
        S("Peki bina bir gün çökerse?"),
    ]),
    ("crash", [
        S("Siteler pek çok sebeple çökebilir."),
        S("Sunucu arızalanır, bir güncelleme yanlış gider ya da kötü niyetli biri içeri sızar."),
        S("Bazen de bir dosyayı yanlışlıkla siz silersiniz."),
    ]),
    ("backup", [
        S("Yedek, sitenizin tam bir kopyasıdır: dosyalar, görseller ve veritabanı."),
        S("Tıpkı kasada saklanan bir yedek anahtar gibi."),
        S("Bir şey olursa, kopyayı geri yükler ve sitenizi dakikalar içinde eski haline getirirsiniz."),
    ]),
    ("offsite", [
        S("Ama yedeği aynı binada saklamayın."),
        S("Bina yanarsa, kasa da yanar."),
        S("En az bir kopya, başka bir yerde, örneğin bulutta dursun."),
    ]),
    ("auto", [
        S("En iyisi, yedeğin her gün kendiliğinden alınmasıdır."),
        S("Ve arada bir, geri yükleyip çalıştığını deneyin."),
        S("Denenmemiş yedek, kilide uymayan anahtar gibidir."),
    ]),
    ("update", [
        S("İkinci kalkan: güncellemeler."),
        S("Sitenizin yazılımı ve eklentileri güncel değilse, kapınız eski bir kilitle korunur."),
        S("Saldırganlar da önce eski kilitleri dener."),
        S("Güncellemeleri ertelemeyin, ama önce yedek alın."),
    ]),
    ("host", [
        S("İyi haber şu: Çoğu hosting firması otomatik yedekleme sunar."),
        S("Paketinizde var mı, ne sıklıkla alınıyor, nerede saklanıyor?"),
        S("Bu üç soruyu bugün sorun."),
    ]),
    ("recap", [
        S("Kısacası: Yedek, sitenizin yedek anahtarı."),
        S("Güncelleme ise kapınızdaki kilidi yeni tutar."),
    ]),
    ("outro", [
        S("Bu kartı kaydedin!"),
        ("Sıradaki bölümde: haritadaki yeriniz, yani Gogıl İşletme Profili.", "Sıradaki bölümde: haritadaki yeriniz, yani Google İşletme Profili."),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]
