/**
 * @file Adalet GYS Portalı - Ana JS Dosyası (v2.1)
 * @description Mobil menü, accordion ve genel etkileşimler
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeMobileMenu();
    initializeAccordions();
    initializeBackToTop();
});

// Mobil menüyü başlatma
function initializeMobileMenu() {
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbarNav = document.querySelector('.navbar-nav');

    if (navbarToggle && navbarNav) {
        // Menü toggle etkinliği
        navbarToggle.addEventListener('click', () => {
            const isOpen = navbarNav.classList.toggle('navbar-nav--open');
            navbarToggle.classList.toggle('navbar-toggle--open');
            navbarToggle.setAttribute('aria-expanded', isOpen);
            
            // Body overflow kontrolü
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Mobil menüdeki linklere tıklanınca menüyü kapat
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    navbarNav.classList.remove('navbar-nav--open');
                    navbarToggle.classList.remove('navbar-toggle--open');
                    navbarToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            });
        });
    }
}

// Accordion (detay) bileşenlerini başlatma
function initializeAccordions() {
    // Konu anlatımı accordionları
    document.querySelectorAll('details').forEach(detail => {
        const summary = detail.querySelector('summary');
        
        if (summary) {
            // Açık/kapalı durumunu takip et
            detail.addEventListener('toggle', () => {
                if (detail.open) {
                    detail.style.maxHeight = `${detail.scrollHeight}px`;
                } else {
                    detail.style.maxHeight = null;
                }
            });

            // Klavye desteği ekle
            summary.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    detail.open = !detail.open;
                }
            });
        }
    });

    // Soru-cevap accordionları
    document.querySelectorAll('.qa-item').forEach(item => {
        const question = item.querySelector('.question');
        const answer = item.querySelector('.answer');

        if (question && answer) {
            question.addEventListener('click', () => {
                const isOpening = answer.style.maxHeight === '0px' || !answer.style.maxHeight;
                answer.style.maxHeight = isOpening ? `${answer.scrollHeight}px` : '0px';
                item.classList.toggle('active', isOpening);
            });
        }
    });
}

// "Yukarı çık" butonu
function initializeBackToTop() {
    const backToTopBtn = document.createElement('button');
    backToTopBtn.innerHTML = '↑';
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.setAttribute('aria-label', 'Yukarı çık');
    document.body.appendChild(backToTopBtn);

    // Görünürlüğü kontrol et
    window.addEventListener('scroll', () => {
        backToTopBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
    });

    // Tıklama etkinliği
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Şablon yüklendiğinde yeniden başlatma
document.addEventListener('template-loaded', () => {
    initializeMobileMenu();
    initializeAccordions();
    
    // Yeni yüklenen navbar için ARIA güncellemesi
    const navbarToggle = document.querySelector('.navbar-toggle');
    if (navbarToggle) {
        navbarToggle.setAttribute('aria-expanded', 'false');
    }
});

// Hata yönetimi
window.addEventListener('error', (e) => {
    console.error('Global hata:', e.error);
    alert('Bir hata oluştu. Lütfen sayfayı yenileyin.');
});
