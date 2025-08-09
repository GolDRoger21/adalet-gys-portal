/**
 * @file Adalet GYS Portalı için ortak şablon yükleyici.
 * @description Header, footer gibi ortak HTML bileşenlerini ilgili sayfalara dinamik olarak yükler.
 * @version 7.1 (Fixed typo in exam template path)
 */

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate();
    }
});

async function loadCommonTemplate() {
    const templateType = document.body.dataset.needsTemplate;
    let templatePath;

    if (templateType === 'exam') {
        // === DÜZELTME: Dosya adındaki yazım hatası giderildi ===
        templatePath = '/adalet-gys-portal/_templates/sinav-sablonu.html'; // "sablonu" olarak düzeltildi.
    } else { // 'page' veya diğer tüm türler için
        templatePath = '/adalet-gys-portal/_templates/genel-sablon.html';
    }

    try {
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Şablon dosyası yüklenemedi: ${templatePath}`);
        }
        const templateText = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        const header = tempContainer.querySelector('.navbar');
        const footer = tempContainer.querySelector('.footer');

        if (header) document.body.prepend(header.cloneNode(true));
        if (footer) document.body.appendChild(footer.cloneNode(true));

        // SADECE 'exam' türü için özel işlemleri yap
        if (templateType === 'exam') {
            const alertModal = tempContainer.querySelector('#alert-modal');
            if (alertModal) document.body.appendChild(alertModal.cloneNode(true));

            const templateAppContainer = tempContainer.querySelector('#app-container');
            const targetAppContainer = document.getElementById('app-container');
            
            if (templateAppContainer && targetAppContainer) {
                const newAppContainer = document.createElement('main');
                newAppContainer.id = templateAppContainer.id;
                newAppContainer.className = templateAppContainer.className;

                for (let attr of targetAppContainer.attributes) {
                    if (attr.name.startsWith('data-')) {
                        newAppContainer.setAttribute(attr.name, attr.value);
                    }
                }
                newAppContainer.innerHTML = templateAppContainer.innerHTML;
                targetAppContainer.parentNode.replaceChild(newAppContainer, targetAppContainer);
            }
        }
        // 'page' türü için ekstra bir işlem yapmaya gerek yok, çünkü içerik zaten sayfada mevcut.

        document.dispatchEvent(new Event('template-loaded'));

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        const mainContent = document.querySelector('main') || document.body;
        mainContent.innerHTML = `<div class="card p-8 text-center"><h1 class="text-xl font-bold text-red-600">Tema yüklenirken bir hata oluştu.</h1><p class="mt-2">${error.message}</p></div>`;
    }
}
