"""Episode 3 voice-over as recorded (phonetic spelling) and as captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

SCENES = [
    ("hook", [
        ("Bir firmadan teklif geldi.", "Bir firmadan teklif geldi."),
        ("Ama gönderen adres, kişisel bir cimeyl hesabı.", "Ama gönderen adres, kişisel bir Gmail hesabı."),
        ("Bu teklife ne kadar güvenirsiniz?", "Bu teklife ne kadar güvenirsiniz?"),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        ("Üçüncü bölüm: kapınızdaki posta kutusu.", "Üçüncü bölüm: kapınızdaki posta kutusu."),
    ]),
    ("bridge", [
        ("Sitenizin adresi, binası, yolu ve kilidi hazır.", "Sitenizin adresi, binası, yolu ve kilidi hazır."),
        ("Sıra, kapınızdaki posta kutusunda.", "Sıra, kapınızdaki posta kutusunda."),
    ]),
    ("what", [
        ("Kurumsal e-posta, alan adınızla biten e-posta adresidir.", "Kurumsal e-posta, alan adınızla biten e-posta adresidir."),
        ("Örneğin: bilgi et vebsiteniz nokta kom.", "Örneğin: bilgi@websiteniz.com"),
        ("Müşteri bu adresi görünce, karşısında gerçek bir işletme olduğunu anlar.",
         "Müşteri bu adresi görünce, karşısında gerçek bir işletme olduğunu anlar."),
    ]),
    ("trust", [
        ("Kişisel bir adresi herkes birkaç dakikada açabilir.", "Kişisel bir adresi herkes birkaç dakikada açabilir."),
        ("Dolandırıcılar da.", "Dolandırıcılar da."),
        ("Ama alan adınızla biten bir adresi, sadece siz açabilirsiniz.", "Ama alan adınızla biten bir adresi, sadece siz açabilirsiniz."),
        ("Kurumsal adres, işletmenizin imzasıdır.", "Kurumsal adres, işletmenizin imzasıdır."),
    ]),
    ("seal", [
        ("Peki biri sizin adınıza sahte e-posta gönderirse?", "Peki biri sizin adınıza sahte e-posta gönderirse?"),
        ("Bunun için alan adınızın rehberine, yani dienese üç kayıt eklenir: es pi ef, di kim ve di mark.",
         "Bunun için alan adınızın rehberine, yani DNS'e üç kayıt eklenir: SPF, DKIM ve DMARC."),
        ("Bunlar, mektubun gerçekten sizden geldiğini kanıtlayan mühürlerdir.", "Bunlar, mektubun gerçekten sizden geldiğini kanıtlayan mühürlerdir."),
    ]),
    ("spam", [
        ("Bu kayıtlar yoksa, gönderdiğiniz teklifler müşterinin spam kutusuna düşebilir.",
         "Bu kayıtlar yoksa, gönderdiğiniz teklifler müşterinin spam kutusuna düşebilir."),
    ]),
    ("setup", [
        ("İyi haber şu: Kurumsal e-posta çoğu hosting paketinde zaten vardır.", "İyi haber şu: Kurumsal e-posta çoğu hosting paketinde zaten vardır."),
        ("Satış, muhasebe ve destek için ayrı adresler açabilirsiniz.", "Satış, muhasebe ve destek için ayrı adresler açabilirsiniz."),
    ]),
    ("expire", [
        ("Unutmayın: Alan adınızın süresi dolarsa, e-postalarınız da durur.", "Unutmayın: Alan adınızın süresi dolarsa, e-postalarınız da durur."),
    ]),
    ("recap", [
        ("Kısacası: Kurumsal e-posta sizin posta kutunuz.", "Kısacası: Kurumsal e-posta sizin posta kutunuz."),
        ("Es pi ef, di kim ve di mark ise mektuplarınızın mührü.", "SPF, DKIM ve DMARC ise mektuplarınızın mührü."),
    ]),
    ("outro", [
        ("Bu kartı kaydedin!", "Bu kartı kaydedin!"),
        ("Sıradaki bölümde: kapınızdaki kuyruk, yani site hızı.", "Sıradaki bölümde: kapınızdaki kuyruk, yani site hızı."),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]
