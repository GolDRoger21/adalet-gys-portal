/**
 * @file Adalet GYS Portalı - Güncellenmiş Şablon Yükleyici
 * @description Header, footer ve sınav arayüzü bileşenlerini yükler
 * @version 7.2 (Stil Entegrasyonu Düzeltildi)
 */

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate().catch(error => {
            console.error('Şablon yükleme hatası:', error);
            showErrorUI(error);
        });
    }
});

async function loadCommonTemplate() {
    const templateType = document.body.dataset.needsTemplate;
    let templatePath;

    // Path kontrolü eklendi
    if (templateType === 'exam') {
        templatePath = '/adalet-gys-portal/_templates/sinav-sablonu.html';
    } else {
        templatePath = '/adalet-gys-portal/_templates/genel-sablon.html';
    }

    try {
        const response = await fetch(templatePath);
        if (!response.ok) throw new Error(`HTTP hatası! Durum: ${response.status}`);
        
        const templateText = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        // HEADER YÜKLEME
        const headerTemplate = tempContainer.querySelector('.navbar');
        if (headerTemplate) {
            const existingHeader = document.querySelector('.navbar');
            if (existingHeader) existingHeader.remove();
            
            const newHeader = headerTemplate.cloneNode(true);
            document.body.insertBefore(newHeader, document.body.firstChild);
            
            // Navbar stillerinin hemen uygulanması
            requestAnimationFrame(() => {
                newHeader.style.opacity = '1';
            });
        }

        // FOOTER YÜKLEME
        const footerTemplate = tempContainer.querySelector('.footer');
        if (footerTemplate) {
            const existingFooter = document.querySelector('.footer');
            if (existingFooter) existingFooter.remove();
            
            document.body.appendChild(footerTemplate.cloneNode(true));
        }

        // SINAV MODU ÖZEL İŞLEMLER
        if (templateType === 'exam') {
            const alertModal = tempContainer.querySelector('#alert-modal');
            if (alertModal) {
                document.body.appendChild(alertModal.cloneNode(true));
            }

            const templateAppContainer = tempContainer.querySelector('#app-container');
            const targetAppContainer = document.getElementById('app-container');
            
            if (templateAppContainer && targetAppContainer) {
                const newAppContainer = templateAppContainer.cloneNode(true);
                
                // Data attributeları aktar
                Array.from(targetAppContainer.attributes).forEach(attr => {
                    if (attr.name.startsWith('data-')) {
                        newAppContainer.setAttribute(attr.name, attr.value);
                    }
                });
                
                targetAppContainer.replaceWith(newAppContainer);
            }
        }

        // STİL ENTEGRASYONU İÇİN YENİ KOD
        const styleLinks = tempContainer.querySelectorAll('link[rel="stylesheet"]');
        styleLinks.forEach(link => {
            if (!document.head.querySelector(`link[href="${link.href}"]`)) {
                document.head.appendChild(link.cloneNode());
            }
        });

        // EVENT TETİKLEME
        const event = new CustomEvent('template-loaded', {
            detail: { templateType }
        });
        document.dispatchEvent(event);

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        showErrorUI(error);
        throw error;
    }
}

function showErrorUI(error) {
    const mainContent = document.querySelector('main') || document.body;
    mainContent.innerHTML = `
        <div class="card p-8 text-center">
            <h1 class="text-xl font-bold text-red-600">Sistem Hatası</h1>
            <p class="mt-4 text-slate-600">${error.message}</p>
            <button onclick="window.location.reload()" class="btn mt-6">
                Tekrar Dene
            </button>
        </div>
    `;
}

// Hata yönetimi için global fonksiyon
window.handleTemplateError = showErrorUI;
