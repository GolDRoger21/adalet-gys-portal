/**
 * @file Adalet GYS Portalı için ortak şablon yükleyici.
 * @description Header, footer gibi ortak HTML bileşenlerini ilgili sayfalara dinamik olarak yükler.
 * @version 2.1 (Path Fix for _templates)
 */

// Sayfa tamamen yüklendiğinde çalışacak ana olay dinleyici.
document.addEventListener('DOMContentLoaded', () => {
    // Sadece body etiketinde 'data-needs-template' özniteliği olan sayfalarda çalış.
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate();
    }
});

/**
 * Şablon dosyasını sunucudan çeker ve içeriğini sayfaya akıllı bir şekilde enjekte eder.
 * Sayfanın 'data-needs-template' değerine göre ('page' veya 'exam') hangi bileşenlerin
 * yükleneceğine karar verir.
 */
async function loadCommonTemplate() {
    try {
        // DÜZELTME: Yol, klasörün orijinal adı olan '_templates' olarak güncellendi.
        const response = await fetch('/adalet-gys-portal/_templates/sinav-sablonu.html');
        if (!response.ok) {
            throw new Error(`Şablon dosyası yüklenemedi: ${response.statusText}`);
        }
        const templateText = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        // --- Ortak Bileşenleri Al ---
        const header = tempContainer.querySelector('.navbar');
        const footer = tempContainer.querySelector('.footer');
        const body = document.body;

        // --- Ortak Bileşenleri Her Zaman Ekle ---
        if (header) body.prepend(header);
        if (footer) body.appendChild(footer);

        // --- Sayfa Türüne Göre Koşullu Yükleme ---
        // Sadece sınav sayfalarına özel pencereleri yükle.
        if (body.dataset.needsTemplate === 'exam') {
            const resultModal = tempContainer.querySelector('#result-modal');
            const alertModal = tempContainer.querySelector('#alert-modal');
            if (alertModal) body.appendChild(alertModal);
            if (resultModal) body.appendChild(resultModal);
        }

        // Her şey yüklendiğinde, diğer script'lerin haberdar olması için bu olayı tetikle.
        document.dispatchEvent(new Event('template-loaded'));

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Sayfa şablonu yüklenirken bir hata oluştu.</h1>';
    }
}
