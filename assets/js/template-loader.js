/**
 * @file Adalet GYS Portalı için ortak şablon yükleyici.
 * @description Header, footer ve modallar gibi ortak HTML bileşenlerini ilgili sayfalara dinamik olarak yükler.
 * @version 6.6 (Support for 'page' and 'exam' templates, Preserve Data Attributes)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Bu script, body etiketinde 'data-needs-template' olan sayfalarda çalışır.
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate();
    }
});

/**
 * Şablonu sunucudan çeker ve içeriğini sayfanın ihtiyacına göre ('page' veya 'exam')
 * doğru bileşenleri sayfaya ekler. İşi bitince 'template-loaded' sinyali gönderir.
 */
async function loadCommonTemplate() {
    try {
        // === GÜNCELLEME: Şablon URL'sini belirle ===
        let templatePath = '/adalet-gys-portal/_templates/';
        if (document.body.dataset.needsTemplate === 'exam') {
            templatePath += 'sinav-sablonu.html';
        } else {
            // Varsayılan olarak 'page' veya başka bir değer için genel şablon
            templatePath += 'genel-sablon.html';
        }
        // === GÜNCELLEME SON ===

        const response = await fetch(templatePath); // Değişen satır
        if (!response.ok) {
            throw new Error(`Şablon dosyası yüklenemedi. Status: ${response.status}`);
        }
        const templateText = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        const header = tempContainer.querySelector('.navbar');
        const footer = tempContainer.querySelector('.footer');
        const body = document.body;

        // Her sayfaya başlık (en üste) ve alt bilgiyi (en alta) ekle
        if (header) body.prepend(header.cloneNode(true));
        if (footer) body.appendChild(footer.cloneNode(true));

        // === GÜNCELLEME: 'exam' ve 'page' için ortak mantık ===
        // Alert modal'ı body'e ekle (ModalManager.show için gerekli)
        // (Sadece sınav şablonunda varsa anlamlı olacaktır)
        const alertModal = tempContainer.querySelector('#alert-modal');
        if (alertModal) {
            document.body.appendChild(alertModal.cloneNode(true));
        }
        
        // sinav-sablonu.html veya genel-sablon.html içindeki #app-container elementini al
        const templateAppContainer = tempContainer.querySelector('#app-container');
        // Ana sayfa dosyasındaki (örneğin hakkinda.html) orijinal #app-container elementini al
        const targetAppContainer = document.getElementById('app-container');
        
        if (templateAppContainer && targetAppContainer) {
            // 1. Yeni bir element oluştur
            const newAppContainer = document.createElement('main');
            // 2. ID'sini aktar
            newAppContainer.id = templateAppContainer.id;
            // 3. Sınıflarını aktar
            newAppContainer.className = templateAppContainer.className;
            // === DÜZELTME: data-* attribute'lerini de aktar ===
            // Ana sayfa dosyasındaki (örneğin hakkinda.html) data-* attribute'lerini yeni elemente kopyala
            for (let attr of targetAppContainer.attributes) {
                if (attr.name.startsWith('data-')) {
                    newAppContainer.setAttribute(attr.name, attr.value);
                }
            }
            // 4. İçeriğini aktar
            newAppContainer.innerHTML = templateAppContainer.innerHTML;
            // 5. Eski elementi yeni elementle değiştir
            targetAppContainer.parentNode.replaceChild(newAppContainer, targetAppContainer);
            // === DÜZELTME SON ===
        } else if (!targetAppContainer) {
            console.error('Hedef app-container elementi (örneğin hakkinda.html\'deki) bulunamadı.');
        } else if (!templateAppContainer) {
            console.error('Şablon içindeki app-container elementi (örneğin sinav-sablonu.html\'deki) bulunamadı.');
        }
        // === GÜNCELLEME SON ===

        // Her şeyin bittiğini ve diğer script'lerin başlayabileceğini bildiren sinyali gönder.
        document.dispatchEvent(new Event('template-loaded'));

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        // Hata durumunda kullanıcıya bilgi ver
        const mainContent = document.querySelector('main') || document.body;
        mainContent.innerHTML = '<div class="card p-8 text-center"><h1 class="text-xl font-bold text-red-600">Tema yüklenirken bir hata oluştu.</h1><p class="mt-2">' + error.message + '</p></div>';
    }
}
